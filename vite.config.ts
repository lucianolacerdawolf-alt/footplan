import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'FootPlan — Simulador Tático',
        short_name: 'FootPlan',
        description: 'Simulador tático de futebol com ligas europeias, campeonatos, copas e modo online.',
        lang: 'pt-BR',
        theme_color: '#060b14',
        background_color: '#060b14',
        display: 'standalone',
        orientation: 'portrait',
        // Relativos ao próprio manifest (não absolutos) — funciona tanto em dev
        // quanto sob o subpath do GitHub Pages (/footplan/), sem hardcoded.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      },
    }),
  ],
  base: './',
})
