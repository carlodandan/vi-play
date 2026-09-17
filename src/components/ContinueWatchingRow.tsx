import { useState, useEffect } from 'react';
import { Play, Trash2, Clock } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import {
  getWatchHistory,
  clearWatchHistoryItem,
  HISTORY_CHANGE_EVENT,
  type WatchHistoryItem,
} from '../services/watchHistory.ts';

interface ContinueWatchingRowProps {
  onPlay: (item: MediaItem, season?: number, episode?: number) => void;
  onSelectItem: (item: MediaItem) => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  onPlay,
  onSelectItem,
}) => {
  const [history, setHistory] = useState<WatchHistoryItem[]>(getWatchHistory);

  useEffect(() => {
    const handleUpdate = () => {
      setHistory(getWatchHistory());
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener(HISTORY_CHANGE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener(HISTORY_CHANGE_EVENT, handleUpdate);
    };
  }, []);

  const handleRemove = (e: React.MouseEvent, entry: WatchHistoryItem) => {
    e.stopPropagation();
    clearWatchHistoryItem(entry.item.id, entry.season, entry.episode);
    setHistory(getWatchHistory());
  };

  if (history.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Continue Watching
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/60">
            {history.length}
          </span>
        </div>
      </div>

      <div
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {history.map((entry) => {
          const isTv = entry.season !== undefined && entry.episode !== undefined;
          const subLabel = isTv ? `S${entry.season} : E${entry.episode}` : entry.item.genres[0] || 'Movie';

          return (
            <div
              key={`${entry.item.id}-${entry.season ?? 0}-${entry.episode ?? 0}`}
              onClick={() => onSelectItem(entry.item)}
              className="group relative shrink-0 w-[240px] sm:w-[280px] bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-950/30 cursor-pointer snap-start flex flex-col"
            >
              {/* Backdrop Container */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <img
                  src={entry.item.backdrop_path || entry.item.poster_path}
                  alt={entry.item.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                {/* Quick Play Button in center on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/30">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(entry.item, entry.season, entry.episode);
                    }}
                    className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/40 transform scale-90 group-hover:scale-100 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    title="Resume playback"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                </div>

                {/* Remove from history button */}
                <button
                  onClick={(e) => handleRemove(e, entry)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-zinc-950/70 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300 border border-zinc-700/60 hover:border-rose-500/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Remove from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/80">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-r"
                    style={{ width: `${entry.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Media Title & Episode */}
              <div className="p-3 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors line-clamp-1">
                    {entry.item.title}
                  </h3>
                  <p className="text-xs text-purple-400 font-medium mt-0.5">
                    {subLabel}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
                  <span>Resume watching</span>
                  <span>{entry.progressPercent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
