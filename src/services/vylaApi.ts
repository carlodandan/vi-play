import type {
  ProviderHealth,
  StreamSubtitle,
  VylaStreamEvent,
} from "../types/media.ts";

const TOKEN_KEY = "vplay_session_token";
const TOKEN_EXPIRY_KEY = "vplay_session_expiry";

/**
 * API Base URL:
 * - Local dev: hardcoded http://127.0.0.1:8787 (Wrangler dev server for the worker)
 * - Production: empty string '', resolving to same-origin Cloudflare Pages,
 *   which binds directly to the private Cloudflare Worker via Service Binding.
 */
export const API_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:8787" : "";

/**
 * Checks if a streaming URL points to an MP4 video vs an HLS playlist
 */
export function isMp4Stream(url: string): boolean {
  try {
    const parsed = new URL(url);
    const inner = parsed.searchParams.get("url") || url;
    return /\.(mp4|mkv)(\?|$)/i.test(inner);
  } catch {
    return /\.(mp4|mkv)(\?|$)/i.test(url);
  }
}

/**
 * Obtains or refreshes a session token for client-side player calls
 */
export async function getSessionToken(
  forceRefresh = false,
): Promise<string | null> {
  const base = API_BASE_URL;

  if (!forceRefresh) {
    const existing = sessionStorage.getItem(TOKEN_KEY);
    const expiry = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY) || "0");
    // If token exists and has > 2 minutes remaining before 30m expiry
    if (existing && expiry > Date.now() + 120_000) {
      return existing;
    }
  }

  try {
    const res = await fetch(`${base}/api/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Auth returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data?.token) {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      // Valid for 25 minutes (backend expiry is 30 mins)
      sessionStorage.setItem(
        TOKEN_EXPIRY_KEY,
        String(Date.now() + 25 * 60 * 1000),
      );
      return data.token;
    }
    return null;
  } catch (err) {
    console.warn("Failed to obtain Vyla session token:", err);
    return null;
  }
}

/**
 * Initiates SSE stream for Movie or TV episode
 */
export async function streamMediaSources({
  tmdbId,
  season,
  episode,
  onEvent,
  signal,
}: {
  tmdbId: number;
  season?: number;
  episode?: number;
  onEvent: (event: VylaStreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const base = API_BASE_URL;
  const isTv = season !== undefined && episode !== undefined;

  const url = isTv
    ? `${base}/tv?id=${tmdbId}&season=${season}&episode=${episode}`
    : `${base}/movie?id=${tmdbId}`;

  const token = await getSessionToken();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };

  if (token) {
    headers["X-Session-Token"] = token;
  }

  const response = await fetch(url, { headers, signal });
  if (!response.ok) {
    throw new Error(
      `Server returned HTTP ${response.status}: ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("Readable stream not supported or empty body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          onEvent({ type: "done" });
          continue;
        }

        try {
          const parsed = JSON.parse(payload) as VylaStreamEvent;
          onEvent(parsed);
        } catch {
          // Ignore partial or unparseable SSE chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Tests connection to Vyla API or Cloudflare Worker gateway
 */
export async function checkApiHealth(): Promise<{
  reachable: boolean;
  statusText: string;
  providers?: ProviderHealth[];
  latencyMs: number;
}> {
  const base = API_BASE_URL;
  const startTime = performance.now();

  try {
    const token = await getSessionToken().catch(() => null);
    const headers: Record<string, string> = {};
    if (token) {
      headers["X-Session-Token"] = token;
    }

    const res = await fetch(`${base}/api/health`, {
      method: "GET",
      headers,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return {
        reachable: true,
        statusText: `Online (HTTP ${res.status})`,
        providers: Array.isArray(data?.sources) ? data.sources : undefined,
        latencyMs,
      };
    }

    // Try root gateway status
    const rootRes = await fetch(`${base}/`, { method: "GET" }).catch(
      () => null,
    );
    if (rootRes?.ok) {
      return {
        reachable: true,
        statusText: "Gateway connected",
        latencyMs,
      };
    }

    return {
      reachable: false,
      statusText: `API returned HTTP ${res.status}: ${res.statusText}`,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      reachable: false,
      statusText: `Unreachable: ${msg}`,
      latencyMs,
    };
  }
}

/**
 * Fetch dedicated subtitle tracks
 */
export async function fetchExtraSubtitles(
  type: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number,
): Promise<StreamSubtitle[]> {
  const base = API_BASE_URL;
  const token = await getSessionToken().catch(() => null);

  const endpoint =
    type === "movie"
      ? `${base}/api/subtitles/movie/${tmdbId}`
      : `${base}/api/subtitles/tv/${tmdbId}/${season}/${episode}`;

  try {
    const res = await fetch(endpoint, {
      headers: token ? { "X-Session-Token": token } : {},
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.subtitles) ? data.subtitles : [];
  } catch {
    return [];
  }
}

// ─── TMDB Discovery via Worker (with in-memory cache & deduplication) ────────

export type BrowseEndpoint = "trending" | "popular" | "search";

interface CacheEntry {
  data: any[];
  expiresAt: number;
}

const browseCache = new Map<string, CacheEntry>();
const inFlightBrowse = new Map<string, Promise<any[]>>();

const TTL_CONFIG: Record<BrowseEndpoint, number> = {
  popular: 15 * 60 * 1000, // 15 minutes
  trending: 10 * 60 * 1000, // 10 minutes
  search: 3 * 60 * 1000, // 3 minutes
};

/**
 * Browse TMDB content through the worker with automatic caching and request deduplication.
 * Eliminates redundant network calls when switching tabs or re-running recent queries.
 */
export async function browseTmdb(
  endpoint: BrowseEndpoint,
  params: Record<string, string> = {},
): Promise<any[]> {
  const base = API_BASE_URL;
  const qs = new URLSearchParams(params).toString();
  const cacheKey = `${endpoint}?${qs}`;
  const url = `${base}/api/${endpoint}${qs ? `?${qs}` : ""}`;

  // 1. Return cached data if fresh
  const cached = browseCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 2. Deduplicate simultaneous in-flight requests for the exact same query
  if (inFlightBrowse.has(cacheKey)) {
    return inFlightBrowse.get(cacheKey)!;
  }

  // 3. Initiate fetch and register in-flight promise
  const fetchPromise = (async () => {
    try {
      const token = await getSessionToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers["X-Session-Token"] = token;

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return cached?.data || [];
      const data = await res.json();
      const results = Array.isArray(data?.results) ? data.results : [];

      // Store in memory cache
      const ttl = TTL_CONFIG[endpoint] || 5 * 60 * 1000;
      browseCache.set(cacheKey, {
        data: results,
        expiresAt: Date.now() + ttl,
      });

      return results;
    } catch (err) {
      console.warn(`[browseTmdb] fetch failed for ${url}:`, err);
      return cached?.data || [];
    } finally {
      inFlightBrowse.delete(cacheKey);
    }
  })();

  inFlightBrowse.set(cacheKey, fetchPromise);
  return fetchPromise;
}
