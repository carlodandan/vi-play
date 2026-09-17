import { useState, useEffect, useCallback } from 'react';
import { Play, Info, Bookmark, Star, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';

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
  const currentItem = heroList[currentIndex] || heroList[0];

  const handleNext = useCallback(() => {
    if (heroList.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % heroList.length);
  }, [heroList.length]);

  const handlePrev = useCallback(() => {
    if (heroList.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + heroList.length) % heroList.length);
  }, [heroList.length]);

  // Auto advance every 7 seconds when not hovered
  useEffect(() => {
    if (isPaused || heroList.length <= 1) return;
    const interval = setInterval(handleNext, 7000);
    return () => clearInterval(interval);
  }, [isPaused, handleNext, heroList.length]);

  if (!currentItem) return null;

  const isWatchlisted = watchlistIds.includes(currentItem.id);
  const typeLabel =
    currentItem.type === 'anime'
      ? 'Anime Series'
      : currentItem.type === 'tv'
      ? 'TV Series'
      : 'Movie';

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="group relative w-full h-[540px] sm:h-[600px] md:h-[640px] overflow-hidden rounded-2xl mb-12 border border-zinc-800/80 shadow-2xl bg-zinc-950"
    >
      {/* Background Slides with Crossfade */}
      {heroList.map((item, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={`${item.type}-${item.id}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-0 pointer-events-auto' : 'opacity-0 z-[-1] pointer-events-none'
            }`}
          >
            {/* LCP candidate gets fetchpriority="high", background slides get fetchpriority="low" and loading="lazy" */}
            <img
              src={item.backdrop_path || item.poster_path}
              alt={item.title}
              fetchPriority={index === 0 ? 'high' : 'low'}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-7000 ease-out"
            />
          </div>
        );
      })}

      {/* Cinematic Vignettes & Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f] via-[#090a0f]/85 md:via-[#090a0f]/75 to-transparent w-full lg:w-4/5 pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/40 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-0 bg-radial-[circle_at_20%_50%] from-transparent via-[#090a0f]/20 to-[#090a0f]/60 pointer-events-none z-10" />

      {/* Hero Content */}
      <div className="relative z-20 h-full max-w-3xl flex flex-col justify-end p-6 sm:p-10 md:p-16 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
            <Sparkles className="w-3.5 h-3.5" />
            {typeLabel}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-900/90 text-amber-400 border border-zinc-700/60 backdrop-blur-md">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {currentItem.vote_average.toFixed(1)}
          </span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900/80 text-zinc-300 border border-zinc-800">
            {currentItem.release_date?.slice(0, 4)}
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-zinc-900/80 text-purple-300 border border-purple-500/40">
            4K Ultra HD
          </span>
          {currentItem.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-2.5 py-0.5 text-xs rounded-md bg-zinc-900/60 text-zinc-400 border border-zinc-800/80"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
          {currentItem.title}
        </h1>

        {/* Tagline / Subtitle */}
        {currentItem.tagline && (
          <p className="text-sm sm:text-base font-semibold text-purple-300/90 italic drop-shadow">
            "{currentItem.tagline}"
          </p>
        )}

        {/* Overview */}
        <p className="text-sm sm:text-base text-zinc-300/90 line-clamp-3 leading-relaxed max-w-2xl drop-shadow">
          {currentItem.overview}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3.5 pt-2">
          <button
            onClick={() => onPlay(currentItem)}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-purple-600/40 hover:shadow-purple-600/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch Now
          </button>

          <button
            onClick={() => onToggleWatchlist(currentItem.id)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold border backdrop-blur-md transition-all cursor-pointer ${
              isWatchlisted
                ? 'bg-purple-950/70 border-purple-500/60 text-purple-300'
                : 'bg-zinc-900/80 hover:bg-zinc-800/90 border-zinc-700/60 text-zinc-200'
            }`}
          >
            {isWatchlisted ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isWatchlisted ? 'In Watchlist' : 'Watchlist'}
          </button>

          <button
            onClick={() => onOpenDetails(currentItem)}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 font-semibold backdrop-blur-md transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
            Details
          </button>
        </div>
      </div>

      {/* Desktop Previous / Next Controls */}
      {heroList.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          {/* Slide Dots / Indicators */}
          <div className="flex items-center gap-2 mr-2">
            {heroList.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentIndex
                    ? 'w-7 bg-purple-500 shadow-sm shadow-purple-500/50'
                    : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handlePrev}
            className="w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-purple-600 text-white border border-zinc-700/60 hover:border-purple-500 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-purple-600 text-white border border-zinc-700/60 hover:border-purple-500 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

