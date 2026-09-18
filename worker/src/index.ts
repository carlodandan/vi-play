/**
 * VPlay Cloudflare Worker - Self-Contained Vyla Streaming Backend
 *
 * Runs the Vyla multi-provider streaming scrapers, subtitle aggregator,
 * and HLS/MP4 proxy directly inside the Cloudflare Worker runtime.
 */
import VylaSDK from "@vyla-entertainment/sdk";
import type { StreamResult } from "@vyla-entertainment/sdk";

export interface Env {
  TMDB_API_KEY?: string;
  VITE_TMDB_API_KEY?: string;
  VYLA_API_KEY?: string;
  VYLA_BACKEND_URL?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-API-Key, X-Session-Token, Range",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Content-Type, Accept-Ranges",
  "Access-Control-Max-Age": "86400",
};

function handleCorsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function addCorsHeaders(
  response: Response,
  extraHeaders?: Record<string, string>,
): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      newHeaders.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ─── Rate Limiter (Sliding Window per IP) ─────────────────────────────────────
interface RateBucket {
  discovery: number[];
  stream: number[];
}
const rateLimitMap = new Map<string, RateBucket>();
const DISCOVERY_LIMIT = 60; // 60 discovery requests/min per IP
const STREAM_LIMIT = 15; // 15 stream starts/min per IP
const WINDOW_MS = 60_000;
let lastPrune = Date.now();

function checkRateLimit(
  ip: string,
  type: "discovery" | "stream",
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  // Prune map every 2 minutes to prevent unbounded memory growth
  if (now - lastPrune > 120_000) {
    lastPrune = now;
    for (const [key, bucket] of rateLimitMap.entries()) {
      bucket.discovery = bucket.discovery.filter((t) => now - t < WINDOW_MS);
      bucket.stream = bucket.stream.filter((t) => now - t < WINDOW_MS);
      if (bucket.discovery.length === 0 && bucket.stream.length === 0) {
        rateLimitMap.delete(key);
      }
    }
  }

  let bucket = rateLimitMap.get(ip);
  if (!bucket) {
    bucket = { discovery: [], stream: [] };
    rateLimitMap.set(ip, bucket);
  }

  bucket[type] = bucket[type].filter((t) => now - t < WINDOW_MS);
  const limit = type === "discovery" ? DISCOVERY_LIMIT : STREAM_LIMIT;

  if (bucket[type].length >= limit) {
    const oldest = bucket[type][0];
    const retryAfter = Math.ceil((WINDOW_MS - (now - oldest)) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  bucket[type].push(now);
  return { allowed: true };
}

// ─── Stateless Session Token Signing ─────────────────────────────────────────
const SESSION_SECRET = "vplay_session_secret_edge_2026";

async function createSessionToken(ip: string): Promise<string> {
  const ts = Date.now();
  const data = new TextEncoder().encode(`${ip}:${ts}:${SESSION_SECRET}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const sig = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return `vplay_${ts}_${sig}`;
}

function resolveTmdbKey(env: Env): string {
  const raw = env.TMDB_API_KEY || env.VITE_TMDB_API_KEY || "";
  if (raw.startsWith("ey") && raw.includes(".")) {
    try {
      const parts = raw.split(".");
      const payload = JSON.parse(atob(parts[1]));
      if (payload.aud && typeof payload.aud === "string") {
        return payload.aud;
      }
    } catch {
      // Fall through to default
    }
  }
  return raw || "b7a308c99dc64382f38b48c737424b75";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleCorsOptions();
    }

    const url = new URL(request.url);
    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "127.0.0.1";
    const tmdbKey = resolveTmdbKey(env);
    const sdk = new VylaSDK({ tmdbApiKey: tmdbKey });

    // Rate limit checks for discovery and streaming
    const isStreamRoute = url.pathname === "/movie" || url.pathname === "/tv";
    const isDiscoveryRoute =
      url.pathname.startsWith("/api/trending") ||
      url.pathname.startsWith("/api/popular") ||
      url.pathname.startsWith("/api/search") ||
      url.pathname.startsWith("/api/details");

    if (isStreamRoute || isDiscoveryRoute) {
      const rl = checkRateLimit(
        clientIp,
        isStreamRoute ? "stream" : "discovery",
      );
      if (!rl.allowed) {
        return addCorsHeaders(
          Response.json(
            {
              error: "Too many requests. Please wait a moment.",
              retryAfter: rl.retryAfter,
            },
            { status: 429 },
          ),
          {
            "Retry-After": String(rl.retryAfter || 30),
            "Cache-Control": "no-store",
          },
        );
      }
    }

    // 1. Root / health status
    if (url.pathname === "/" || url.pathname === "/healthz") {
      const sources = sdk.getSources(true);
      return addCorsHeaders(
        Response.json({
          name: "VPlay Vyla Gateway",
          status: "online",
          mode: "self-contained",
          providersCount: sources.length,
          notice: "For entertainment purposes only",
          timestamp: new Date().toISOString(),
        }),
        { "Cache-Control": "public, max-age=30, s-maxage=30" },
      );
    }

    // 2. Authentication: POST /api/auth and POST /api/auth/refresh
    if (
      (url.pathname === "/api/auth" || url.pathname === "/api/auth/refresh") &&
      request.method === "POST"
    ) {
      const token = await createSessionToken(clientIp);
      return addCorsHeaders(
        Response.json({
          token,
          type: "standard",
          expiresIn: 1800,
          notice: "For entertainment purposes only",
        }),
        { "Cache-Control": "no-store" },
      );
    }

    // 3. Provider Health: GET /api/health
    if (url.pathname === "/api/health") {
      const activeSources = sdk.getSources(true);
      return addCorsHeaders(
        Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
          tmdb: Boolean(tmdbKey),
          sources: activeSources.map((s) => ({
            key: s.key,
            label: s.label,
            ok: !s.disabled,
            multiUrl: s.multiUrl,
          })),
        }),
      );
    }

    // 4. Subtitles: GET /api/subtitles/movie/:id or GET /api/subtitles/tv/:id/:season/:episode
    const movieSubMatch = url.pathname.match(
      /^\/api\/subtitles\/movie\/([^/]+)/,
    );
    const tvSubMatch = url.pathname.match(
      /^\/api\/subtitles\/tv\/([^/]+)\/([^/]+)\/([^/]+)/,
    );
    if (movieSubMatch || tvSubMatch) {
      try {
        const id = movieSubMatch ? movieSubMatch[1] : tvSubMatch![1];
        const s = tvSubMatch ? Number(tvSubMatch[2]) : null;
        const e = tvSubMatch ? Number(tvSubMatch[3]) : null;
        const subtitles = await sdk.getSubtitles(id, s, e);
        return addCorsHeaders(Response.json({ subtitles: subtitles || [] }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return addCorsHeaders(Response.json({ subtitles: [], error: msg }));
      }
    }

    // 5. Downloads: GET /api/downloads/movie/:id or GET /api/downloads/tv/:id/:season/:episode
    const movieDownMatch = url.pathname.match(
      /^\/api\/downloads\/movie\/([^/]+)/,
    );
    const tvDownMatch = url.pathname.match(
      /^\/api\/downloads\/tv\/([^/]+)\/([^/]+)\/([^/]+)/,
    );
    if (movieDownMatch || tvDownMatch) {
      try {
        const id = movieDownMatch ? movieDownMatch[1] : tvDownMatch![1];
        const s = tvDownMatch ? Number(tvDownMatch[2]) : null;
        const e = tvDownMatch ? Number(tvDownMatch[3]) : null;
        const downloads = await Promise.race([
          sdk.getDownloads(id, s, e),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        return addCorsHeaders(Response.json({ downloads: downloads || [] }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return addCorsHeaders(Response.json({ downloads: [], error: msg }));
      }
    }

    // 6. Stream Proxy: GET /api?url=...
    if (url.pathname === "/api" && url.searchParams.has("url")) {
      const target = url.searchParams.get("url")!;
      const customRef = url.searchParams.get("ref");
      const customOrigin = url.searchParams.get("origin");

      const forwardHeaders = new Headers();
      forwardHeaders.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      );
      if (customRef) forwardHeaders.set("Referer", customRef);
      if (customOrigin) forwardHeaders.set("Origin", customOrigin);
      if (request.headers.has("Range")) {
        forwardHeaders.set("Range", request.headers.get("Range")!);
      }

      try {
        const upstreamRes = await fetch(target, {
          method: request.method === "HEAD" ? "GET" : request.method,
          headers: forwardHeaders,
        });

        const contentType = upstreamRes.headers.get("Content-Type") || "";
        const isM3u8 =
          contentType.includes("mpegurl") || target.includes(".m3u8");

        // Rewrite relative URLs in HLS manifests so they continue routing through proxy
        if (isM3u8 && upstreamRes.ok && upstreamRes.body) {
          const text = await upstreamRes.text();
          if (text.startsWith("#EXTM3U")) {
            const baseTargetUrl = new URL(target);
            const lines = text.split("\n");
            const rewritten = lines
              .map((line) => {
                const trimmed = line.trim();
                if (!trimmed) return line;
                if (
                  trimmed.startsWith("#EXT-X-KEY:") &&
                  trimmed.includes('URI="')
                ) {
                  return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
                    const abs = new URL(uri, baseTargetUrl).toString();
                    const proxied = `/api?url=${encodeURIComponent(abs)}${customRef ? `&ref=${encodeURIComponent(customRef)}` : ""}${customOrigin ? `&origin=${encodeURIComponent(customOrigin)}` : ""}`;
                    return `URI="${proxied}"`;
                  });
                }
                if (trimmed.startsWith("#")) return line;
                const abs = new URL(trimmed, baseTargetUrl).toString();
                return `/api?url=${encodeURIComponent(abs)}${customRef ? `&ref=${encodeURIComponent(customRef)}` : ""}${customOrigin ? `&origin=${encodeURIComponent(customOrigin)}` : ""}`;
              })
              .join("\n");

            const headers = new Headers();
            for (const [k, v] of Object.entries(CORS_HEADERS))
              headers.set(k, v);
            headers.set(
              "Content-Type",
              contentType || "application/vnd.apple.mpegurl",
            );
            headers.set("Cache-Control", "public, max-age=3600");
            return new Response(rewritten, {
              status: upstreamRes.status,
              headers,
            });
          }
        }

        // Direct media stream / segment passthrough
        const headers = new Headers(upstreamRes.headers);
        for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
        return new Response(upstreamRes.body, {
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          headers,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return addCorsHeaders(
          Response.json({ error: `Proxy failed: ${msg}` }, { status: 502 }),
        );
      }
    }

    // 7. SSE Media Streams: GET /movie?id=... and GET /tv?id=...&season=...&episode=...
    if (url.pathname === "/movie" || url.pathname === "/tv") {
      const isTv = url.pathname === "/tv";
      const id = url.searchParams.get("id");
      const season = isTv ? Number(url.searchParams.get("season") || 1) : null;
      const episode = isTv
        ? Number(url.searchParams.get("episode") || 1)
        : null;

      if (!id) {
        return addCorsHeaders(
          Response.json({ error: "Missing id parameter" }, { status: 400 }),
        );
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      const sendEvent = async (data: object) => {
        try {
          await writer.write(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Stream cancelled by client
        }
      };

      // Run streaming pipeline asynchronously
      (async () => {
        try {
          // A. Fetch metadata and subtitles in parallel
          const [tmdbRes, subtitles] = await Promise.all([
            fetch(
              isTv
                ? `https://api.themoviedb.org/3/tv/${id}/season/${season}/episode/${episode}?api_key=${tmdbKey}`
                : `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbKey}`,
              { signal: AbortSignal.timeout(6000) },
            ).catch(() => null),
            sdk.getSubtitles(id, season, episode).catch(() => []),
          ]);

          const tmdbData: any =
            tmdbRes && tmdbRes.ok ? await tmdbRes.json() : null;

          // B. Emit 'meta' event immediately
          await sendEvent({
            type: "meta",
            meta: {
              id: tmdbData?.id || Number(id),
              title: tmdbData?.title || tmdbData?.name || `Title #${id}`,
              release_date: tmdbData?.release_date || tmdbData?.air_date || "",
              runtime: tmdbData?.runtime || 0,
              vote_average: tmdbData?.vote_average || 0,
            },
            subtitles: subtitles || [],
          });

          // C. Query top reliable providers concurrently
          const allSources = sdk.getSources(true);
          const priorityKeys = [
            "vidlink",
            "vidfast",
            "rivestream",
            "vixsrc",
            "4khdhub",
            "vidrock",
            "vidzee",
            "meowtv",
          ];
          const sortedSources = [...allSources].sort((a, b) => {
            const aIdx = priorityKeys.indexOf(a.key);
            const bIdx = priorityKeys.indexOf(b.key);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
          });

          let emittedCount = 0;
          const batchSize = 6;
          for (let i = 0; i < sortedSources.length; i += batchSize) {
            const batch = sortedSources.slice(i, i + batchSize);
            const results = await Promise.allSettled(
              batch.map(async (sourceCfg) => {
                const streamData = await Promise.race([
                  sdk.getStream(sourceCfg.key, id, season, episode),
                  new Promise<null>((resolve) =>
                    setTimeout(() => resolve(null), 10000),
                  ),
                ]);
                return { sourceCfg, streamData };
              }),
            );

            for (const r of results) {
              if (r.status !== "fulfilled" || !r.value?.streamData) continue;
              const { sourceCfg, streamData } = r.value;

              const items: StreamResult[] = [];
              if (
                "allUrls" in streamData &&
                Array.isArray(streamData.allUrls)
              ) {
                items.push(...streamData.allUrls);
              } else if (
                "url" in streamData &&
                typeof streamData.url === "string"
              ) {
                items.push(streamData as StreamResult);
              }

              for (const item of items) {
                if (!item.url) continue;

                let playableUrl = item.url;
                const hasHeaders =
                  item.headers && (item.headers.Referer || item.headers.Origin);
                if (hasHeaders || !item.skipProxy) {
                  const params = new URLSearchParams({ url: item.url });
                  if (item.headers?.Referer)
                    params.set("ref", item.headers.Referer);
                  if (item.headers?.Origin)
                    params.set("origin", item.headers.Origin);
                  playableUrl = `/api?${params.toString()}`;
                }

                await sendEvent({
                  type: "source",
                  source: {
                    source: sourceCfg.key,
                    label: item.server || sourceCfg.label,
                    url: playableUrl,
                  },
                });
                emittedCount++;
              }
            }

            if (emittedCount >= 8) break;
          }

          // D. Emit 'done' event to close stream
          await sendEvent({
            type: "done",
            total: emittedCount,
          });
        } catch {
          // Stream cancelled
        } finally {
          try {
            await writer.close();
          } catch {}
        }
      })();

      const resHeaders = new Headers();
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        resHeaders.set(key, value);
      }
      resHeaders.set("Content-Type", "text/event-stream; charset=utf-8");
      resHeaders.set("Cache-Control", "no-cache, no-transform");
      resHeaders.set("Connection", "keep-alive");

      return new Response(readable, {
        status: 200,
        headers: resHeaders,
      });
    }

    // 8. TMDB Discovery — /api/trending?type=all|movie|tv|anime&page=1
    if (url.pathname === "/api/trending") {
      const type = url.searchParams.get("type") || "all";
      const page = url.searchParams.get("page") || "1";
      let endpoint: string;
      if (type === "anime") {
        endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
      } else {
        const tmdbType =
          type === "movie" ? "movie" : type === "tv" ? "tv" : "all";
        endpoint = `https://api.themoviedb.org/3/trending/${tmdbType}/week?api_key=${tmdbKey}&page=${page}`;
      }
      try {
        const res = await fetch(endpoint, {
          signal: AbortSignal.timeout(8000),
          cf: { cacheTtl: 3600, cacheEverything: true },
        } as any);
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        const data: any = await res.json();
        const items = mapTmdbResults(data.results || [], type as any);
        return addCorsHeaders(
          Response.json({
            results: items,
            page: data.page,
            total_pages: data.total_pages,
          }),
          {
            "Cache-Control":
              "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
          },
        );
      } catch (err: unknown) {
        return addCorsHeaders(
          Response.json({ error: String(err), results: [] }, { status: 502 }),
          {
            "Cache-Control": "no-store",
          },
        );
      }
    }

    // 9. TMDB Popular — /api/popular?type=movie|tv|anime&page=1
    if (url.pathname === "/api/popular") {
      const type = url.searchParams.get("type") || "movie";
      const page = url.searchParams.get("page") || "1";
      let endpoint: string;
      if (type === "anime") {
        endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
      } else if (type === "tv") {
        endpoint = `https://api.themoviedb.org/3/tv/popular?api_key=${tmdbKey}&page=${page}`;
      } else {
        endpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbKey}&page=${page}`;
      }
      try {
        const res = await fetch(endpoint, {
          signal: AbortSignal.timeout(8000),
          cf: { cacheTtl: 3600, cacheEverything: true },
        } as any);
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        const data: any = await res.json();
        const items = mapTmdbResults(data.results || [], type as any);
        return addCorsHeaders(
          Response.json({
            results: items,
            page: data.page,
            total_pages: data.total_pages,
          }),
          {
            "Cache-Control":
              "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400",
          },
        );
      } catch (err: unknown) {
        return addCorsHeaders(
          Response.json({ error: String(err), results: [] }, { status: 502 }),
          {
            "Cache-Control": "no-store",
          },
        );
      }
    }

    // 10. TMDB Search — /api/search?query=...&page=1
    if (url.pathname === "/api/search") {
      const query = url.searchParams.get("query") || "";
      const page = url.searchParams.get("page") || "1";
      if (!query.trim()) return addCorsHeaders(Response.json({ results: [] }));
      const endpoint = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`;
      try {
        const res = await fetch(endpoint, {
          signal: AbortSignal.timeout(8000),
          cf: { cacheTtl: 600, cacheEverything: true },
        } as any);
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        const data: any = await res.json();
        const items = mapTmdbResults(
          (data.results || []).filter(
            (r: any) => r.media_type === "movie" || r.media_type === "tv",
          ),
          "all",
        );
        return addCorsHeaders(
          Response.json({
            results: items,
            page: data.page,
            total_pages: data.total_pages,
          }),
          {
            "Cache-Control":
              "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
          },
        );
      } catch (err: unknown) {
        return addCorsHeaders(
          Response.json({ error: String(err), results: [] }, { status: 502 }),
          {
            "Cache-Control": "no-store",
          },
        );
      }
    }

    // 11. TMDB Details — /api/details?type=movie|tv&id=...
    if (url.pathname === "/api/details") {
      const type = url.searchParams.get("type") || "movie";
      const id = url.searchParams.get("id") || "";
      if (!id)
        return addCorsHeaders(
          Response.json({ error: "Missing id" }, { status: 400 }),
        );
      const isTv = type === "tv" || type === "anime";
      const endpoint = isTv
        ? `https://api.themoviedb.org/3/tv/${id}?api_key=${tmdbKey}&append_to_response=seasons`
        : `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbKey}`;
      try {
        const res = await fetch(endpoint, {
          signal: AbortSignal.timeout(8000),
          cf: { cacheTtl: 86400, cacheEverything: true },
        } as any);
        if (!res.ok) throw new Error(`TMDB ${res.status}`);
        const data: any = await res.json();
        const items = mapTmdbResults(
          [{ ...data, media_type: type }],
          type as any,
        );
        return addCorsHeaders(Response.json({ result: items[0] || null }), {
          "Cache-Control":
            "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        });
      } catch (err: unknown) {
        return addCorsHeaders(
          Response.json({ error: String(err), result: null }, { status: 502 }),
          {
            "Cache-Control": "no-store",
          },
        );
      }
    }

    // Default 404
    return addCorsHeaders(
      Response.json({ error: "Endpoint not found" }, { status: 404 }),
    );
  },
};

// ─── TMDB → MediaItem mapper ─────────────────────────────────────────────────
type BrowseType = "all" | "movie" | "tv" | "anime";

function mapTmdbResults(results: any[], hint: BrowseType) {
  return results
    .filter((r: any) => r.poster_path) // skip items with no image
    .map((r: any) => {
      const mediaType: string =
        r.media_type || (r.first_air_date !== undefined ? "tv" : "movie");
      const isMovie = mediaType === "movie";
      const isAnime =
        hint === "anime" ||
        (r.genre_ids?.includes(16) &&
          (r.origin_country?.includes("JP") || r.original_language === "ja")) ||
        (r.genres?.some((g: any) => g.id === 16) &&
          r.original_language === "ja");

      const type = isAnime ? "anime" : isMovie ? "movie" : "tv";

      // Genre list — prefer full genre objects if present (from /details), else map IDs
      const genreNames: string[] = r.genres
        ? r.genres.map((g: any) => g.name)
        : mapGenreIds(r.genre_ids || [], isMovie);

      if (isAnime && !genreNames.includes("Anime")) genreNames.unshift("Anime");

      return {
        id: r.id,
        title: r.title || r.name || "Untitled",
        original_title: r.original_title || r.original_name || undefined,
        type,
        overview: r.overview || "No synopsis available.",
        poster_path: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
        backdrop_path: r.backdrop_path
          ? `https://image.tmdb.org/t/p/original${r.backdrop_path}`
          : `https://image.tmdb.org/t/p/w500${r.poster_path}`,
        vote_average: Math.round((r.vote_average || 0) * 10) / 10,
        vote_count: r.vote_count || 0,
        release_date: r.release_date || r.first_air_date || "",
        genres: genreNames,
        tagline: r.tagline || undefined,
        featured: (r.vote_average || 0) >= 7.5 && !!r.backdrop_path,
        seasons_count: r.number_of_seasons || undefined,
      };
    });
}

const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  27: "Horror",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};
const TV_GENRES: Record<number, string> = {
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10759: "Action & Adventure",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

function mapGenreIds(ids: number[], isMovie: boolean): string[] {
  const map = isMovie ? MOVIE_GENRES : TV_GENRES;
  return ids.map((id) => map[id]).filter(Boolean);
}
