import { CURATED_MEDIA } from '../data/curatedMedia.ts';
import type { MediaItem, MediaType, WatchProgress } from '../types/media.ts';

const WATCHLIST_KEY = 'vplay_watchlist';
const HISTORY_KEY = 'vplay_history';

/**
 * Returns all media items, optionally filtered by type, query, or genre
 */
export async function getMediaList({
  category = 'all',
  query = '',
  genre = '',
}: {
  category?: 'all' | MediaType | 'watchlist';
  query?: string;
  genre?: string;
} = {}): Promise<MediaItem[]> {
  const envTmdbKey = (import.meta as any).env?.VITE_TMDB_API_KEY;

  // If TMDB API Key is configured via environment and user entered a query, search live TMDB!
  if (query.trim() && envTmdbKey) {
    try {
      const liveResults = await searchTmdbLive(query.trim(), envTmdbKey);
      if (liveResults.length > 0) {
        return liveResults;
      }
    } catch (e) {
      console.warn('Live TMDB search error, falling back to curated list:', e);
    }
  }

  // Handle Watchlist
  if (category === 'watchlist') {
    const savedIds = getWatchlistIds();
    return CURATED_MEDIA.filter((item) => savedIds.includes(item.id));
  }

  let list = [...CURATED_MEDIA];

  // Filter by category / media type
  if (category !== 'all') {
    list = list.filter((item) => item.type === category);
  }

  // Filter by genre
  if (genre && genre !== 'All') {
    list = list.filter((item) =>
      item.genres.some((g) => g.toLowerCase().includes(genre.toLowerCase()))
    );
  }

  // Filter by search query
  if (query.trim()) {
    const q = query.toLowerCase();
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.original_title && item.original_title.toLowerCase().includes(q)) ||
        item.overview.toLowerCase().includes(q) ||
        item.genres.some((g) => g.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Searches live TMDB API if user configured their TMDB API Key
 */
async function searchTmdbLive(query: string, apiKey: string): Promise<MediaItem[]> {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
    query
  )}&include_adult=false`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data?.results)) return [];

  return data.results
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((r: any): MediaItem => {
      const isMovie = r.media_type === 'movie';
      const isAnime =
        r.genre_ids?.includes(16) ||
        (r.origin_country && r.origin_country.includes('JP')) ||
        r.original_language === 'ja';

      const type: MediaType = isAnime ? 'anime' : isMovie ? 'movie' : 'tv';

      return {
        id: r.id,
        title: r.title || r.name || 'Untitled',
        original_title: r.original_title || r.original_name,
        type,
        overview: r.overview || 'No synopsis available.',
        poster_path: r.poster_path
          ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
          : `https://image.tmdb.org/t/p/w600_and_h900_face${r.poster_path}`,
        backdrop_path: r.backdrop_path
          ? `https://image.tmdb.org/t/p/original${r.backdrop_path}`
          : `https://media.themoviedb.org/t/p/w533_and_h300_face${r.backdrop_path}`,
        vote_average: Number(r.vote_average?.toFixed(1)) || 7.0,
        vote_count: r.vote_count || 0,
        release_date: r.release_date || r.first_air_date || '2024',
        genres: isAnime ? ['Anime', 'Animation'] : isMovie ? ['Movie'] : ['Series'],
      };
    });
}

/**
 * Find media by TMDB ID
 */
export function getMediaById(id: number): MediaItem | undefined {
  return CURATED_MEDIA.find((m) => m.id === id);
}

// Watchlist Helpers
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

export function toggleWatchlist(id: number): boolean {
  const ids = getWatchlistIds();
  const index = ids.indexOf(id);
  let isAdded = false;

  if (index > -1) {
    ids.splice(index, 1);
    isAdded = false;
  } else {
    ids.push(id);
    isAdded = true;
  }

  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
  return isAdded;
}

// History & Progress Helpers
export function getWatchHistory(): WatchProgress[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchProgress(progress: WatchProgress): void {
  const history = getWatchHistory().filter((p) => p.mediaId !== progress.mediaId);
  history.unshift(progress);
  // Keep last 30 items
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30)));
}
