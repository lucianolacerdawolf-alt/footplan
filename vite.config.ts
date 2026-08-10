import path from 'path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Versão do app (package.json) exposta ao bundle como __APP_VERSION__ — usada na
// Home pra usuários reportarem bugs com a versão exata. Sem import de JSON: lida
// direto do arquivo pra não depender de resolveJsonModule no tsconfig.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// `--mode native` (build do Capacitor) em vez de env var: funciona igual em
// cmd.exe e em shell POSIX, sem depender de cross-env. O `.env` normal continua
// sendo carregado nesse modo, então as VITE_* seguem valendo.
export default defineConfig(({ mode }) => ({
  // No build nativo o service worker é dispensável — os assets já vêm dentro do
  // APK — e é ativamente nocivo: o cache do Workbox sobrevive à atualização do
  // app e pode servir a versão antiga do bundle. Por isso o PWA só entra no web.
  plugins: [
    react(),
    mode !== 'native' && VitePWA({
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
  ].filter(Boolean),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: './',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa as libs de node_modules em chunks próprios. Reduz o chunk
        // principal (que passava de 900 kB) e melhora o cache do navegador entre
        // deploys — libs que não mudam ficam num arquivo estável.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react')) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('peerjs')) return 'vendor-peer';
          return 'vendor';
        },
      },
    },
  },
}))
