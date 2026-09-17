# VPlay - Modern Streaming Platform

> **Notice**: VPlay is an experimental media player interface built strictly for **entertainment and educational purposes only**. VPlay does not host, store, or distribute any media files. All streams and metadata are provided by third-party external services.

---

## Overview

**VPlay** is a media streaming application for Movies, TV Shows, and Anime, built with:
- **React 19** & **TypeScript**
- **Vite 8** & **Tailwind CSS v4**
- **HLS.js** for adaptive bitrate streaming and direct MP4 playback
- **Cloudflare Pages** for global edge hosting
- **Cloudflare Worker (Private Service Binding)**: Secure, non-public gateway to your self-hosted **Vyla API** (`https://vyla.mintlify.app/introduction`)

---

## Architecture: Cloudflare Pages & Private Worker Binding

The Cloudflare Worker is **not publicly accessible** (`workers_dev = false`). It has no public URL or domain. Instead, **Cloudflare Pages binds directly to the Worker via Service Binding**.

```
┌─────────────────────────┐     Same-Origin Relative Call      ┌───────────────────────────┐
│     VPlay Frontend      │ ─────────────────────────────────> │  Cloudflare Pages Routing │
│   (Cloudflare Pages)    │       (/movie, /tv, /api/*)        │   (functions/[[path]].ts) │
└─────────────────────────┘                                    └─────────────┬─────────────┘
                                                                             │
                                                                   Private Service Binding
                                                                   (env.VYLA_WORKER.fetch)
                                                                             │
                                                                             ▼
                                                               ┌───────────────────────────┐
                                                               │  Private Worker Gateway   │
                                                               │   (workers_dev = false)   │
                                                               └─────────────┬─────────────┘
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

### How Environments Work

- **Local Development**:
  - Hardcoded to `http://127.0.0.1:8787` (the worker running via `wrangler dev`) or proxied via Vite dev server (`http://localhost:5173`).
  - The local worker connects to your self-hosted Vyla API running on port `7860`.
- **Production (Cloudflare Pages)**:
  - Frontend makes same-origin requests (`/movie`, `/tv`, `/api/*`).
  - Cloudflare Pages Functions delegates incoming API requests to the private `VYLA_WORKER` Service Binding.
  - Zero hardcoded URLs in frontend code.
  - The worker is private (`workers_dev = false`) and inaccessible from the public internet.

---

## Deployment Steps

### 1. Deploy the Private Cloudflare Worker

```bash
cd worker
npm install

# Store your Vyla master API key as a secret
npx wrangler secret put VYLA_API_KEY

# Deploy private worker (workers_dev = false)
npx wrangler deploy
```

### 2. Deploy Cloudflare Pages

Root `wrangler.toml` is pre-configured with the Service Binding:

```toml
name = "vplay"
pages_build_output_dir = "dist"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[[services]]
binding = "VYLA_WORKER"
service = "vplay-vyla-proxy"
```

Build and deploy:
```bash
# Build the production bundle
pnpm run build

# Deploy via Wrangler or link repository in Cloudflare Dashboard
npx wrangler pages deploy dist
```

In the Cloudflare Dashboard, ensure the Pages project has the Service Binding configured under:
**Settings** → **Functions** → **Service Bindings** → `VYLA_WORKER` → `vplay-vyla-proxy`.

## Local Development Workflow
 
1. **Start your self-hosted Vyla API**:
   ```bash
   # Starts Vyla API on http://localhost:7860
   node server.js
   ```

2. **Start the local Cloudflare Worker**:
   ```bash
   cd worker
   npm run dev # Starts on http://127.0.0.1:8787
   ```

3. **Start VPlay Frontend**:
   ```bash
   pnpm dev # Starts on http://localhost:5173
   ```

VPlay will automatically connect to `http://127.0.0.1:8787` in local development mode.
