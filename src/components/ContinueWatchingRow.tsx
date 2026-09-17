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
    const handleUpdate = () => setHistory(getWatchHistory());
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
    <section className="mb-10 animate-slideUp">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 rounded-full shrink-0" style={{ background: 'var(--color-accent)' }} />
          <Clock className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Continue Watching</h2>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(225,29,72,0.12)', color: '#fda4af', border: '1px solid rgba(225,29,72,0.25)' }}
          >
            {history.length}
          </span>
        </div>
      </div>

      {/* Horizontal scroll track */}
      <div
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
      >
        {history.map((entry) => {
          const isTv = entry.season !== undefined && entry.episode !== undefined;
          const subLabel = isTv ? `S${entry.season} · E${entry.episode}` : entry.item.genres[0] || 'Movie';

          return (
            <div
              key={`${entry.item.id}-${entry.season ?? 0}-${entry.episode ?? 0}`}
              onClick={() => onSelectItem(entry.item)}
              className="group relative shrink-0 w-[240px] sm:w-[280px] rounded-xl overflow-hidden snap-start flex flex-col cursor-pointer transition-all duration-300"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px var(--color-accent-glow)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Backdrop */}
              <div className="relative aspect-video w-full overflow-hidden" style={{ background: '#060608' }}>
                <img
                  src={entry.item.backdrop_path || entry.item.poster_path}
                  alt={entry.item.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)' }} />

                {/* Play on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlay(entry.item, entry.season, entry.episode); }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all cursor-pointer transform scale-90 group-hover:scale-100"
                    style={{ background: 'var(--color-accent)', boxShadow: '0 0 20px var(--color-accent-glow)' }}
                    title="Resume"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => handleRemove(e, entry)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-zinc-400 hover:text-rose-300"
                  style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', borderColor: 'rgba(255,255,255,0.10)' }}
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                {/* Progress bar — red */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-r"
                    style={{ width: `${entry.progressPercent}%`, background: 'var(--color-accent)', boxShadow: '0 0 6px var(--color-accent-glow)' }}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="px-3 py-3 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">{entry.item.title}</h3>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#fda4af' }}>{subLabel}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-600 mt-2">
                  <span>Resume watching</span>
                  <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>{entry.progressPercent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
