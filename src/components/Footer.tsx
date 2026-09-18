import { Play, ShieldAlert, Cloud, Radio, Code2 } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer
      className="mt-20 pt-12 pb-8 text-xs"
      style={{
        borderTop: "1px solid rgba(225,29,72,0.15)",
        background:
          "linear-gradient(to bottom, rgba(15,15,35,0.60) 0%, rgba(0,0,0,0.95) 100%)",
        backdropFilter: "blur(12px)",
        color: "#71717a",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Disclaimer card */}
        <div
          className="p-6 rounded-2xl space-y-3"
          style={{
            background: "rgba(225,29,72,0.05)",
            border: "1px solid rgba(225,29,72,0.12)",
          }}
        >
          <div
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "#fda4af" }}
          >
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            <span>Disclaimer & Entertainment Use Only</span>
          </div>
          <p className="text-zinc-400 leading-relaxed text-xs">
            <strong className="text-zinc-200">V-Play</strong> is an open-source
            demonstration application built exclusively for{" "}
            <strong className="text-white">
              entertainment and educational purposes
            </strong>
            . V-Play does not host, stream, scrape, upload, or store media files
            on its servers. All metadata and stream indices are provided by
            third-party external providers via your self-hosted Vyla API
            gateway. Users are responsible for ensuring compliance with all
            applicable local copyright and licensing regulations in their
            jurisdiction.
          </p>
        </div>

        {/* Brand row */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ background: "var(--color-accent)" }}
            >
              <Play
                className="w-3.5 h-3.5 fill-current ml-0.5"
                aria-hidden="true"
              />
            </div>
            <span className="font-bold text-white text-base">
              V-<span style={{ color: "var(--color-accent)" }}>Play</span>
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500">Movies · TV Shows · Anime</span>
          </div>

          {/* Stack badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Cloud className="w-3 h-3 text-orange-400" aria-hidden="true" />
              Cloudflare Pages
            </span>
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Code2 className="w-3 h-3 text-amber-400" aria-hidden="true" />
              Worker Gateway
            </span>
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Radio
                className="w-3 h-3"
                style={{ color: "var(--color-accent)" }}
                aria-hidden="true"
              />
              Vyla HLS Engine
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-zinc-700 text-[11px] pt-2">
          <p>
            © {new Date().getFullYear()} V-Play · For Entertainment Purposes
            Only · All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
};
