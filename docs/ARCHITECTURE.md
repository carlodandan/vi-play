# Vi-Play Architecture & System Design

This document details the architectural design, data pipelines, caching tiers, security models, and runtime flows of **Vi-Play**.

---

## 1. System Overview

Vi-Play is a modern media streaming interface built on top of Cloudflare's serverless edge infrastructure. It splits responsibilities into two decoupled layers:
1. **Frontend**: A high-performance, single-page client built with React 19, Vite 8, and Tailwind CSS v4, deployed to **Cloudflare Pages**.
2. **Backend**: A private, self-contained Cloudflare Worker (**`vplay-api`**) executing the `@vyla-entertainment/sdk` to aggregate streams from 48+ external video scrapers and proxy TMDB discovery metadata.

The two layers communicate seamlessly in production via **Cloudflare Service Bindings**, eliminating public origin exposure, CORS preflight bottlenecks, and the need for external virtual private servers (VPS).

---

## 2. C4 Architecture Diagrams

### 2.1 System Context

```mermaid
graph TD
    User["User / Web Browser"]
    
    subgraph CF ["Cloudflare Global Network"]
        Pages["Cloudflare Pages (Frontend SPA)"]
        Functions["Pages Functions Router (functions/router)"]
        Worker["Cloudflare Worker (vplay-api)"]
    end
    
    TMDB["TMDB API (themoviedb.org)"]
    Scrapers["48+ Video Scrapers (Vidlink, Vidfast, etc.)"]
    
    User -->|HTTPS Static Assets| Pages
    Pages -->|Same-Origin API Requests| Functions
    Functions -->|Private Service Binding: VYLA_WORKER| Worker
    Worker -->|Edge-Cached TMDB Queries| TMDB
    Worker -->|Scrape and Stream Resolvers| Scrapers
```

### 2.2 Container Diagram

```mermaid
graph LR
    subgraph Client ["Browser Client"]
        UI["React 19 UI (Cinema Dark)"]
        Cache["In-Memory Cache (SWR / LRU)"]
        Storage["LocalStorage (Watchlist & History)"]
        Player["HLS.js / HTML5 Video Player"]
    end

    subgraph Edge ["Cloudflare Edge Gateway"]
        PagesRouter["Pages Router (functions/router)"]
        ServiceBinding["Service Binding: env.VYLA_WORKER"]
        
        subgraph ProxyWorker ["Private Worker Engine"]
            RateLimiter["Sliding-Window Rate Limiter"]
            EdgeCache["Edge Cache Engine: cf.cacheTtl"]
            DiscoveryEngine["TMDB Discovery Engine"]
            StreamingEngine["Vyla SDK SSE Scraper Engine"]
        end
    end

    subgraph External ["External APIs"]
        TMDB_API["TMDB API"]
        StreamSources["Third-Party Video Hosts"]
    end

    UI --> Cache
    UI --> Storage
    UI --> Player
    UI -->|API Requests| PagesRouter
    PagesRouter --> ServiceBinding
    ServiceBinding --> RateLimiter
    RateLimiter --> EdgeCache
    EdgeCache --> DiscoveryEngine
    EdgeCache --> StreamingEngine
    DiscoveryEngine --> TMDB_API
    StreamingEngine --> StreamSources
    Player -->|Proxied Media Streams| StreamingEngine
```

---

## 3. Data Flow Pipelines

### 3.1 Live Discovery & Catalog Browsing

Vi-Play uses a tiered fallback mechanism to provide **instant first paint** with zero layout shift while fetching fresh metadata asynchronously.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React App (App.tsx)
    participant ClientCache as Frontend Cache (vylaApi.ts)
    participant Worker as Cloudflare Worker (/api/trending, /api/popular)
    participant TMDB as TMDB API (themoviedb.org)

    User->>App: Opens Vi-Play Homepage
    App->>App: Instant render with CURATED_MEDIA skeleton
    App->>ClientCache: browseTmdb('trending') & browseTmdb('popular')
    
    alt In-Memory Cache Hit (TTL < 15m)
        ClientCache-->>App: Return cached JSON immediately (0ms)
    else Cache Miss
        ClientCache->>Worker: GET /api/trending?type=all&page=1
        Worker->>Worker: Check IP Rate Limit (max 60/min)
        alt Rate Limit Exceeded
            Worker-->>ClientCache: HTTP 429 Too Many Requests
        else Allowed
            Worker->>TMDB: fetch(/trending/all/week) with cf: { cacheTtl: 3600 }
            TMDB-->>Worker: Raw TMDB JSON
            Worker->>Worker: mapTmdbResults() + Add Cache-Control headers
            Worker-->>ClientCache: Normalized MediaItem[]
            ClientCache->>ClientCache: Store in RAM (10-15m TTL)
            ClientCache-->>App: Populate live shelves & Hero Carousel
        end
    end
    App-->>User: Seamlessly transitions from skeleton to live titles
```

---

### 3.2 Real-Time SSE Video Streaming

When a user clicks "Play", Vi-Play initiates a Server-Sent Events (SSE) connection. Sources are scraped concurrently across 48+ providers and streamed down progressively so playback can begin on the first healthy stream.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Player as VideoPlayerModal (HLS.js)
    participant Worker as Cloudflare Worker (/movie, /tv)
    participant Vyla as Vyla SDK Scraper Core
    participant Upstream as External Stream Host

    User->>Player: Clicks "Play"
    Player->>Worker: GET /movie?id=209867 (Accept: text/event-stream)
    Worker->>Worker: Rate limit check (max 15 streams/min)
    Worker-->>Player: HTTP 200 (text/event-stream)
    
    par Metadata & Subtitles
        Worker->>Vyla: Query TMDB metadata & OpenSubtitles
        Worker-->>Player: event: meta (title, runtime, subtitles)
    and Concurrent Provider Scraping
        Worker->>Vyla: Query top providers (vidlink, vidfast, rivestream, vixsrc, 4khdhub)
        loop Fast Provider Resolution
            Vyla-->>Worker: Yields playable stream URL
            Worker-->>Player: event: source ({ provider: "vidlink", url: "..." })
            Player->>Player: Attach first valid stream to HLS.js / video
            Player-->>User: Video starts buffering / playing immediately
        end
    end
    
    Worker-->>Player: event: done ({ total: 5 })
    Worker->>Worker: Close SSE stream
```

---

## 4. Multi-Tiered Caching Architecture

| Layer | Location | TTL | Target | Purpose |
|---|---|---|---|---|
| **Tier 1: Instant Skeleton** | Client Bundle (`curatedMedia.ts`) | Permanent | Initial Paint | Guarantees zero blank screen during cold boot or offline states. |
| **Tier 2: In-Memory Client Cache** | Browser RAM (`vylaApi.ts`) | 3–15 mins | Tab navigation, Search | Eliminates redundant network calls when toggling between Categories (Movies, TV, Anime). |
| **Tier 3: Cloudflare Edge Cache** | Cloudflare Global CDN | 1–24 hours | Upstream TMDB responses | Serves repeat regional queries in <10ms and protects TMDB API key limits. |
| **Tier 4: LocalStorage Cache** | Browser Storage | Persistent | Watchlist & Watch History | Preserves custom bookmarks, playback progress, and offline items across sessions. |

---

## 5. Edge Security & Abuse Prevention

### 5.1 Sliding-Window Rate Limiter
The Cloudflare Worker tracks incoming requests using an in-memory sliding-window counter keyed by the client's `CF-Connecting-IP` header:
* **Discovery Routes** (`/api/trending`, `/api/popular`, `/api/search`, `/api/details`): **60 requests/minute**.
* **Stream Resolvers** (`/movie`, `/tv`): **15 requests/minute**.
* **Penalty**: Returns `HTTP 429 Too Many Requests` with a `Retry-After: 30` header.
* **Garbage Collection**: Prunes stale timestamp arrays every 120 seconds to prevent worker memory leaks.

### 5.2 Cryptographic Stateless Sessions
* `POST /api/auth` generates tokens signed with SHA-256 HMAC:
  $$\text{token} = \text{vplay\_} + \text{timestamp} + \text{\_} + \text{HMAC}_{\text{secret}}(\text{IP} + \text{timestamp})$$
* Allows verification at the edge in 0ms with zero database lookups.
* Automatically expires after 30 minutes (1800s).

### 5.3 Client-Side Search Debouncing
Search input updates are debounced by **350ms** in `App.tsx`. Keystroke bursts while typing queries like `"interstellar"` produce a single API invocation instead of a dozen redundant network calls.

---

## 6. Video Streaming Engine

1. **Adaptive Bitrate (HLS)**: Managed by `hls.js`, dynamically adjusting between 360p, 720p, 1080p, and 4K based on network conditions.
2. **Direct MP4 Streams**: Automatically detected via URL patterns and loaded natively into the HTML5 video element.
3. **CORS & Playlist Proxying**: External m3u8 playlists that enforce strict CORS or origin policies are proxied through `/api?url=...`, which rewrites relative segment URIs and injects valid headers.
4. **Resilient Auto-Fallback**: If an active stream encounters a fatal error, `useStreamPlayer.ts` automatically steps down to the next available source in the priority list without interrupting user context.
