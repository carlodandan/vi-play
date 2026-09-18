# VPlay Private Streaming Worker (`vplay-vyla-proxy`)

The private Cloudflare Worker backend for VPlay, powered by the self-contained `@vyla-entertainment/sdk` and TMDB discovery proxies.

> **Notice**: For educational and entertainment purposes only. Does not store or host any media files.

---

## Features

- **Self-Contained Streaming Backend**: Runs multi-provider video scraping directly within `workerd` (Cloudflare Workers) across 48+ sources without an external VPS or Node.js server.
- **Server-Sent Events (SSE)**: Streams real-time progressive sources and subtitle tracks for `/movie` and `/tv`.
- **Live TMDB Discovery Engine**: Proxies trending, popular, multi-search, and details queries directly to TMDB with Japanese anime filtering.
- **Edge Caching & Performance**: Integrates Cloudflare CDN caching (`cf: { cacheTtl, cacheEverything }`) and standard `Cache-Control` headers for sub-10ms repeat queries.
- **Abuse Protection**: Sliding-window IP rate limiter (60 discovery req/min, 15 streams/min) and stateless cryptographic HMAC session token signing.
- **Private Service Binding**: Deployed with `workers_dev: false` — never exposed publicly on the internet; invoked securely by Cloudflare Pages Functions via `env.VYLA_WORKER`.
- **HLS / MP4 Stream Proxy**: Handles CORS stripping, playlist URI rewriting, and segment piping (`/api?url=...`).

---

## Package Management

The worker uses **pnpm** (specifically pinned to `pnpm@10.11.1` to match Cloudflare's build environment).

```bash
cd worker
pnpm install
```

> **Note**: The `@vyla-entertainment/sdk` is automatically patched on install using pnpm's native `patchedDependencies` feature configured in `worker/pnpm-workspace.yaml` (`patches/@vyla-entertainment__sdk.patch`). This resolves runtime timer restrictions in the Cloudflare Workers `workerd` environment.

---

## Configuration & Secrets

Set your TMDB API Key in secrets (or `.dev.vars` for local dev):

```bash
# In production
npx wrangler secret put TMDB_API_KEY

# Optional session secret (fallback defaults to internal edge salt)
npx wrangler secret put SESSION_SECRET
```

For local testing, place variables in `worker/.dev.vars`:
```ini
TMDB_API_KEY=b7a308c99dc64382f38b48c737424b75
```

---

## Local Development
 
Run the worker locally on port `8787`:
 
```bash
cd worker
pnpm dev
```
 
The worker starts at `http://127.0.0.1:8787`. The VPlay Vite frontend automatically connects to this port in development mode.
 
---
 
## Deployment
 
Deploy directly to your Cloudflare account:
 
```bash
cd worker
pnpm run deploy
```

The worker deploys with `workers_dev = false`. Cloudflare Pages connects to it through the Service Binding configured in the root `wrangler.toml`:

```toml
[[services]]
binding = "VYLA_WORKER"
service = "vplay-vyla-proxy"
```
