import { useEffect, useState, useMemo } from 'react';
import { DisclaimerBanner } from './components/DisclaimerBanner.tsx';
import { Navbar, type NavCategory } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
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
import { Film, Tv, Sparkles, Bookmark } from 'lucide-react';

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

  // Featured hero media item based on current category
  const featuredItem = useMemo(() => {
    if (currentCategory === 'anime') {
      return CURATED_MEDIA.find((m) => m.type === 'anime' && m.featured) || CURATED_MEDIA[2];
    }
    if (currentCategory === 'tv') {
      return CURATED_MEDIA.find((m) => m.type === 'tv' && m.featured) || CURATED_MEDIA[6];
    }
    if (currentCategory === 'movie') {
      return CURATED_MEDIA.find((m) => m.type === 'movie' && m.featured) || CURATED_MEDIA[0];
    }
    return CURATED_MEDIA[0]; // Dune: Part Two or Attack on Titan
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
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-purple-600 selection:text-white">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
            <MediaGrid
              title="My Watchlist"
              icon={<Bookmark className="w-5 h-5 fill-current" />}
              items={mediaList}
              onPlay={handlePlayMedia}
              onSelectItem={setDetailModalItem}
              watchlistIds={watchlistIds}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>
        ) : (
          /* Standard Browsing Mode */
          <>
            {/* Hero Spotlight */}
            {featuredItem && (
              <HeroBanner
                item={featuredItem}
                onPlay={handlePlayMedia}
                onOpenDetails={setDetailModalItem}
                isWatchlisted={watchlistIds.includes(featuredItem.id)}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Category: All (Home page with multiple shelves) */}
            {currentCategory === 'all' && (
              <div className="space-y-4">
                <MediaGrid
                  title="Trending Anime"
                  icon={<Sparkles className="w-5 h-5 text-rose-400" />}
                  items={animeList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />

                <MediaGrid
                  title="Popular Movies"
                  icon={<Film className="w-5 h-5 text-purple-400" />}
                  items={moviesList}
                  onPlay={handlePlayMedia}
                  onSelectItem={setDetailModalItem}
                  watchlistIds={watchlistIds}
                  onToggleWatchlist={handleToggleWatchlist}
                />

                <MediaGrid
                  title="Top Rated TV Series"
                  icon={<Tv className="w-5 h-5 text-indigo-400" />}
                  items={tvList}
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
