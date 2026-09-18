import type { MediaItem } from "../types/media.ts";
import { MediaCard } from "./MediaCard.tsx";

interface MediaGridProps {
  title: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onSelectItem: (item: MediaItem) => void;
  watchlistIds: number[];
  onToggleWatchlist: (id: number, item?: MediaItem) => void;
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
  selectedGenre = "All",
  onSelectGenre,
  isPageHeading = true,
}: MediaGridProps & { isPageHeading?: boolean }) => {
  return (
    <section className="mb-12 animate-slideUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div
            className="w-1 h-6 rounded-full shrink-0"
            style={{ background: "var(--color-accent)" }}
          />
          {icon && <div className="text-zinc-400">{icon}</div>}
          {isPageHeading ? (
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {title}
            </h1>
          ) : (
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
          )}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full text-zinc-500"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {items.length}
          </span>
        </div>

        {/* Genre chips */}
        {genres.length > 0 && onSelectGenre && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["All", ...genres].map((g) => (
              <button
                key={g}
                onClick={() => onSelectGenre(g)}
                className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                style={
                  selectedGenre === g
                    ? {
                        background: "var(--color-accent)",
                        color: "#fff",
                        boxShadow: "0 0 10px var(--color-accent-glow)",
                      }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "#71717a",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }
                }
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="p-12 text-center rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p className="text-zinc-500 text-sm">
            No titles found in this category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
