import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import Sitemap from 'vite-plugin-sitemap';
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    Sitemap({
      hostname: 'https://vi-play.pages.dev',
      dynamicRoutes: [
        '/movies',
        '/tv',
        '/anime',
        '/watchlist',
        '/movie/693134/dune-part-two',
        '/movie/157336/interstellar',
        '/anime/1429/attack-on-titan-shingeki-no-kyojin',
        '/tv/1396/breaking-bad',
        '/tv/94997/house-of-the-dragon',
        '/movie/27205/inception',
        '/anime/94605/jujutsu-kaisen',
        '/movie/299536/avengers-infinity-war',
        '/tv/209867/solo-leveling',
        '/movie/438631/dune',
        '/anime/85937/demon-slayer-kimetsu-no-yaiba',
        '/tv/63333/the-last-of-us',
        '/movie/155/the-dark-knight',
        '/anime/31911/fullmetal-alchemist-brotherhood',
        '/tv/66732/stranger-things',
        '/movie/872585/oppenheimer',
        '/anime/37854/one-piece',
      ],
      priority: {
        '/': 1.0,
        '/movies': 0.9,
        '/tv': 0.9,
        '/anime': 0.9,
        '/watchlist': 0.5,
        '*': 0.8,
      },
      changefreq: {
        '/': 'daily',
        '/movies': 'daily',
        '/tv': 'daily',
        '/anime': 'daily',
        '/watchlist': 'weekly',
        '*': 'daily',
      },
      readable: true,
      robots: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/api/', '/healthz'],
          cleanParam: 'ref /',
        },
        {
          userAgent: 'Googlebot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'Bingbot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
          crawlDelay: 1,
        },
        {
          userAgent: 'Applebot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'GPTBot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'ChatGPT-User',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'ClaudeBot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'PerplexityBot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'Google-Extended',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'Applebot-Extended',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'Bytespider',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'CCBot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'anthropic-ai',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'FacebookBot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
        {
          userAgent: 'Amazonbot',
          allow: '/',
          disallow: ['/api/', '/healthz'],
        },
      ],
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Local dev proxy forwarding to local wrangler worker dev running on http://127.0.0.1:8787
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      // Only proxy stream endpoints with query params; bypass any browser HTML page navigation
      '^/(movie|tv)($|\\?)': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
})
