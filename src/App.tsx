import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DisclaimerBanner } from "./components/DisclaimerBanner.tsx";
import { Navbar, type NavCategory } from "./components/Navbar.tsx";
import { HeroBanner } from "./components/HeroBanner.tsx";
import { MediaRow } from "./components/MediaRow.tsx";
import { ContinueWatchingRow } from "./components/ContinueWatchingRow.tsx";
import { saveWatchHistory } from "./services/watchHistory.ts";
import { MediaGrid } from "./components/MediaGrid.tsx";
import { MediaModal } from "./components/MediaModal.tsx";
import { VideoPlayerModal } from "./components/VideoPlayerModal.tsx";
import { Footer } from "./components/Footer.tsx";
import type { MediaItem, MediaType } from "./types/media.ts";
import { CURATED_MEDIA } from "./data/curatedMedia.ts";
import {
  getMediaList,
  getWatchlistIds,
  toggleWatchlist,
  fetchShelf,
  fetchMediaDetail,
} from "./services/tmdbApi.ts";
import { Film, Tv, Sparkles, Bookmark, Flame, Compass } from "lucide-react";

interface ActivePlayerState {
  item: MediaItem;
  season?: number;
  episode?: number;
}

function getCategoryPath(cat: NavCategory): string {
  switch (cat) {
    case "movie":
      return "/movies";
    case "tv":
      return "/tv";
    case "anime":
      return "/anime";
    case "watchlist":
      return "/watchlist";
    default:
      return "/";
  }
}

// ── Initial curated fallback shelves (shown instantly before live data loads) ──
const CURATED_TOP10 = [...CURATED_MEDIA]
  .sort((a, b) => b.vote_average - a.vote_average)
  .slice(0, 10);
const CURATED_ANIME = CURATED_MEDIA.filter((m) => m.type === "anime");
const CURATED_MOVIES = CURATED_MEDIA.filter((m) => m.type === "movie");
const CURATED_TV = CURATED_MEDIA.filter((m) => m.type === "tv");
const CURATED_SCIFI = CURATED_MEDIA.filter((m) =>
  m.genres.some(
    (g) =>
      g.toLowerCase().includes("sci-fi") ||
      g.toLowerCase().includes("fantasy") ||
      g.toLowerCase().includes("supernatural"),
  ),
);
const CURATED_FEATURED = CURATED_MEDIA.filter((m) => m.featured);

export function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentCategory, setCurrentCategory] = useState<NavCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [mediaList, setMediaList] = useState<MediaItem[]>(CURATED_MEDIA);
  const [watchlistIds, setWatchlistIds] = useState<number[]>(getWatchlistIds);
  const [detailModalItem, setDetailModalItem] = useState<MediaItem | null>(
    null,
  );
  const [activePlayer, setActivePlayer] = useState<ActivePlayerState | null>(
    null,
  );

  // Live shelves — start with curated fallback, replace with live data
  const [top10List, setTop10List] = useState<MediaItem[]>(CURATED_TOP10);
  const [animeList, setAnimeList] = useState<MediaItem[]>(CURATED_ANIME);
  const [moviesList, setMoviesList] = useState<MediaItem[]>(CURATED_MOVIES);
  const [tvList, setTvList] = useState<MediaItem[]>(CURATED_TV);
  const [sciFiList, setSciFiList] = useState<MediaItem[]>(CURATED_SCIFI);
  const [heroItems, setHeroItems] = useState<MediaItem[]>(CURATED_FEATURED);

  // ── Debounce search input (350ms) to avoid request spam on keystrokes ──────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Load category/search media grid ────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    getMediaList({
      category: currentCategory,
      query: debouncedQuery,
      genre: selectedGenre,
    }).then((items) => {
      if (isMounted) setMediaList(items);
    });
    return () => {
      isMounted = false;
    };
  }, [currentCategory, debouncedQuery, selectedGenre]);

  // ── Load live home shelves in parallel ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // Fetch all shelves concurrently
    Promise.allSettled([
      fetchShelf("trending", "all", 10), // top 10 trending
      fetchShelf("popular", "anime", 20), // anime
      fetchShelf("popular", "movie", 20), // movies
      fetchShelf("popular", "tv", 20), // tv
    ]).then(([trendingRes, animeRes, movieRes, tvRes]) => {
      if (!isMounted) return;

      const trending =
        trendingRes.status === "fulfilled" ? trendingRes.value : [];
      const anime = animeRes.status === "fulfilled" ? animeRes.value : [];
      const movies = movieRes.status === "fulfilled" ? movieRes.value : [];
      const tv = tvRes.status === "fulfilled" ? tvRes.value : [];

      if (trending.length > 0) {
        setTop10List(trending.slice(0, 10));
        // Hero = high-rated items with backdrops from trending
        const heroable = trending.filter(
          (m) => m.vote_average >= 7.0 && m.backdrop_path,
        );
        setHeroItems(
          heroable.length >= 3 ? heroable.slice(0, 8) : CURATED_FEATURED,
        );
      }
      if (anime.length > 0) setAnimeList(anime);
      if (movies.length > 0) setMoviesList(movies);
      if (tv.length > 0) {
        setTvList(tv);
        // Sci-Fi shelf: filter live tv for sci-fi genres
        const sf = [...movies, ...tv].filter((m) =>
          m.genres.some(
            (g) =>
              g.toLowerCase().includes("sci-fi") ||
              g.toLowerCase().includes("fantasy") ||
              g.toLowerCase().includes("supernatural") ||
              g.toLowerCase().includes("science fiction"),
          ),
        );
        if (sf.length > 0) setSciFiList(sf);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []); // run once on mount

  // ── Update hero when category changes ──────────────────────────────────────
  const categoryHeroItems = useMemo(() => {
    if (currentCategory === "anime")
      return animeList.filter((m) => m.backdrop_path).slice(0, 8);
    if (currentCategory === "tv")
      return tvList.filter((m) => m.backdrop_path).slice(0, 8);
    if (currentCategory === "movie")
      return moviesList.filter((m) => m.backdrop_path).slice(0, 8);
    return heroItems;
  }, [currentCategory, animeList, tvList, moviesList, heroItems]);

  // ── Genre options per category ──────────────────────────────────────────────
  const currentGenres = useMemo(() => {
    if (currentCategory === "movie")
      return [
        "Action",
        "Sci-Fi",
        "Adventure",
        "Drama",
        "Thriller",
        "Comedy",
        "Horror",
        "Romance",
      ];
    if (currentCategory === "anime")
      return [
        "Action",
        "Fantasy",
        "Animation",
        "Supernatural",
        "Romance",
        "Comedy",
      ];
    if (currentCategory === "tv")
      return [
        "Drama",
        "Crime",
        "Sci-Fi & Fantasy",
        "Mystery",
        "Action & Adventure",
        "Comedy",
      ];
    return [];
  }, [currentCategory]);

  const activePlayerRef = useRef(activePlayer);
  const detailModalItemRef = useRef(detailModalItem);

  useEffect(() => {
    activePlayerRef.current = activePlayer;
  }, [activePlayer]);

  useEffect(() => {
    detailModalItemRef.current = detailModalItem;
  }, [detailModalItem]);

  // ── Helper to find any media item from existing state/cache ───────────────
  const findKnownItem = useCallback(
    (id: number, type: MediaType): MediaItem | undefined => {
      return (
        mediaList.find((m) => m.id === id && m.type === type) ||
        top10List.find((m) => m.id === id && m.type === type) ||
        animeList.find((m) => m.id === id && m.type === type) ||
        moviesList.find((m) => m.id === id && m.type === type) ||
        tvList.find((m) => m.id === id && m.type === type) ||
        sciFiList.find((m) => m.id === id && m.type === type) ||
        heroItems.find((m) => m.id === id && m.type === type) ||
        CURATED_MEDIA.find((m) => m.id === id && m.type === type)
      );
    },
    [mediaList, top10List, animeList, moviesList, tvList, sciFiList, heroItems],
  );

  // ── URL Synchronization & Deep Linking ─────────────────────────────────────
  useEffect(() => {
    const path = location.pathname;

    // 1. Watch route: /watch/:type/:id/:season?/:episode?
    const watchMatch = path.match(
      /^\/watch\/(movie|tv|anime)\/(\d+)(?:\/(\d+)\/(\d+))?$/,
    );
    if (watchMatch) {
      const type = watchMatch[1] as "movie" | "tv" | "anime";
      const id = Number(watchMatch[2]);
      const rawS = watchMatch[3] ? Number(watchMatch[3]) : undefined;
      const rawE = watchMatch[4] ? Number(watchMatch[4]) : undefined;

      const known = findKnownItem(id, type);
      const isSeries =
        type === "tv" ||
        Boolean(rawS && rawE) ||
        (known
          ? known.media_type === "tv" ||
            known.type === "tv" ||
            Boolean(known.seasons?.length) ||
            Boolean(known.seasons_count)
          : false);

      const s = isSeries ? (rawS ?? 1) : undefined;
      const e = isSeries ? (rawE ?? 1) : undefined;

      const current = activePlayerRef.current;
      if (
        current?.item.id === id &&
        current.item.type === type &&
        current.season === s &&
        current.episode === e
      ) {
        return;
      }

      setDetailModalItem(null);
      if (known) {
        setActivePlayer({ item: known, season: s, episode: e });
      } else {
        const queryMediaType = isSeries
          ? "tv"
          : type === "movie"
            ? "movie"
            : undefined;
        fetchMediaDetail(id, type, queryMediaType).then((fetched) => {
          if (fetched && window.location.pathname === path) {
            const finalIsSeries =
              fetched.media_type === "tv" ||
              fetched.type === "tv" ||
              Boolean(fetched.seasons?.length) ||
              Boolean(fetched.seasons_count) ||
              Boolean(rawS && rawE);
            const finalS = finalIsSeries ? (rawS ?? 1) : undefined;
            const finalE = finalIsSeries ? (rawE ?? 1) : undefined;
            setActivePlayer({ item: fetched, season: finalS, episode: finalE });
          }
        });
      }
      return;
    }

    // 2. Detail route: /:type/:id
    const detailMatch = path.match(/^\/(movie|tv|anime)\/(\d+)$/);
    if (detailMatch) {
      const type = detailMatch[1] as "movie" | "tv" | "anime";
      const id = Number(detailMatch[2]);

      setActivePlayer(null);
      if (
        detailModalItemRef.current?.id === id &&
        detailModalItemRef.current.type === type
      ) {
        return;
      }

      const known = findKnownItem(id, type);
      if (known) {
        setDetailModalItem(known);
      } else {
        fetchMediaDetail(id, type).then((fetched) => {
          if (fetched && window.location.pathname === path) {
            setDetailModalItem(fetched);
          }
        });
      }
      return;
    }

    // 3. Category / standard routes
    setActivePlayer(null);
    setDetailModalItem(null);

    if (path === "/movies" || path === "/movie") {
      setCurrentCategory("movie");
    } else if (path === "/tv") {
      setCurrentCategory("tv");
    } else if (path === "/anime") {
      setCurrentCategory("anime");
    } else if (path === "/watchlist") {
      setCurrentCategory("watchlist");
    } else if (path === "/") {
      setCurrentCategory("all");
    }
  }, [location.pathname, findKnownItem]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleWatchlist = (id: number, item?: MediaItem) => {
    toggleWatchlist(id, item);
    setWatchlistIds(getWatchlistIds());
  };

  const handleSelectCategory = (cat: NavCategory) => {
    setCurrentCategory(cat);
    setSelectedGenre("All");
    setSearchQuery("");
    navigate(getCategoryPath(cat));
  };

  const handleOpenDetails = (item: MediaItem) => {
    const type =
      item.type === "movie" ? "movie" : item.type === "anime" ? "anime" : "tv";
    navigate(`/${type}/${item.id}`);
  };

  const handlePlayMedia = (
    item: MediaItem,
    season?: number,
    episode?: number,
  ) => {
    const isSeries =
      item.media_type === "tv" ||
      item.type === "tv" ||
      Boolean(item.seasons && item.seasons.length > 0) ||
      Boolean(item.seasons_count && item.seasons_count > 0);
    const s = isSeries ? (season ?? 1) : undefined;
    const e = isSeries ? (episode ?? 1) : undefined;
    saveWatchHistory(item, s, e);
    setDetailModalItem(null);
    if (isSeries) {
      navigate(`/watch/${item.type}/${item.id}/${s}/${e}`);
    } else {
      navigate(`/watch/${item.type}/${item.id}`);
    }
  };

  const handleNavigateEpisode = (newSeason: number, newEpisode: number) => {
    if (activePlayer) {
      saveWatchHistory(activePlayer.item, newSeason, newEpisode);
      navigate(
        `/watch/${activePlayer.item.type}/${activePlayer.item.id}/${newSeason}/${newEpisode}`,
      );
    }
  };

  const handleCloseModal = () => {
    setDetailModalItem(null);
    navigate(getCategoryPath(currentCategory), { replace: true });
  };

  const handleClosePlayer = () => {
    setActivePlayer(null);
    navigate(getCategoryPath(currentCategory), { replace: true });
  };

  return (
    <div
      className="min-h-screen text-zinc-100 flex flex-col selection:bg-rose-800 selection:text-white"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Top Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Glass Navbar */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={handleSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        watchlistCount={watchlistIds.length}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* ── Search Results ── */}
        {searchQuery.trim() ? (
          <div className="py-6">
            <MediaGrid
              title={`Search Results for "${searchQuery}"`}
              items={mediaList}
              onPlay={handlePlayMedia}
              onSelectItem={handleOpenDetails}
              watchlistIds={watchlistIds}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>
        ) : currentCategory === "watchlist" ? (
          /* ── Watchlist ── */
          <div className="py-6">
            {mediaList.length === 0 ? (
              <div
                className="py-16 flex flex-col items-center justify-center text-center px-4 rounded-2xl max-w-2xl mx-auto my-8"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "rgba(225,29,72,0.10)",
                    border: "1px solid rgba(225,29,72,0.20)",
                  }}
                >
                  <Bookmark
                    className="w-8 h-8"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Your Watchlist is empty
                </h3>
                <p className="text-zinc-400 text-sm max-w-sm mb-6">
                  Bookmark your favorite movies, series, and anime to build your
                  personal streaming library.
                </p>
                <button
                  onClick={() => handleSelectCategory("all")}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer text-white"
                  style={{
                    background: "var(--color-accent)",
                    boxShadow: "0 0 16px var(--color-accent-glow)",
                  }}
                >
                  Explore Trending Content
                </button>
              </div>
            ) : (
              <MediaGrid
                title="My Watchlist"
                icon={
                  <Bookmark
                    className="w-5 h-5 fill-current"
                    style={{ color: "var(--color-accent)" }}
                  />
                }
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={handleOpenDetails}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}
          </div>
        ) : (
          /* ── Standard Browsing ── */
          <>
            {/* Hero Carousel */}
            {categoryHeroItems.length > 0 && (
              <HeroBanner
                items={categoryHeroItems}
                onPlay={handlePlayMedia}
                onOpenDetails={handleOpenDetails}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Home shelves */}
            {currentCategory === "all" && (
              <div className="space-y-6">
                <ContinueWatchingRow
                  onPlay={handlePlayMedia}
                  onSelectItem={handleOpenDetails}
                />

                <MediaRow
                  title="Top 10 on VPlay This Week"
                  subtitle="Trending now — updated weekly"
                  icon={<Flame className="w-5 h-5 text-amber-400" />}
                  showRank={true}
                  items={top10List}
                  onPlay={handlePlayMedia}
                  onSelectItem={handleOpenDetails}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />

                <MediaRow
                  title="Trending Anime"
                  subtitle="Popular anime series and films"
                  icon={<Sparkles className="w-5 h-5 text-rose-400" />}
                  items={animeList}
                  onPlay={handlePlayMedia}
                  onSelectItem={handleOpenDetails}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => handleSelectCategory("anime")}
                />

                <MediaRow
                  title="Popular Movies"
                  subtitle="Blockbusters and acclaimed cinema"
                  icon={<Film className="w-5 h-5 text-purple-400" />}
                  items={moviesList}
                  onPlay={handlePlayMedia}
                  onSelectItem={handleOpenDetails}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => handleSelectCategory("movie")}
                />

                <MediaRow
                  title="Binge-Worthy TV Series"
                  subtitle="Top-rated dramas and thrillers"
                  icon={<Tv className="w-5 h-5 text-indigo-400" />}
                  items={tvList}
                  onPlay={handlePlayMedia}
                  onSelectItem={handleOpenDetails}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => handleSelectCategory("tv")}
                />

                <MediaRow
                  title="Sci-Fi & Multiverse Epics"
                  subtitle="Space voyages, parallel worlds, dystopian adventures"
                  icon={<Compass className="w-5 h-5 text-cyan-400" />}
                  items={sciFiList}
                  onPlay={handlePlayMedia}
                  onSelectItem={handleOpenDetails}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </div>
            )}

            {/* Category grids */}
            {currentCategory === "movie" && (
              <MediaGrid
                title="All Movies"
                icon={<Film className="w-5 h-5 text-purple-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={handleOpenDetails}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
                genres={currentGenres}
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
              />
            )}
            {currentCategory === "tv" && (
              <MediaGrid
                title="TV Series"
                icon={<Tv className="w-5 h-5 text-indigo-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={handleOpenDetails}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
                genres={currentGenres}
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
              />
            )}
            {currentCategory === "anime" && (
              <MediaGrid
                title="Anime Series & Movies"
                icon={<Sparkles className="w-5 h-5 text-rose-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={handleOpenDetails}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
                genres={currentGenres}
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
              />
            )}
          </>
        )}
      </main>

      {/* Detail Modal */}
      <MediaModal
        item={detailModalItem}
        onClose={handleCloseModal}
        onPlay={handlePlayMedia}
        isWatchlisted={
          detailModalItem ? watchlistIds.includes(detailModalItem.id) : false
        }
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Player Modal */}
      {activePlayer && (
        <VideoPlayerModal
          key={`${activePlayer.item.id}-${activePlayer.season ?? 0}-${activePlayer.episode ?? 0}`}
          item={activePlayer.item}
          season={activePlayer.season}
          episode={activePlayer.episode}
          onClose={handleClosePlayer}
          onNavigateEpisode={handleNavigateEpisode}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
