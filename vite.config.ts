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
        '/',
        '/movies',
        '/tv',
        '/anime',
        '/watchlist',
      ],
      priority: {
        '/': 1.0,
        '/movies': 0.9,
        '/tv': 0.9,
        '/anime': 0.9,
        '/watchlist': 0.5,
      },
      changefreq: {
        '/': 'daily',
        '/movies': 'daily',
        '/tv': 'daily',
        '/anime': 'daily',
        '/watchlist': 'weekly',
      },
      readable: true,
      robots: [
        {
          userAgent: '*',
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
