# VPlay - Modern Streaming Platform

> **Notice**: VPlay is an experimental media player interface built strictly for **entertainment and educational purposes only**. VPlay does not host, store, or distribute any media files. All streams and metadata are provided by third-party external services.

---

## Overview

**VPlay** is a streaming web application for Movies, TV Shows, and Anime, built with:
- **React 19** & **TypeScript**
- **Vite 8** & **Tailwind CSS v4**
- **HLS.js** for adaptive bitrate streaming and MP4 direct playback
- **Cloudflare Pages** for global, low-latency edge hosting
- **Cloudflare Worker / Pages Functions** as a secure gateway to your self-hosted **Vyla API** (`https://vyla.mintlify.app/introduction`)

---

## Features

- **Multi-Media Hub**: Dedicated navigation and filters for Movies, TV Series, and Anime.
- **Cinematic Spotlight**: Hero feature showcasing trending titles with ratings, genres, and instant playback.
- **Season & Episode Picker**: Detailed view for TV shows and Anime with episode overviews and quick launch.
- **Adaptive Stream Player**:
  - HLS.js + MP4 playback with automatic provider fallback queue.
  - Multi-provider stream switcher (`vidlink`, `vixsrc`, etc.).
  - Real-time Server-Sent Events (SSE) stream status monitor.
  - HLS quality selector (Auto, 1080p, 720p, 480p, etc.).
  - Multi-language subtitle tracks.
  - Keyboard shortcuts: `Space` (Play/Pause), `←`/`→` (±10s Seek), `F` (Fullscreen), `M` (Mute), `Esc` (Close).
- **Watchlist**: Save favorite titles to `localStorage`.
- **API & Health Diagnostic Tool**: Integrated settings modal to test provider latency and reachability (`/api/health`).

---

## Architecture: Cloudflare Pages + Worker + Self-Hosted Vyla

```
┌─────────────────────────┐          HTTPS / CORS          ┌───────────────────────────┐
│       VPlay UI          │ ─────────────────────────────> │     Cloudflare Worker     │
│   (Cloudflare Pages)    │                                │  (Reverse Proxy / Gateway)│
└─────────────────────────┘                                └─────────────┬─────────────┘
                                                                         │
                                                                 Private / Tunnel
                                                                         │
                                                                         ▼
                                                           ┌───────────────────────────┐
                                                           │     Self-Hosted Vyla      │
                                                           │   Node.js API + SQLite    │
                                                           │  (http://localhost:7860)  │
                                                           └───────────────────────────┘
```

### Why a Cloudflare Worker is used
1. **API Key Protection**: Your master `VYLA_API_KEY` is securely stored inside Cloudflare Worker Secrets (`wrangler secret put VYLA_API_KEY`) and is **never** exposed to browser network requests. The worker fetches short-lived session tokens via `POST /api/auth` automatically.
2. **CORS & Mixed Content**: Cloudflare Pages runs strictly over HTTPS (`https://*.pages.dev`). The worker terminates HTTPS and handles CORS (`Access-Control-Allow-Origin: *`), preventing browser mixed-content blocks when connecting to your self-hosted server.
3. **SSE & Stream Proxying**: The worker transparently streams Server-Sent Events for `/movie` and `/tv` and proxies video chunks (`/api?url=...`) without buffering.

---

## Quick Start

### 1. Run VPlay Frontend Locally

```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm run dev
```

Open `http://localhost:5173` in your browser.

---

### 2. Deploy Cloudflare Worker (Vyla API Gateway)

1. Open the `worker/` folder:
   ```bash
   cd worker
   npm install
   ```

2. Configure your self-hosted Vyla API URL in `worker/wrangler.jsonc`:
   ```jsonc
   "vars": {
     "VYLA_BACKEND_URL": "https://your-vyla-server.com" // or Cloudflare Tunnel
   }
   ```

3. Store your Vyla Master API Key (`standard` or `partner` tier):
   ```bash
   npx wrangler secret put VYLA_API_KEY
   ```

4. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```

5. Copy your deployed Worker URL (e.g. `https://vplay-vyla-proxy.<subdomain>.workers.dev`) and enter it in VPlay's **Settings (gear icon)** modal.

---

### 3. Deploy Frontend to Cloudflare Pages

1. Build the production bundle:
   ```bash
   pnpm run build
   ```
   The output is located in the `dist/` folder.

2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/):
   - Navigate to **Workers & Pages** → **Create application** → **Pages**.
   - Connect your Git repository or directly upload the `dist/` directory.
   - Build configuration:
     - **Framework preset**: `Vite`
     - **Build command**: `pnpm run build`
     - **Build output directory**: `dist`
   - Deploy!

---

## Entertainment Purpose Disclaimer

VPlay is developed exclusively for demonstration, educational, and entertainment purposes. It does not store or distribute copyrighted media files. Please ensure compliance with all applicable laws and regulations in your jurisdiction.
