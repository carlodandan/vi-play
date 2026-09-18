import { useState } from "react";
import {
  Film,
  Tv,
  Sparkles,
  Bookmark,
  Search,
  Play,
  X,
  Menu,
} from "lucide-react";
import type { MediaType } from "../types/media.ts";

export type NavCategory = "all" | MediaType | "watchlist";

interface NavbarProps {
  currentCategory: NavCategory;
  onSelectCategory: (cat: NavCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  watchlistCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  watchlistCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const categories: {
    id: NavCategory;
    label: string;
    href: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "all",
      label: "Home",
      href: "/",
      icon: <Play className="w-3.5 h-3.5 fill-current" />,
    },
    {
      id: "movie",
      label: "Movies",
      href: "/movies",
      icon: <Film className="w-3.5 h-3.5" />,
    },
    {
      id: "tv",
      label: "TV Shows",
      href: "/tv",
      icon: <Tv className="w-3.5 h-3.5" />,
    },
    {
      id: "anime",
      label: "Anime",
      href: "/anime",
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    {
      id: "watchlist",
      label: `Watchlist${watchlistCount > 0 ? ` (${watchlistCount})` : ""}`,
      href: "/watchlist",
      icon: <Bookmark className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 transition-colors">
      {/* Glass bar */}
      <div
        className="border-b border-white/[0.05]"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "var(--blur-glass)",
          WebkitBackdropFilter: "var(--blur-glass)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <a
              href="/"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onSelectCategory("all");
                  onSearchChange("");
                }
              }}
              className="flex items-center gap-2.5 group cursor-pointer no-underline text-inherit"
            >
              {/* Cinematic V mark — red square with play triangle */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all group-hover:scale-105"
                style={{
                  background: "var(--color-accent)",
                  boxShadow: "0 0 16px var(--color-accent-glow)",
                }}
              >
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Vi-<span style={{ color: "var(--color-accent)" }}>Play</span>
              </span>
            </a>

            {/* Desktop Category Navigation */}
            <nav
              className="hidden md:flex items-center gap-0.5"
              aria-label="Main Navigation"
            >
              {categories.map((cat) => {
                const active = currentCategory === cat.id && !searchQuery;
                return (
                  <a
                    key={cat.id}
                    href={cat.href}
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault();
                        onSelectCategory(cat.id);
                        onSearchChange("");
                      }
                    }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer no-underline ${
                      active
                        ? "text-white"
                        : "text-zinc-400 hover:text-zinc-100"
                    }`}
                    style={active ? { background: "rgba(225,29,72,0.12)" } : {}}
                  >
                    {/* Red underline indicator for active state */}
                    {active && (
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                        style={{ background: "var(--color-accent)" }}
                      />
                    )}
                    {cat.icon}
                    {cat.label}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Right: Search + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className={`relative transition-all duration-300 ${searchFocused ? "w-44 min-[400px]:w-56 sm:w-72" : "w-32 min-[400px]:w-44 sm:w-56"}`}
            >
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search movies, anime..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full text-sm text-zinc-200 placeholder-zinc-500 pl-9 pr-8 py-2 rounded-full border transition-all outline-none"
                style={{
                  background: "rgba(15,15,35,0.8)",
                  backdropFilter: "blur(8px)",
                  borderColor: searchFocused
                    ? "var(--color-accent)"
                    : "rgba(255,255,255,0.08)",
                  boxShadow: searchFocused
                    ? "0 0 0 1px var(--color-accent)"
                    : "none",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg border border-white/[0.06] cursor-pointer transition-colors"
              style={{ background: "rgba(15,15,35,0.8)" }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden px-4 pt-3 pb-4 border-b border-white/[0.05] space-y-1 animate-slideUp"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "var(--blur-glass)",
          }}
        >
          {categories.map((cat) => {
            const active = currentCategory === cat.id && !searchQuery;
            return (
              <a
                key={cat.id}
                href={cat.href}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    onSelectCategory(cat.id);
                    onSearchChange("");
                    setMobileMenuOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer no-underline ${
                  active ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
                style={
                  active
                    ? {
                        background: "rgba(225,29,72,0.15)",
                        borderLeft: "2px solid var(--color-accent)",
                      }
                    : {}
                }
              >
                {cat.icon}
                {cat.label}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
};
