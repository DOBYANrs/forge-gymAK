import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FORGE Gym Tracker',
        short_name: 'FORGE',
        description: 'Track workouts for Abel & Keneni — 3D body heatmap, cinematic intro, lifetime ranking',
        theme_color: '#FF5E00',
        background_color: '#0B0C10',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/forge-gymAK/',
        scope: '/forge-gymAK/',
        categories: ['health', 'fitness', 'utilities'],
        icons: [
          {
            src: '/forge-gymAK/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/forge-gymAK/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/forge-gymAK/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB for GLB model
        runtimeCaching: [
          {
            urlPattern: /muscle_anatomy\.glb$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'forge-3d-model',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/forge-gymAK/',
});
