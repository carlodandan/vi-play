import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { MediaItem } from "../types/media.ts";
import { MediaCard } from "./MediaCard.tsx";

interface MediaRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onSelectItem: (item: MediaItem) => void;
  watchlistIds: number[];
  onToggleWatchlist: (id: number, item?: MediaItem) => void;
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
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const amount =
      direction === "left"
        ? -rowRef.current.clientWidth * 0.75
        : rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-10 animate-slideUp">
      {/* Row Header */}
      <div className="flex items-center justify-between gap-4 mb-4 px-1">
        <div className="flex items-baseline gap-3">
          <div className="flex items-center gap-2.5">
            {/* Red left-accent bar */}
            <div
              className="w-1 h-6 rounded-full flex-shrink-0"
              style={{ background: "var(--color-accent)" }}
            />
            {icon && <div className="text-zinc-400 shrink-0">{icon}</div>}
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-500">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors group/btn cursor-pointer"
              style={{ color: "var(--color-accent)" }}
            >
              <span>See All</span>
              <ArrowRight
                className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform"
                aria-hidden="true"
              />
            </button>
          )}

          {/* Desktop scroll arrows */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                canScrollLeft
                  ? "text-white hover:scale-105"
                  : "text-zinc-700 cursor-not-allowed opacity-40"
              }`}
              style={
                canScrollLeft
                  ? {
                      background: "rgba(15,15,35,0.85)",
                      backdropFilter: "blur(8px)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }
                  : {
                      background: "rgba(10,10,15,0.5)",
                      borderColor: "rgba(255,255,255,0.04)",
                    }
              }
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                canScrollRight
                  ? "text-white hover:scale-105"
                  : "text-zinc-700 cursor-not-allowed opacity-40"
              }`}
              style={
                canScrollRight
                  ? {
                      background: "var(--color-accent)",
                      borderColor: "transparent",
                      boxShadow: "0 0 10px var(--color-accent-glow)",
                    }
                  : {
                      background: "rgba(10,10,15,0.5)",
                      borderColor: "rgba(255,255,255,0.04)",
                    }
              }
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrolling track */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
      >
        {items.map((item, index) => (
          <div
            key={`${item.type}-${item.id}`}
            className={`shrink-0 snap-start ${
              showRank
                ? "w-[170px] sm:w-[200px] md:w-[220px]"
                : "w-[148px] sm:w-[175px] md:w-[195px]"
            }`}
          >
            {showRank ? (
              /* Rank layout: card + giant number in BOTTOM-RIGHT corner */
              <div className="relative">
                <MediaCard
                  item={item}
                  onPlay={onPlay}
                  onClick={onSelectItem}
                  isWatchlisted={watchlistIds.includes(item.id)}
                  onToggleWatchlist={onToggleWatchlist}
                />
                {/* Giant rank number — BOTTOM-RIGHT, clipped within card */}
                <span
                  className="absolute bottom-[3.2rem] right-[-6px] font-display leading-none select-none pointer-events-none z-10"
                  style={{
                    fontSize: "clamp(72px, 14vw, 110px)",
                    // Deep stroke only, gradient fill from dark to slightly lighter
                    color: "transparent",
                    WebkitTextStroke:
                      index < 3
                        ? `2px rgba(225,29,72,0.45)` // Top 3 get a hint of red stroke
                        : "1.5px rgba(255,255,255,0.12)",
                    backgroundImage:
                      index < 3
                        ? "linear-gradient(160deg, rgba(225,29,72,0.30) 0%, rgba(30,27,75,0.25) 60%, rgba(0,0,0,0.10) 100%)"
                        : "linear-gradient(160deg, rgba(80,80,100,0.28) 0%, rgba(20,20,40,0.18) 60%, rgba(0,0,0,0.10) 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))",
                  }}
                >
                  {index + 1}
                </span>
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
