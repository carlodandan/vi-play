import { Star, Play, Bookmark, Check } from "lucide-react";
import type { MediaItem } from "../types/media.ts";
import { buildMediaPath } from "../utils/slug.ts";

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (id: number, item?: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onClick,
  onPlay,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const typeBadgeStyle =
    item.type === "anime"
      ? {
          background: "rgba(168,85,247,0.20)",
          color: "#d8b4fe",
          border: "1px solid rgba(168,85,247,0.30)",
        }
      : item.type === "tv"
        ? {
            background: "rgba(6,182,212,0.20)",
            color: "#67e8f9",
            border: "1px solid rgba(6,182,212,0.30)",
          }
        : {
            background: "rgba(225,29,72,0.20)",
            color: "#fda4af",
            border: "1px solid rgba(225,29,72,0.30)",
          };

  const typeName =
    item.type === "anime" ? "Anime" : item.type === "tv" ? "Series" : "Movie";
  const mediaHref = buildMediaPath(item.type, item.id, item.title);
  const releaseYear = item.release_date?.slice(0, 4) || item.year || "";
  const altText = `${item.title}${releaseYear ? ` (${releaseYear})` : ""} - Watch ${typeName} on Vi-Play`;

  return (
    <a
      href={mediaHref}
      onClick={(e) => {
        // Allow ctrl/cmd click to open in new tab
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          onClick(item);
        }
      }}
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-300 no-underline text-inherit"
      style={{
        background: "var(--color-surface)",
        border: "1px solid rgba(255,255,255,0.05)",
        transform: "translateY(0)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform =
          "translateY(-4px)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          "var(--color-accent)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow =
          "0 8px 32px var(--color-accent-glow)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.transform =
          "translateY(0)";
        (e.currentTarget as HTMLAnchorElement).style.borderColor =
          "rgba(255,255,255,0.05)";
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
      }}
    >
      {/* Poster */}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden"
        style={{ background: "#060608" }}
      >
        <img
          src={item.poster_path}
          alt={altText}
          loading="lazy"
          decoding="async"
          width={342}
          height={513}
          className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Type badge — top left */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md"
          style={typeBadgeStyle}
        >
          {typeName}
        </span>

        {/* Rating badge — top right */}
        <span
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md text-amber-400"
          style={{
            background: "rgba(0,0,0,0.80)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Star className="w-2.5 h-2.5 fill-amber-400" aria-hidden="true" />
          {item.vote_average.toFixed(1)}
        </span>

        {/* Hover / focus overlay with play + watchlist */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.45) 50%, transparent 100%)",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all cursor-pointer transform scale-90 group-hover:scale-100 group-focus-within:scale-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            style={{
              background: "var(--color-accent)",
              boxShadow: "0 0 20px var(--color-accent-glow)",
            }}
            title="Play"
            aria-label={`Play ${item.title}`}
          >
            <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item.id, item);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            style={{
              background: isWatchlisted
                ? "rgba(225,29,72,0.20)"
                : "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              borderColor: isWatchlisted
                ? "var(--color-accent)"
                : "rgba(255,255,255,0.15)",
              color: isWatchlisted ? "#fda4af" : "#d4d4d8",
            }}
            title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
            aria-label={
              isWatchlisted
                ? `Remove ${item.title} from Watchlist`
                : `Add ${item.title} to Watchlist`
            }
          >
            {isWatchlisted ? (
              <Check className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Bookmark className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Card info */}
      <div
        className="px-3 py-3 flex flex-col flex-1 justify-between"
        style={{ background: "var(--color-surface)" }}
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition-colors">
            {item.title}
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
            {item.genres.slice(0, 2).join(" · ")}
          </p>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-600 mt-2 font-medium">
          <span>{item.release_date?.slice(0, 4)}</span>
          {item.seasons_count ? (
            <span className="text-zinc-500">
              {item.seasons_count}{" "}
              {item.seasons_count === 1 ? "Season" : "Seasons"}
            </span>
          ) : (
            <span
              className="font-semibold text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(225,29,72,0.12)", color: "#fda4af" }}
            >
              HD
            </span>
          )}
        </div>
      </div>
    </a>
  );
};
