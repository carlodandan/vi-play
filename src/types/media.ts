export type MediaType = "movie" | "tv" | "anime";

export interface Episode {
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string;
  runtime?: number;
}

export interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  episodes: Episode[];
}

export interface MediaItem {
  id: number; // TMDB ID
  title: string;
  original_title?: string;
  type: MediaType;
  media_type?: "movie" | "tv"; // Underlying TMDB entity type
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count?: number;
  release_date: string;
  first_air_date?: string;
  year?: number | string;
  genres: string[];
  seasons_count?: number;
  seasons?: Season[];
  tagline?: string;
  featured?: boolean;
}

export interface StreamSource {
  source: string;
  label: string;
  url: string;
}

export interface StreamSubtitle {
  label: string;
  file: string;
  type: string;
  source: string;
}

export interface VylaStreamEvent {
  type: "meta" | "source" | "done" | "error";
  source?: StreamSource;
  subtitles?: StreamSubtitle[];
  meta?: {
    id?: number;
    title?: string;
    name?: string;
    overview?: string;
    poster_path?: string;
    backdrop_path?: string;
    runtime?: number;
  };
  total?: number;
  error?: string;
}

export interface ProviderHealth {
  source: string;
  status: "ok" | "degraded" | "error";
  latencyMs?: number;
  details?: string;
}

export interface WatchProgress {
  mediaId: number;
  type: MediaType;
  title: string;
  poster_path: string;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: number;
}
