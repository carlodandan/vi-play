import { useState } from 'react';
import { Film, Tv, Sparkles, Bookmark, Search, Settings, Play, X, Menu } from 'lucide-react';
import type { MediaType } from '../types/media.ts';

export type NavCategory = 'all' | MediaType | 'watchlist';

interface NavbarProps {
  currentCategory: NavCategory;
  onSelectCategory: (cat: NavCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  watchlistCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onOpenSettings,
  watchlistCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories: { id: NavCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Home', icon: <Play className="w-3.5 h-3.5 fill-current" /> },
    { id: 'movie', label: 'Movies', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'tv', label: 'TV Shows', icon: <Tv className="w-3.5 h-3.5" /> },
    { id: 'anime', label: 'Anime', icon: <Sparkles className="w-3.5 h-3.5" /> },
    {
      id: 'watchlist',
      label: `Watchlist${watchlistCount > 0 ? ` (${watchlistCount})` : ''}`,
      icon: <Bookmark className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              onSelectCategory('all');
              onSearchChange('');
            }}
            className="flex items-center gap-2 group cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-400 p-[1px] shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Play className="w-4 h-4 text-purple-400 fill-purple-400 group-hover:scale-110 transition-transform ml-0.5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center">
                V<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Play</span>
              </span>
            </div>
          </button>

          {/* Desktop Category Navigation */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {categories.map((cat) => {
              const active = currentCategory === cat.id && !searchQuery;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onSearchChange('');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right side: Search & Settings */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-44 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search movies, anime, series..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-900/90 text-sm text-zinc-200 placeholder-zinc-500 pl-9 pr-8 py-1.5 rounded-full border border-zinc-800 focus:outline-none focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-purple-300 hover:bg-zinc-900 rounded-lg border border-zinc-800 hover:border-purple-500/30 transition-all cursor-pointer"
            title="Settings (Vyla API Gateway / Worker)"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg border border-zinc-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 border-t border-zinc-800 bg-zinc-950/95 space-y-1">
          {categories.map((cat) => {
            const active = currentCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onSearchChange('');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
