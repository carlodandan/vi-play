import { Play, Info, Bookmark, Star, Check } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';

interface HeroBannerProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onOpenDetails: (item: MediaItem) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (id: number) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  item,
  onPlay,
  onOpenDetails,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const typeLabel =
    item.type === 'anime' ? 'Anime Series' : item.type === 'tv' ? 'TV Series' : 'Movie';

  return (
    <div className="relative w-full h-[520px] md:h-[600px] overflow-hidden rounded-2xl mb-10 border border-zinc-800/60 shadow-2xl bg-zinc-950">
      {/* High-res backdrop image */}
      <img
        src={item.backdrop_path}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
      />

      {/* Cinematic Vignettes & Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent w-full md:w-3/4" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      <div className="absolute inset-0 bg-radial-[circle_at_20%_50%] from-transparent via-zinc-950/20 to-zinc-950/70" />

      {/* Hero Content */}
      <div className="relative z-10 h-full max-w-2xl flex flex-col justify-end p-6 sm:p-10 md:p-14 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md bg-purple-600 text-white shadow-lg shadow-purple-600/30">
            {typeLabel}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-900/90 text-amber-400 border border-zinc-700/60 backdrop-blur-md">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {item.vote_average.toFixed(1)}
          </span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900/80 text-zinc-300 border border-zinc-800">
            {item.release_date?.slice(0, 4)}
          </span>
          {item.genres.map((genre) => (
            <span
              key={genre}
              className="px-2 py-0.5 text-xs rounded-md bg-zinc-900/60 text-zinc-400 border border-zinc-800/80"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
          {item.title}
        </h1>

        {/* Tagline / Subtitle */}
        {item.tagline && (
          <p className="text-sm sm:text-base font-medium text-purple-300/90 italic">
            "{item.tagline}"
          </p>
        )}

        {/* Overview */}
        <p className="text-sm sm:text-base text-zinc-300/90 line-clamp-3 leading-relaxed drop-shadow">
          {item.overview}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Watch Now
          </button>

          <button
            onClick={() => onToggleWatchlist(item.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium border backdrop-blur-md transition-all cursor-pointer ${
              isWatchlisted
                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700/60 text-zinc-200'
            }`}
          >
            {isWatchlisted ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            {isWatchlisted ? 'In Watchlist' : 'Watchlist'}
          </button>

          <button
            onClick={() => onOpenDetails(item)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-medium backdrop-blur-md transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
            Details
          </button>
        </div>
      </div>
    </div>
  );
};
