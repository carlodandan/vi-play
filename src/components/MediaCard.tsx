import { Play, Bookmark, Star, Check } from 'lucide-react';
import type { MediaItem } from '../types/media.ts';

interface MediaCardProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onClick: (item: MediaItem) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (id: number) => void;
  rank?: number;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onPlay,
  onClick,
  isWatchlisted,
  onToggleWatchlist,
  rank,
}) => {
  const typeBadgeColor =
    item.type === 'anime'
      ? 'bg-rose-500/90 text-white shadow-rose-950/40'
      : item.type === 'tv'
      ? 'bg-indigo-500/90 text-white shadow-indigo-950/40'
      : 'bg-purple-600/90 text-white shadow-purple-950/40';

  const typeName = item.type === 'anime' ? 'Anime' : item.type === 'tv' ? 'Series' : 'Movie';

  return (
    <div
      onClick={() => onClick(item)}
      className="group relative flex flex-col bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800/80 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/30 hover:-translate-y-1 cursor-pointer"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
        <img
          src={item.poster_path}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Media Type Badge */}
        <span
          className={`absolute top-2.5 left-2.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md backdrop-blur-md shadow-md ${typeBadgeColor}`}
        >
          {typeName}
        </span>

        {/* Rating Badge */}
        <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md bg-zinc-950/85 text-amber-400 border border-zinc-700/60 backdrop-blur-md">
          <Star className="w-3 h-3 fill-amber-400" />
          {item.vote_average.toFixed(1)}
        </span>

        {/* Rank indicator badge if supplied */}
        {rank !== undefined && (
          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 text-[11px] font-extrabold rounded-md bg-purple-600/90 text-white border border-purple-400/40 shadow-lg shadow-purple-950/60">
            #{rank}
          </span>
        )}

        {/* Quick Action Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 transform scale-90 group-hover:scale-100 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Play Stream"
          >
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item.id);
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
              isWatchlisted
                ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            {isWatchlisted ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Media Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-zinc-900/30">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 group-hover:text-purple-300 transition-colors line-clamp-1">
            {item.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
            {item.genres.join(' • ')}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2.5 font-medium">
          <span>{item.release_date?.slice(0, 4)}</span>
          {item.seasons_count ? (
            <span>
              {item.seasons_count} {item.seasons_count === 1 ? 'Season' : 'Seasons'}
            </span>
          ) : (
            <span className="text-zinc-600">HD</span>
          )}
        </div>
      </div>
    </div>
  );
};

