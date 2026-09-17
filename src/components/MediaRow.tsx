import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';
import { MediaCard } from './MediaCard.tsx';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onSelectItem: (item: MediaItem) => void;
  watchlistIds: number[];
  onToggleWatchlist: (id: number) => void;
  showRank?: boolean;
  onSeeAll?: () => void;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  subtitle,
  icon,
  items,
  onPlay,
  onSelectItem,
  watchlistIds,
  onToggleWatchlist,
  showRank = false,
  onSeeAll,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const containerWidth = rowRef.current.clientWidth;
    const scrollAmount = direction === 'left' ? -containerWidth * 0.75 : containerWidth * 0.75;
    rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-10 group/row relative">
      {/* Row Header */}
      <div className="flex items-center justify-between gap-4 mb-4 px-1">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-purple-400 shrink-0">{icon}</div>}
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-400">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors group/btn cursor-pointer"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Desktop Arrow Controls */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                canScrollLeft
                  ? 'bg-zinc-900/80 hover:bg-zinc-800 text-white border-zinc-700/60 shadow-md'
                  : 'bg-zinc-900/30 text-zinc-600 border-zinc-800/40 cursor-not-allowed opacity-50'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                canScrollRight
                  ? 'bg-zinc-900/80 hover:bg-zinc-800 text-white border-zinc-700/60 shadow-md'
                  : 'bg-zinc-900/30 text-zinc-600 border-zinc-800/40 cursor-not-allowed opacity-50'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Track */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => (
          <div
            key={`${item.type}-${item.id}`}
            className={`shrink-0 snap-start transition-transform ${
              showRank
                ? 'w-[180px] sm:w-[220px] md:w-[240px]'
                : 'w-[150px] sm:w-[180px] md:w-[200px]'
            }`}
          >
            {showRank ? (
              <div className="relative flex items-end">
                {/* Stylized Rank Number */}
                <span
                  className="font-black text-6xl sm:text-7xl md:text-8xl leading-none select-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-t from-zinc-800 via-zinc-700 to-zinc-900 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] pr-1 -mr-4 sm:-mr-5 z-0"
                  style={{
                    WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {index + 1}
                </span>
                <div className="flex-1 z-10">
                  <MediaCard
                    item={item}
                    onPlay={onPlay}
                    onClick={onSelectItem}
                    isWatchlisted={watchlistIds.includes(item.id)}
                    onToggleWatchlist={onToggleWatchlist}
                  />
                </div>
              </div>
            ) : (
              <MediaCard
                item={item}
                onPlay={onPlay}
                onClick={onSelectItem}
                isWatchlisted={watchlistIds.includes(item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
