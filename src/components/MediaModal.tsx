import { useState } from 'react';
import { X, Play, Bookmark, Star, Calendar, Tv, Sparkles, Check } from 'lucide-react';
import type { MediaItem, Season } from '../types/media.ts';

interface MediaModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (item: MediaItem, season?: number, episode?: number) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (id: number) => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  item,
  onClose,
  onPlay,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);

  if (!item) return null;

  const isSeries = item.type === 'tv' || item.type === 'anime';
  const seasons: Season[] = item.seasons || [];
  const currentSeason = seasons.find((s) => s.season_number === selectedSeasonNumber) || seasons[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-zinc-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700/60 backdrop-blur-md transition-all cursor-pointer"
          title="Close details"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Header Backdrop */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-zinc-900">
            <img
              src={item.backdrop_path}
              alt={item.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-transparent" />

            {/* Title Overlay in Banner */}
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded bg-purple-600 text-white">
                    {item.type === 'anime' ? 'Anime' : item.type === 'tv' ? 'Series' : 'Movie'}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-zinc-900/90 text-amber-400 border border-zinc-700">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {item.vote_average.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-300 font-medium">
                    TMDB #{item.id}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {item.title}
                </h2>
                {item.original_title && item.original_title !== item.title && (
                  <p className="text-xs sm:text-sm text-purple-300 font-medium">
                    {item.original_title}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Quick Actions & Meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    if (isSeries && currentSeason?.episodes?.length) {
                      onPlay(item, currentSeason.season_number, currentSeason.episodes[0].episode_number);
                    } else {
                      onPlay(item);
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isSeries ? 'Play S1 E1' : 'Play Movie'}
                </button>

                <button
                  onClick={() => onToggleWatchlist(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                    isWatchlisted
                      ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  {isWatchlisted ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {item.release_date}
                </span>
                {item.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Overview / Synopsis */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Overview
              </h3>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                {item.overview}
              </p>
            </div>

            {/* Seasons & Episodes for TV and Anime */}
            {isSeries && seasons.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    {item.type === 'anime' ? <Sparkles className="w-4 h-4 text-rose-400" /> : <Tv className="w-4 h-4 text-indigo-400" />}
                    Episodes & Seasons
                  </h3>
                </div>

                {/* Season Tabs */}
                {seasons.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {seasons.map((season) => (
                      <button
                        key={season.season_number}
                        onClick={() => setSelectedSeasonNumber(season.season_number)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          selectedSeasonNumber === season.season_number
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {season.name || `Season ${season.season_number}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* Episode List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {currentSeason?.episodes?.map((ep) => (
                    <div
                      key={ep.episode_number}
                      onClick={() => onPlay(item, currentSeason.season_number, ep.episode_number)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/70 hover:border-purple-500/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-purple-600/30 text-zinc-400 group-hover:text-purple-300 flex items-center justify-center shrink-0 font-semibold text-xs transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                            EP {ep.episode_number}: {ep.name}
                          </h4>
                          {ep.overview && (
                            <p className="text-xs text-zinc-400 truncate max-w-xl">
                              {ep.overview}
                            </p>
                          )}
                        </div>
                      </div>
                      {ep.runtime && (
                        <span className="text-xs text-zinc-500 shrink-0 ml-3">
                          {ep.runtime}m
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
