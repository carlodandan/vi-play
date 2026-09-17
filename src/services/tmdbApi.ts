import { CURATED_MEDIA } from "../data/curatedMedia.ts";
import type { MediaItem, MediaType, WatchProgress } from "../types/media.ts";
import { browseTmdb, API_BASE_URL } from "./vylaApi.ts";

const WATCHLIST_KEY = "vplay_watchlist";
const WATCHLIST_ITEMS_KEY = "vplay_watchlist_items";
const HISTORY_KEY = "vplay_history";

function getStoredWatchlistItems(): Record<number, MediaItem> {
  try {
    const raw = localStorage.getItem(WATCHLIST_ITEMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredWatchlistItems(items: Record<number, MediaItem>): void {
  try {
    localStorage.setItem(WATCHLIST_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota errors
  }
}

async function fetchMediaDetail(
  id: number,
  type: "movie" | "tv",
): Promise<MediaItem | null> {
  try {
    const base = API_BASE_URL;
    const res = await fetch(`${base}/api/details?type=${type}&id=${id}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result || null;
  } catch {
    return null;
  }
}

/**
 * Returns all media items, fetching live from TMDB via the worker.
 * Falls back to CURATED_MEDIA if the worker is unreachable.
 */
export async function getMediaList({
  category = "all",
  query = "",
  genre = "",
}: {
  category?: "all" | MediaType | "watchlist";
  query?: string;
  genre?: string;
} = {}): Promise<MediaItem[]> {
  // ── Watchlist: local curated + persisted / resolved live items ────────────
  if (category === "watchlist") {
    const savedIds = getWatchlistIds();
    const curatedItems = CURATED_MEDIA.filter((item) =>
      savedIds.includes(item.id),
    );
    const curatedIds = new Set(curatedItems.map((i) => i.id));
    const missingIds = savedIds.filter((id) => !curatedIds.has(id));

    if (missingIds.length === 0) {
      return curatedItems;
    }

    const storedItems = getStoredWatchlistItems();
    const liveItems: MediaItem[] = [];
    const stillMissing: number[] = [];

    for (const id of missingIds) {
      if (storedItems[id]) {
        liveItems.push(storedItems[id]);
      } else {
        stillMissing.push(id);
      }
    }

    // Resolve any remaining un-cached live items via worker details endpoint
    if (stillMissing.length > 0) {
      const resolved = await Promise.allSettled(
        stillMissing.map(async (id) => {
          const movie = await fetchMediaDetail(id, "movie");
          if (movie) return movie;
          return await fetchMediaDetail(id, "tv");
        }),
      );

      let updated = false;
      for (const r of resolved) {
        if (r.status === "fulfilled" && r.value) {
          liveItems.push(r.value);
          storedItems[r.value.id] = r.value;
          updated = true;
        }
      }
      if (updated) {
        saveStoredWatchlistItems(storedItems);
      }
    }

    return [...curatedItems, ...liveItems];
  }

  // ── Search: ask worker /api/search, fall back to curated filter ──────────
  if (query.trim()) {
    const live = await browseTmdb("search", { query: query.trim() });
    if (live.length > 0) {
      // Inject any curated matches that TMDB might have missed
      const liveIds = new Set(live.map((i: any) => i.id));
      const q = query.toLowerCase();
      const curatedMatches = CURATED_MEDIA.filter(
        (m) =>
          !liveIds.has(m.id) &&
          (m.title.toLowerCase().includes(q) ||
            m.original_title?.toLowerCase().includes(q) ||
            m.overview.toLowerCase().includes(q)),
      );
      return [...live, ...curatedMatches] as MediaItem[];
    }
    // pure curated fallback
    const q = query.toLowerCase();
    return CURATED_MEDIA.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.original_title?.toLowerCase().includes(q) ||
        m.overview.toLowerCase().includes(q) ||
        m.genres.some((g) => g.toLowerCase().includes(q)),
    );
  }

  // ── Browsing by category: /api/popular?type=... ──────────────────────────
  const typeParam = category === "all" ? "movie" : category; // 'all' returns movies by default; shelves query individually
  const live = await browseTmdb("popular", { type: typeParam });

  if (live.length > 0) {
    // Merge curated items for this category at the front so watchlist / modal details still work
    const liveIds = new Set(live.map((i: any) => i.id));
    const curatedForType =
      category === "all"
        ? []
        : CURATED_MEDIA.filter(
            (m) => m.type === category && !liveIds.has(m.id),
          );

    let merged = [...curatedForType, ...live] as MediaItem[];

    // Genre filter
    if (genre && genre !== "All") {
      const g = genre.toLowerCase();
      merged = merged.filter((m) =>
        m.genres.some((mg) => mg.toLowerCase().includes(g)),
      );
    }

    return merged;
  }

  // ── Pure curated fallback ─────────────────────────────────────────────────
  let list = [...CURATED_MEDIA];
  if (category !== "all") list = list.filter((m) => m.type === category);
  if (genre && genre !== "All") {
    list = list.filter((m) =>
      m.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase())),
    );
  }
  return list;
}

/**
 * Fetch a full shelf of live items from the worker.
 * Returns CURATED_MEDIA filtered by type as fallback.
 */
export async function fetchShelf(
  type: "trending" | "popular",
  mediaType: "movie" | "tv" | "anime" | "all",
  limit = 20,
): Promise<MediaItem[]> {
  const live = await browseTmdb(type, { type: mediaType });
  if (live.length > 0) return live.slice(0, limit) as MediaItem[];

  // Curated fallback
  if (mediaType === "all") return CURATED_MEDIA.slice(0, limit);
  return CURATED_MEDIA.filter((m) => m.type === mediaType).slice(0, limit);
}

/**
 * Find media by TMDB ID — check curated first, then live fetch from worker
 */
export function getMediaById(id: number): MediaItem | undefined {
  return CURATED_MEDIA.find((m) => m.id === id);
}

// ── Watchlist helpers ─────────────────────────────────────────────────────────
export function getWatchlistIds(): number[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isItemInWatchlist(id: number): boolean {
  return getWatchlistIds().includes(id);
}

export function toggleWatchlist(id: number, item?: MediaItem): boolean {
  const ids = getWatchlistIds();
  const index = ids.indexOf(id);
  let isAdded = false;
  const storedItems = getStoredWatchlistItems();

  if (index > -1) {
    ids.splice(index, 1);
    delete storedItems[id];
    isAdded = false;
  } else {
    ids.push(id);
    if (item) {
      storedItems[id] = item;
    }
    isAdded = true;
  }
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
  saveStoredWatchlistItems(storedItems);
  return isAdded;
}

// ── Watch history helpers ─────────────────────────────────────────────────────
export function getWatchHistory(): WatchProgress[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchProgress(progress: WatchProgress): void {
  const history = getWatchHistory().filter(
    (p) => p.mediaId !== progress.mediaId,
  );
  history.unshift(progress);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
}
