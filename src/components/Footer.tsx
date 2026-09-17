import { Play, ShieldAlert, Cloud, Radio, Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md pt-12 pb-8 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top brand & disclaimer box */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Disclaimer &amp; Entertainment Use Only</span>
          </div>
          <p className="text-zinc-300 leading-relaxed text-xs">
            <strong>VPlay</strong> is an open-source demonstration application built exclusively for{' '}
            <strong className="text-white">entertainment and educational purposes</strong>. VPlay does
            not host, stream, scrape, upload, or store media files on its servers. All metadata and stream
            indices are provided by third-party external providers via your self-hosted Vyla API gateway.
            Users are responsible for ensuring compliance with all applicable local copyright and licensing
            regulations in their jurisdiction.
          </p>
        </div>

        {/* Middle row: Brand & Architecture */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <span className="font-bold text-white text-base">
              V<span className="text-purple-400">Play</span>
            </span>
            <span className="text-zinc-600 text-xs">|</span>
            <span className="text-zinc-500">Movies • TV Shows • Anime</span>
          </div>

          {/* Cloudflare & Architecture Tags */}
          <div className="flex flex-wrap items-center gap-2 text-zinc-500 text-[11px]">
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
              <Cloud className="w-3 h-3 text-orange-400" />
              Cloudflare Pages
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
              <Code2 className="w-3 h-3 text-amber-400" />
              Cloudflare Worker Gateway
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
              <Radio className="w-3 h-3 text-purple-400" />
              Vyla HLS Engine
            </span>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="text-center text-zinc-600 text-[11px] pt-4">
          <p>© {new Date().getFullYear()} VPlay. For Entertainment Purposes Only. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};
