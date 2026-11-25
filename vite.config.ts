import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLEFILE=1 собирает всё приложение в один HTML (для предпросмотра без хостинга)
const single = !!process.env.SINGLEFILE

export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  define: single ? { 'import.meta.env.VITE_SINGLEFILE': '"1"' } : {},
  build: single ? { outDir: 'dist-single' } : {},
  plugins: [
    react(),
    single
      ? viteSingleFile()
      : VitePWA({
          registerType: 'autoUpdate',
          injectRegister: false,
          includeAssets: ['icon.svg', 'apple-touch-icon.png'],
          manifest: {
            name: 'Развитие — 15 минут в день',
            short_name: 'Развитие',
            description: 'Темы на месяц, интервальное повторение и прогресс.',
            lang: 'ru',
            display: 'standalone',
            orientation: 'portrait',
            start_url: './',
            background_color: '#f2f3f7',
            theme_color: '#4f46e5',
            icons: [
              { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 },
        }),
  ],
})
