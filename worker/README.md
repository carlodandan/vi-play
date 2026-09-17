# VPlay Private Cloudflare Worker (Vyla Streaming Backend)

This worker is a **self-contained private streaming backend** powered directly by `@vyla-entertainment/sdk` and bound to **Cloudflare Pages**.

> **Notice**: For entertainment and educational purposes only.

---

## Features

- **Self-Contained**: Executes stream scrapers across 48+ providers directly inside Cloudflare Workers without requiring an external Node.js server or SQLite database.
- **Server-Sent Events (SSE)**: Streams real-time progressive sources and subtitle tracks for `/movie` and `/tv`.
- **Private Service Binding**: Configured with `workers_dev: false` — never exposed publicly on the internet; invoked securely by Cloudflare Pages via `env.VYLA_WORKER`.
- **HLS & MP4 Proxy**: Built-in CORS handling and playlist URI rewriting (`/api?url=...`).

---

## Configuration

### Environment Variables & Secrets
Set your TMDB API Key in secrets (or `.dev.vars` for local dev):
```bash
npx wrangler secret put TMDB_API_KEY
```

### Local Development
Run wrangler dev on port `8787`:
```bash
pnpm run dev
# or: npx wrangler dev --port 8787
```

### Production Deployment
```bash
npx wrangler deploy
```

Once deployed, Cloudflare Pages calls this worker internally via the `[[services]]` binding in the root `wrangler.toml`:
```toml
[[services]]
binding = "VYLA_WORKER"
service = "vplay-vyla-proxy"
```
No worker URLs are hardcoded in the frontend.

