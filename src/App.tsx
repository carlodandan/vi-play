import { useEffect, useState, useMemo } from 'react';
import { DisclaimerBanner } from './components/DisclaimerBanner.tsx';
import { Navbar, type NavCategory } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { MediaRow } from './components/MediaRow.tsx';
import { ContinueWatchingRow } from './components/ContinueWatchingRow.tsx';
import { saveWatchHistory } from './services/watchHistory.ts';
import { MediaGrid } from './components/MediaGrid.tsx';
import { MediaModal } from './components/MediaModal.tsx';
import { VideoPlayerModal } from './components/VideoPlayerModal.tsx';
import { Footer } from './components/Footer.tsx';
import type { MediaItem } from './types/media.ts';
import { CURATED_MEDIA } from './data/curatedMedia.ts';
import {
  getMediaList,
  getWatchlistIds,
  toggleWatchlist,
  fetchShelf,
} from './services/tmdbApi.ts';
import { Film, Tv, Sparkles, Bookmark, Flame, Compass } from 'lucide-react';

interface ActivePlayerState {
  item: MediaItem;
  season?: number;
  episode?: number;
}

// ── Initial curated fallback shelves (shown instantly before live data loads) ──
const CURATED_TOP10 = [...CURATED_MEDIA]
  .sort((a, b) => b.vote_average - a.vote_average)
  .slice(0, 10);
const CURATED_ANIME = CURATED_MEDIA.filter((m) => m.type === 'anime');
const CURATED_MOVIES = CURATED_MEDIA.filter((m) => m.type === 'movie');
const CURATED_TV = CURATED_MEDIA.filter((m) => m.type === 'tv');
const CURATED_SCIFI = CURATED_MEDIA.filter((m) =>
  m.genres.some((g) =>
    g.toLowerCase().includes('sci-fi') ||
    g.toLowerCase().includes('fantasy') ||
    g.toLowerCase().includes('supernatural')
  )
);
const CURATED_FEATURED = CURATED_MEDIA.filter((m) => m.featured);

export function App() {
  const [currentCategory, setCurrentCategory] = useState<NavCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [mediaList, setMediaList] = useState<MediaItem[]>(CURATED_MEDIA);
  const [watchlistIds, setWatchlistIds] = useState<number[]>(getWatchlistIds);
  const [detailModalItem, setDetailModalItem] = useState<MediaItem | null>(null);
  const [activePlayer, setActivePlayer] = useState<ActivePlayerState | null>(null);

  // Live shelves — start with curated fallback, replace with live data
  const [top10List, setTop10List] = useState<MediaItem[]>(CURATED_TOP10);
  const [animeList, setAnimeList] = useState<MediaItem[]>(CURATED_ANIME);
  const [moviesList, setMoviesList] = useState<MediaItem[]>(CURATED_MOVIES);
  const [tvList, setTvList] = useState<MediaItem[]>(CURATED_TV);
  const [sciFiList, setSciFiList] = useState<MediaItem[]>(CURATED_SCIFI);
  const [heroItems, setHeroItems] = useState<MediaItem[]>(CURATED_FEATURED);

  // ── Load category/search media grid ────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    getMediaList({
      category: currentCategory,
      query: searchQuery,
      genre: selectedGenre,
    }).then((items) => {
      if (isMounted) setMediaList(items);
    });
    return () => { isMounted = false; };
  }, [currentCategory, searchQuery, selectedGenre]);

  // ── Load live home shelves in parallel ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    // Fetch all shelves concurrently
    Promise.allSettled([
      fetchShelf('trending', 'all', 10),   // top 10 trending
      fetchShelf('popular', 'anime', 20),  // anime
      fetchShelf('popular', 'movie', 20),  // movies
      fetchShelf('popular', 'tv', 20),     // tv
    ]).then(([trendingRes, animeRes, movieRes, tvRes]) => {
      if (!isMounted) return;

      const trending = trendingRes.status === 'fulfilled' ? trendingRes.value : [];
      const anime    = animeRes.status === 'fulfilled'    ? animeRes.value    : [];
      const movies   = movieRes.status === 'fulfilled'    ? movieRes.value    : [];
      const tv       = tvRes.status === 'fulfilled'       ? tvRes.value       : [];

      if (trending.length > 0) {
        setTop10List(trending.slice(0, 10));
        // Hero = high-rated items with backdrops from trending
        const heroable = trending.filter((m) => m.vote_average >= 7.0 && m.backdrop_path);
        setHeroItems(heroable.length >= 3 ? heroable.slice(0, 8) : CURATED_FEATURED);
      }
      if (anime.length > 0)  setAnimeList(anime);
      if (movies.length > 0) setMoviesList(movies);
      if (tv.length > 0) {
        setTvList(tv);
        // Sci-Fi shelf: filter live tv for sci-fi genres
        const sf = [...movies, ...tv].filter((m) =>
          m.genres.some((g) =>
            g.toLowerCase().includes('sci-fi') ||
            g.toLowerCase().includes('fantasy') ||
            g.toLowerCase().includes('supernatural') ||
            g.toLowerCase().includes('science fiction')
          )
        );
        if (sf.length > 0) setSciFiList(sf);
      }
    });

    return () => { isMounted = false; };
  }, []); // run once on mount

  // ── Update hero when category changes ──────────────────────────────────────
  const categoryHeroItems = useMemo(() => {
    if (currentCategory === 'anime')   return animeList.filter((m) => m.backdrop_path).slice(0, 8);
    if (currentCategory === 'tv')      return tvList.filter((m) => m.backdrop_path).slice(0, 8);
    if (currentCategory === 'movie')   return moviesList.filter((m) => m.backdrop_path).slice(0, 8);
    return heroItems;
  }, [currentCategory, animeList, tvList, moviesList, heroItems]);

  // ── Genre options per category ──────────────────────────────────────────────
  const currentGenres = useMemo(() => {
    if (currentCategory === 'movie')  return ['Action', 'Sci-Fi', 'Adventure', 'Drama', 'Thriller', 'Comedy', 'Horror', 'Romance'];
    if (currentCategory === 'anime')  return ['Action', 'Fantasy', 'Animation', 'Supernatural', 'Romance', 'Comedy'];
    if (currentCategory === 'tv')     return ['Drama', 'Crime', 'Sci-Fi & Fantasy', 'Mystery', 'Action & Adventure', 'Comedy'];
    return [];
  }, [currentCategory]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleWatchlist = (id: number) => {
    toggleWatchlist(id);
    setWatchlistIds(getWatchlistIds());
  };

  const handlePlayMedia = (item: MediaItem, season?: number, episode?: number) => {
    setDetailModalItem(null);
    saveWatchHistory(item, season, episode);
    setActivePlayer({ item, season, episode });
  };

  const handleNavigateEpisode = (newSeason: number, newEpisode: number) => {
    if (activePlayer) {
      setActivePlayer({ ...activePlayer, season: newSeason, episode: newEpisode });
    }
  };

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col selection:bg-rose-800 selection:text-white" style={{ background: 'var(--color-bg)' }}>
      {/* Top Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Glass Navbar */}
      <Navbar
        currentCategory={currentCategory}
        onSelectCategory={(cat) => {
          setCurrentCategory(cat);
          setSelectedGenre('All');
        }}
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
              onSelectItem={setDetailModalItem}
              watchlistIds={watchlistIds}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>
        ) : currentCategory === 'watchlist' ? (
          /* ── Watchlist ── */
          <div className="py-6">
            {mediaList.length === 0 ? (
              <div
                className="py-16 flex flex-col items-center justify-center text-center px-4 rounded-2xl max-w-2xl mx-auto my-8"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(225,29,72,0.10)', border: '1px solid rgba(225,29,72,0.20)' }}
                >
                  <Bookmark className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Your Watchlist is empty</h3>
                <p className="text-zinc-400 text-sm max-w-sm mb-6">
                  Bookmark your favorite movies, series, and anime to build your personal streaming library.
                </p>
                <button
                  onClick={() => setCurrentCategory('all')}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer text-white"
                  style={{ background: 'var(--color-accent)', boxShadow: '0 0 16px var(--color-accent-glow)' }}
                >
                  Explore Trending Content
                </button>
              </div>
            ) : (
              <MediaGrid
                title="My Watchlist"
                icon={<Bookmark className="w-5 h-5 fill-current" style={{ color: 'var(--color-accent)' }} />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={setDetailModalItem}
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
                onOpenDetails={setDetailModalItem}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Home shelves */}
            {currentCategory === 'all' && (
              <div className="space-y-6">
                <ContinueWatchingRow onPlay={handlePlayMedia} onSelectItem={setDetailModalItem} />

                <MediaRow
                  title="Top 10 on VPlay Today"
                  subtitle="Trending now — updated weekly"
                  icon={<Flame className="w-5 h-5 text-amber-400" />}
                  showRank={true}
                  items={top10List}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />

                <MediaRow
                  title="Trending Anime"
                  subtitle="Popular anime series and films"
                  icon={<Sparkles className="w-5 h-5 text-rose-400" />}
                  items={animeList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => setCurrentCategory('anime')}
                />

                <MediaRow
                  title="Popular Movies"
                  subtitle="Blockbusters and acclaimed cinema"
                  icon={<Film className="w-5 h-5 text-purple-400" />}
                  items={moviesList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => setCurrentCategory('movie')}
                />

                <MediaRow
                  title="Binge-Worthy TV Series"
                  subtitle="Top-rated dramas and thrillers"
                  icon={<Tv className="w-5 h-5 text-indigo-400" />}
                  items={tvList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => setCurrentCategory('tv')}
                />

                <MediaRow
                  title="Sci-Fi & Multiverse Epics"
                  subtitle="Space voyages, parallel worlds, dystopian adventures"
                  icon={<Compass className="w-5 h-5 text-cyan-400" />}
                  items={sciFiList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </div>
            )}

            {/* Category grids */}
            {currentCategory === 'movie' && (
              <MediaGrid
                title="All Movies"
                icon={<Film className="w-5 h-5 text-purple-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={setDetailModalItem}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
                genres={currentGenres}
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
              />
            )}
            {currentCategory === 'tv' && (
              <MediaGrid
                title="TV Series"
                icon={<Tv className="w-5 h-5 text-indigo-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={setDetailModalItem}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
                genres={currentGenres}
                selectedGenre={selectedGenre}
                onSelectGenre={setSelectedGenre}
              />
            )}
            {currentCategory === 'anime' && (
              <MediaGrid
                title="Anime Series & Movies"
                icon={<Sparkles className="w-5 h-5 text-rose-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={setDetailModalItem}
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
        onClose={() => setDetailModalItem(null)}
        onPlay={handlePlayMedia}
        isWatchlisted={detailModalItem ? watchlistIds.includes(detailModalItem.id) : false}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Player Modal */}
      {activePlayer && (
        <VideoPlayerModal
          key={`${activePlayer.item.id}-${activePlayer.season ?? 0}-${activePlayer.episode ?? 0}`}
          item={activePlayer.item}
          season={activePlayer.season}
          episode={activePlayer.episode}
          onClose={() => setActivePlayer(null)}
          onNavigateEpisode={handleNavigateEpisode}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
