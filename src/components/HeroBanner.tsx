import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Info,
  Bookmark,
  Star,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { MediaItem } from "../types/media.ts";

interface HeroBannerProps {
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  watchlistIds: number[];
  onToggleWatchlist: (id: number) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onPlay,
  onOpenDetails,
  watchlistIds,
  onToggleWatchlist,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const heroList = items.length > 0 ? items : [];
  const safeIndex =
    heroList.length > 0
      ? Math.min(Math.max(0, currentIndex), heroList.length - 1)
      : 0;
  const currentItem = heroList[safeIndex];

  const handleNext = useCallback(() => {
    if (heroList.length <= 1) return;
    setCurrentIndex((prev) => {
      const current =
        heroList.length > 0
          ? Math.min(Math.max(0, prev), heroList.length - 1)
          : 0;
      return (current + 1) % heroList.length;
    });
  }, [heroList.length]);

  const handlePrev = useCallback(() => {
    if (heroList.length <= 1) return;
    setCurrentIndex((prev) => {
      const current =
        heroList.length > 0
          ? Math.min(Math.max(0, prev), heroList.length - 1)
          : 0;
      return (current - 1 + heroList.length) % heroList.length;
    });
  }, [heroList.length]);

  useEffect(() => {
    if (isPaused || heroList.length <= 1) return;
    const interval = setInterval(handleNext, 7000);
    return () => clearInterval(interval);
  }, [isPaused, handleNext, heroList.length]);

  if (!currentItem) return null;

  const isWatchlisted = watchlistIds.includes(currentItem.id);
  const typeLabel =
    currentItem.type === "anime"
      ? "Anime Series"
      : currentItem.type === "tv"
        ? "TV Series"
        : "Movie";

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      // Full-bleed: break out of max-w-7xl container with negative margins
      className="group relative w-full overflow-hidden mb-10"
      style={{
        height: "clamp(480px, 62vw, 720px)",
        // Edge-to-edge with negative side margins to bust out of the padded container
        marginLeft: "calc(-1 * (max(0px, (100vw - 80rem) / 2) + 1rem))",
        marginRight: "calc(-1 * (max(0px, (100vw - 80rem) / 2) + 1rem))",
        width: "100vw",
        maxWidth: "100vw",
      }}
    >
      {/* Background slide images with crossfade */}
      {heroList.map((item, index) => {
        const isActive = index === safeIndex;
        return (
          <div
            key={`${item.type}-${item.id}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-0" : "opacity-0 z-[-1]"
            }`}
          >
            <img
              src={item.backdrop_path || item.poster_path}
              alt={item.title}
              fetchPriority={index === 0 ? "high" : "low"}
              loading={index === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover object-center"
              style={{ transform: "scale(1.04)" }}
            />
          </div>
        );
      })}

      {/* Cinematic multi-layer vignette */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Left side content shadow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.10) 70%, transparent 100%)",
          }}
        />
        {/* Bottom vignette — bleed into shelf area */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, #000000 0%, rgba(0,0,0,0.70) 20%, rgba(0,0,0,0.20) 50%, transparent 80%)",
          }}
        />
        {/* Top shadow for navbar readability */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, transparent 25%)",
          }}
        />
      </div>

      {/* Hero content: positioned with padding mirroring container insets */}
      <div
        className="relative z-20 h-full flex flex-col justify-end"
        style={{
          paddingLeft: "max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))",
          paddingRight: "max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))",
          paddingBottom: "4rem",
        }}
      >
        <div className="max-w-2xl space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest rounded-md text-white shadow-lg"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 0 12px var(--color-accent-glow)",
              }}
            >
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              {typeLabel}
            </span>
            <span
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md text-amber-400 border border-white/10"
              style={{
                background: "rgba(0,0,0,0.60)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
              {currentItem.vote_average.toFixed(1)}
            </span>
            <span
              className="px-2.5 py-1 text-[11px] font-medium rounded-md text-zinc-300 border border-white/10"
              style={{
                background: "rgba(0,0,0,0.60)",
                backdropFilter: "blur(8px)",
              }}
            >
              {currentItem.release_date?.slice(0, 4)}
            </span>
            {currentItem.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-0.5 text-[11px] rounded-md text-zinc-400 border border-white/[0.06]"
                style={{ background: "rgba(0,0,0,0.50)" }}
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Title — Bebas Neue large cinematic */}
          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl leading-none tracking-wide text-white drop-shadow-2xl"
            style={{ textShadow: "0 4px 24px rgba(0,0,0,0.8)" }}
          >
            {currentItem.title}
          </h1>

          {/* Tagline */}
          {currentItem.tagline && (
            <p
              className="text-sm sm:text-base font-medium italic"
              style={{ color: "#fda4af" }}
            >
              "{currentItem.tagline}"
            </p>
          )}

          {/* Overview */}
          <p className="text-sm sm:text-base text-zinc-300/90 line-clamp-2 leading-relaxed max-w-xl">
            {currentItem.overview}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Primary: red glow play button */}
            <button
              onClick={() => onPlay(currentItem)}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-white font-bold transition-all cursor-pointer glow-pulse hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 0 20px var(--color-accent-glow)",
              }}
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              Watch Now
            </button>

            {/* Watchlist button */}
            <button
              onClick={() => onToggleWatchlist(currentItem.id)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold border transition-all cursor-pointer"
              style={{
                background: isWatchlisted
                  ? "rgba(225,29,72,0.15)"
                  : "rgba(15,15,35,0.75)",
                backdropFilter: "blur(8px)",
                borderColor: isWatchlisted
                  ? "var(--color-accent)"
                  : "rgba(255,255,255,0.10)",
                color: isWatchlisted ? "#fda4af" : "#e4e4e7",
              }}
            >
              {isWatchlisted ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Bookmark className="w-4 h-4" aria-hidden="true" />
              )}
              {isWatchlisted ? "Saved" : "Watchlist"}
            </button>

            {/* Details button */}
            <button
              onClick={() => onOpenDetails(currentItem)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold border transition-all cursor-pointer text-zinc-300 hover:text-white"
              style={{
                background: "rgba(15,15,35,0.75)",
                backdropFilter: "blur(8px)",
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Info className="w-4 h-4" aria-hidden="true" />
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Navigation controls — bottom right */}
      {heroList.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {heroList.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="h-1.5 rounded-full transition-all cursor-pointer"
                style={{
                  width: i === safeIndex ? "28px" : "6px",
                  background:
                    i === safeIndex
                      ? "var(--color-accent)"
                      : "rgba(255,255,255,0.25)",
                  boxShadow:
                    i === safeIndex
                      ? "0 0 8px var(--color-accent-glow)"
                      : "none",
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handlePrev}
            className="w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer text-white"
            style={{
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(8px)",
              borderColor: "rgba(255,255,255,0.10)",
            }}
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer text-white"
            style={{
              background: "var(--color-accent)",
              boxShadow: "0 0 12px var(--color-accent-glow)",
              borderColor: "transparent",
            }}
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Progress bar for auto-advance (thin line at bottom) */}
      {heroList.length > 1 && !isPaused && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px z-20"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            key={safeIndex}
            className="h-full"
            style={{
              background: "var(--color-accent)",
              animation: "width-progress 7s linear",
              animationFillMode: "forwards",
            }}
          />
        </div>
      )}
    </div>
  );
};
