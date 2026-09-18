# VPlay API Specification

This document provides complete documentation for the VPlay backend gateway endpoints hosted by the Cloudflare Worker and routed through Cloudflare Pages Functions.

---

## 1. Base URL & Protocols

* **Production (Same-Origin via Pages Service Binding)**:
  `https://your-domain.pages.dev`
* **Local Development**:
  `http://127.0.0.1:8787` (Worker) & `http://localhost:5173` (Vite)

---

## 2. Authentication & Health

### 2.1 Authenticate Session
Issues a stateless, cryptographically signed token with a 30-minute expiration.

* **Method**: `POST`
* **Endpoint**: `/api/auth` or `/api/auth/refresh`
* **Headers**: `Content-Type: application/json`
* **Response `(200 OK)`**:
  ```json
  {
    "token": "vplay_1773801200000_a1b2c3d4e5f60718",
    "type": "standard",
    "expiresIn": 1800,
    "notice": "For entertainment purposes only"
  }
  ```

---

### 2.2 Health Status
Returns provider network health, scraper availability, and gateway mode.

* **Method**: `GET`
* **Endpoint**: `/api/health`
* **Response `(200 OK)`**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-18T00:00:00.000Z",
    "tmdb": true,
    "sources": [
      {
        "key": "vidlink",
        "label": "VidLink",
        "ok": true,
        "multiUrl": false
      }
    ]
  }
  ```

---

## 3. Real-Time Streaming Endpoints (SSE)

Real-time media resolvers use **Server-Sent Events (`text/event-stream`)** to stream playback sources progressively.

### 3.1 Stream Movie
* **Method**: `GET`
* **Endpoint**: `/movie`
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `id` | `number` | Yes | The TMDB Movie ID (e.g. `693134` for Dune: Part Two, `129` for Spirited Away). |
* **Headers**: `Accept: text/event-stream`
* **Note**: Anime feature films (such as *Spirited Away*, *Your Name.*) stream via `/movie` because TMDB treats them as movies.

### 3.2 Stream TV Show / Anime Series
* **Method**: `GET`
* **Endpoint**: `/tv`
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `id` | `number` | Yes | The TMDB TV Show / Anime Series ID (e.g. `209867` for Solo Leveling, `1429` for Attack on Titan). |
  | `season` | `number` | No | Season number (1-indexed, default: `1`). |
  | `episode` | `number` | No | Episode number (1-indexed, default: `1`). |
* **Headers**: `Accept: text/event-stream`

### SSE Event Stream Protocol

1. **`event: meta`** (Emitted immediately):
   ```json
   {
     "type": "meta",
     "meta": {
       "id": 693134,
       "title": "Dune: Part Two",
       "release_date": "2024-02-27",
       "runtime": 167,
       "vote_average": 8.2
     },
     "subtitles": [
       {
         "label": "English",
         "language": "en",
         "file": "https://..."
       }
     ]
   }
   ```

2. **`event: source`** (Emitted as each provider resolves):
   ```json
   {
     "type": "source",
     "source": {
       "source": "vidlink",
       "label": "VidLink Server 1",
       "url": "https://..."
     }
   }
   ```

3. **`event: done`** (Emitted when all 48+ scrapers complete):
   ```json
   {
     "type": "done",
     "total": 4
   }
   ```

4. **`event: error`** (Emitted if catastrophic resolution failure):
   ```json
   {
     "type": "error",
     "message": "No available streams found."
   }
   ```

---

## 4. Discovery & Catalog Endpoints

All discovery endpoints feature Cloudflare Edge Caching (`cf.cacheTtl`) and standardized `Cache-Control` headers.

### 4.1 Trending Titles
* **Method**: `GET`
* **Endpoint**: `/api/trending`
* **Query Parameters**:
  | Parameter | Type | Default | Description |
  |---|---|---|---|
  | `type` | `string` | `all` | `all`, `movie`, `tv`, or `anime`. |
  | `media_type` | `string` | optional | When `type=anime`, optionally filter to `movie` (anime films) or `tv` (anime series). When omitted, interleaves top popular anime series and films. |
  | `page` | `number` | `1` | Pagination page number. |
* **Caching**: `Cache-Control: public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400`

---

### 4.2 Popular & Category Feeds
* **Method**: `GET`
* **Endpoint**: `/api/popular`
* **Query Parameters**:
  | Parameter | Type | Default | Description |
  |---|---|---|---|
  | `type` | `string` | `movie` | `movie`, `tv`, or `anime`. |
  | `media_type` | `string` | optional | When `type=anime`, optionally filter to `movie` (anime films) or `tv` (anime series). |
  | `page` | `number` | `1` | Pagination page number. |
* **Caching**: `Cache-Control: public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400`

---

### 4.3 Multi-Search
* **Method**: `GET`
* **Endpoint**: `/api/search`
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `query` | `string` | Yes | Search query term. |
  | `page` | `number` | No | Pagination page number (Default: `1`). |
* **Caching**: `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=1800`

---

### 4.4 Title Details
* **Method**: `GET`
* **Endpoint**: `/api/details`
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `id` | `number` | Yes | TMDB item ID. |
  | `type` | `string` | No | `movie`, `tv`, or `anime` (Default: `movie`). |
  | `media_type` | `string` | No | Explicit underlying TMDB entity (`movie` or `tv`). If omitted when `type=anime`, automatically resolves with automatic fallback. |
* **Response `(200 OK)`**:
  ```json
  {
    "result": {
      "id": 209867,
      "title": "Solo Leveling",
      "type": "anime",
      "media_type": "tv",
      "overview": "...",
      "poster_path": "https://image.tmdb.org/t/p/w500/...",
      "backdrop_path": "https://image.tmdb.org/t/p/original/...",
      "vote_average": 8.5,
      "release_date": "2024-01-07",
      "genres": ["Anime", "Action", "Fantasy"]
    }
  }
  ```

---

## 5. Media & Subtitle Proxies

### 5.1 Stream / CORS Proxy
Proxies HLS `.m3u8` playlists and segments that require custom `Referer` or `Origin` headers.

* **Method**: `GET`
* **Endpoint**: `/api`
* **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `url` | `string` | Yes | Target stream or playlist URL (URL-encoded). |
  | `ref` | `string` | No | Optional HTTP Referer header to spoof. |
  | `origin` | `string` | No | Optional HTTP Origin header to spoof. |

---

### 5.2 Subtitles Lookup
* **Method**: `GET`
* **Endpoint**: 
  - Movies: `/api/subtitles/movie/:id`
  - TV / Anime: `/api/subtitles/tv/:id/:season/:episode`
* **Response `(200 OK)`**:
  ```json
  {
    "subtitles": [
      {
        "id": "12345",
        "label": "English [Full]",
        "language": "en",
        "url": "https://..."
      }
    ]
  }
  ```

---

## 6. Rate Limiting & Error Codes

When request thresholds are exceeded, the API returns `HTTP 429 Too Many Requests`:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30

{
  "error": "Too many requests. Please wait a moment.",
  "retryAfter": 30
}
```

### Standard Status Codes:
* `200 OK`: Request processed successfully.
* `400 Bad Request`: Missing mandatory parameters (e.g. `id` or `query`).
* `404 Not Found`: Endpoint or requested media not found.
* `429 Too Many Requests`: IP rate limit exceeded (Retry after header specified).
* `502 Bad Gateway`: Upstream TMDB or scraper provider connectivity failure.

---

## 7. Client-Side SPA Routes & Deep Links

VPlay integrates `react-router-dom` with synchronized URL paths and bookmarkable deep links:

| Path Pattern | View | Behavior |
|---|---|---|
| `/` | Home | Renders Hero Carousel & all shelves (Trending, Anime, Movies, TV, Sci-Fi). |
| `/movies` | Category Grid | Filters live catalog for Movies. |
| `/tv` | Category Grid | Filters live catalog for TV Series. |
| `/anime` | Category Grid | Filters live catalog for Japanese Anime. |
| `/watchlist` | Watchlist Grid | Displays user bookmarks stored in local storage. |
| `/:type/:id` | Detail Modal | Resolves media details and displays synopsis, cast, and episode list (`/movie/693134`, `/tv/209867`). |
| `/watch/:type/:id` | Video Player | Launches full-screen streaming player (movies or series defaulting to S1 E1). |
| `/watch/:type/:id/:season/:episode` | Video Player | Launches streaming player at specific season and episode (`/watch/tv/209867/1/2`). |
