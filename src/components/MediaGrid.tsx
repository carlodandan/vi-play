import type { MediaItem } from '../types/media.ts';
import { MediaCard } from './MediaCard.tsx';

interface MediaGridProps {
  title: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onSelectItem: (item: MediaItem) => void;
  watchlistIds: number[];
  onToggleWatchlist: (id: number) => void;
  genres?: string[];
  selectedGenre?: string;
  onSelectGenre?: (genre: string) => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  title,
  icon,
  items,
  onPlay,
  onSelectItem,
  watchlistIds,
  onToggleWatchlist,
  genres = [],
  selectedGenre = 'All',
  onSelectGenre,
}) => {
  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-purple-400">{icon}</div>}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            {items.length}
          </span>
        </div>

        {/* Optional Genre Filter Chips */}
        {genres.length > 0 && onSelectGenre && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['All', ...genres].map((g) => (
              <button
                key={g}
                onClick={() => onSelectGenre(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedGenre === g
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60">
          <p className="text-zinc-400 text-sm">No titles found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {items.map((item) => (
            <MediaCard
              key={`${item.type}-${item.id}`}
              item={item}
              onPlay={onPlay}
              onClick={onSelectItem}
              isWatchlisted={watchlistIds.includes(item.id)}
              onToggleWatchlist={onToggleWatchlist}
            />
          ))}
        </div>
      )}
    </section>
  );
};
