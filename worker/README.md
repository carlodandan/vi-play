# VPlay Cloudflare Worker (Vyla API Gateway)

This worker serves as the secure reverse proxy between your **VPlay** frontend (on Cloudflare Pages) and your self-hosted **Vyla API** server.

> **Notice**: For entertainment and educational purposes only.

---

## Why this Worker is required

1. **Security**: Your master `VYLA_API_KEY` is securely stored as a Cloudflare Worker secret and is **never** sent to the client browser. The worker obtains and refreshes session tokens directly.
2. **CORS & Mixed Content**: Cloudflare Pages runs on HTTPS. The worker provides full CORS support and HTTPS termination when your self-hosted instance is behind Cloudflare Tunnel, a VPS, or a reverse proxy.
3. **Transparent SSE & Stream Proxying**: Proxies Server-Sent Events (`/movie`, `/tv`) and HLS/MP4 streams (`/api?url=...`) with media range request handling.

---

## Deployment Steps

### 1. Install Wrangler
In the `worker/` directory or root:
```bash
cd worker
npm install
```

### 2. Configure Backend URL
Edit `wrangler.jsonc` or set `VYLA_BACKEND_URL`:
```jsonc
"vars": {
  "VYLA_BACKEND_URL": "https://your-vyla-server.com" // or Cloudflare Tunnel URL
}
```

### 3. Add your Vyla API Key as a Secret
```bash
npx wrangler secret put VYLA_API_KEY
```
Enter your `standard` or `partner` Vyla API key when prompted.

### 4. Deploy to Cloudflare
```bash
npx wrangler deploy
```

After deployment, Cloudflare will output your worker URL, e.g.:
`https://vplay-vyla-proxy.<your-subdomain>.workers.dev`

### 5. Link with VPlay
In your VPlay web app:
1. Click the **Settings (gear icon)** in the top navigation bar.
2. Paste your Worker URL into **API Gateway / Worker URL**.
3. Click **Test Connection** to confirm connectivity!
