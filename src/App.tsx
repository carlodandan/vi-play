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
} from './services/tmdbApi.ts';
import { Film, Tv, Sparkles, Bookmark, Flame, Compass } from 'lucide-react';

interface ActivePlayerState {
  item: MediaItem;
  season?: number;
  episode?: number;
}

export function App() {
  const [currentCategory, setCurrentCategory] = useState<NavCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [mediaList, setMediaList] = useState<MediaItem[]>(CURATED_MEDIA);
  const [watchlistIds, setWatchlistIds] = useState<number[]>(getWatchlistIds);
  const [detailModalItem, setDetailModalItem] = useState<MediaItem | null>(null);
  const [activePlayer, setActivePlayer] = useState<ActivePlayerState | null>(null);

  // Load media list based on current filters
  useEffect(() => {
    let isMounted = true;
    getMediaList({
      category: currentCategory,
      query: searchQuery,
      genre: selectedGenre,
    }).then((items) => {
      if (isMounted) setMediaList(items);
    });
    return () => {
      isMounted = false;
    };
  }, [currentCategory, searchQuery, selectedGenre]);

  // Featured hero media items (multi-item rotating carousel)
  const heroItems = useMemo(() => {
    if (currentCategory === 'anime') {
      const items = CURATED_MEDIA.filter((m) => m.type === 'anime');
      return items.length > 0 ? items : CURATED_MEDIA;
    }
    if (currentCategory === 'tv') {
      const items = CURATED_MEDIA.filter((m) => m.type === 'tv');
      return items.length > 0 ? items : CURATED_MEDIA;
    }
    if (currentCategory === 'movie') {
      const items = CURATED_MEDIA.filter((m) => m.type === 'movie');
      return items.length > 0 ? items : CURATED_MEDIA;
    }
    // 'all' category: Curated blockbuster hero carousel
    return CURATED_MEDIA.filter((m) => m.featured);
  }, [currentCategory]);

  // Segmented lists for "All" home page
  const animeList = useMemo(
    () => CURATED_MEDIA.filter((m) => m.type === 'anime'),
    []
  );
  const moviesList = useMemo(
    () => CURATED_MEDIA.filter((m) => m.type === 'movie'),
    []
  );
  const tvList = useMemo(
    () => CURATED_MEDIA.filter((m) => m.type === 'tv'),
    []
  );
  const top10List = useMemo(
    () =>
      [...CURATED_MEDIA]
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 10),
    []
  );
  const sciFiList = useMemo(
    () =>
      CURATED_MEDIA.filter((m) =>
        m.genres.some(
          (g) =>
            g.toLowerCase().includes('sci-fi') ||
            g.toLowerCase().includes('fantasy') ||
            g.toLowerCase().includes('supernatural')
        )
      ),
    []
  );

  // Available genres for current category
  const currentGenres = useMemo(() => {
    if (currentCategory === 'movie') return ['Action', 'Sci-Fi', 'Adventure', 'Drama', 'Thriller'];
    if (currentCategory === 'anime') return ['Action', 'Dark Fantasy', 'Animation', 'Supernatural', 'Romance'];
    if (currentCategory === 'tv') return ['Drama', 'Crime', 'Sci-Fi & Fantasy', 'Mystery'];
    return [];
  }, [currentCategory]);

  // Watchlist toggle handler
  const handleToggleWatchlist = (id: number) => {
    toggleWatchlist(id);
    setWatchlistIds(getWatchlistIds());
  };

  // Launch Player
  const handlePlayMedia = (item: MediaItem, season?: number, episode?: number) => {
    setDetailModalItem(null);
    saveWatchHistory(item, season, episode);
    setActivePlayer({ item, season, episode });
  };

  // Switch episode from player modal
  const handleNavigateEpisode = (newSeason: number, newEpisode: number) => {
    if (activePlayer) {
      setActivePlayer({
        ...activePlayer,
        season: newSeason,
        episode: newEpisode,
      });
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

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Search Results Mode */}
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
          /* Watchlist Mode */
          <div className="py-6">
            {mediaList.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/60 max-w-2xl mx-auto my-8">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-950/40">
                  <Bookmark className="w-8 h-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Your Watchlist is empty
                </h3>
                <p className="text-zinc-400 text-sm max-w-sm mb-6">
                  Bookmark your favorite movies, series, and anime to build your personal streaming library.
                </p>
                <button
                  onClick={() => setCurrentCategory('all')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  Explore Trending Content
                </button>
              </div>
            ) : (
              <MediaGrid
                title="My Watchlist"
                icon={<Bookmark className="w-5 h-5 fill-current text-purple-400" />}
                items={mediaList}
                onPlay={handlePlayMedia}
                onSelectItem={setDetailModalItem}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}
          </div>
        ) : (
          /* Standard Browsing Mode */
          <>
            {/* Hero Carousel Spotlight */}
            {heroItems.length > 0 && (
              <HeroBanner
                items={heroItems}
                onPlay={handlePlayMedia}
                onOpenDetails={setDetailModalItem}
                watchlistIds={watchlistIds}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Category: All (Homepage with Rich Shelves & Continue Watching) */}
            {currentCategory === 'all' && (
              <div className="space-y-6">
                {/* Continue Watching Row */}
                <ContinueWatchingRow
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                />

                {/* Top 10 on VPlay Today (Numbered Netflix-Style Row) */}
                <MediaRow
                  title="Top 10 on VPlay Today"
                  subtitle="Most watched movies, shows, and anime in the last 24h"
                  icon={<Flame className="w-5 h-5 text-amber-400" />}
                  showRank={true}
                  items={top10List}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />

                {/* Trending Anime Shelf */}
                <MediaRow
                  title="Trending Anime"
                  subtitle="Action-packed shonen and fantasy hits"
                  icon={<Sparkles className="w-5 h-5 text-rose-400" />}
                  items={animeList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                  onSeeAll={() => setCurrentCategory('anime')}
                />

                {/* Popular Movies Shelf */}
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

                {/* Binge-Worthy TV Series Shelf */}
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

                {/* Sci-Fi & Mind-Benders Shelf */}
                <MediaRow
                  title="Sci-Fi & Multiverse Epics"
                  subtitle="Space voyages, parallel worlds, and dystopian adventures"
                  icon={<Compass className="w-5 h-5 text-cyan-400" />}
                  items={sciFiList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              </div>
            )}

            {/* Category: Movies */}
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

            {/* Category: TV Shows */}
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

            {/* Category: Anime */}
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

      {/* Media Details Modal */}
      <MediaModal
        item={detailModalItem}
        onClose={() => setDetailModalItem(null)}
        onPlay={handlePlayMedia}
        isWatchlisted={detailModalItem ? watchlistIds.includes(detailModalItem.id) : false}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Video Player Modal (Theater Mode) */}
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

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
