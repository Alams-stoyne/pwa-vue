import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { mockServerPlugin } from './mock/vite-plugin-mock.js'

export default defineConfig(({ command }) => {
  const isServe = command === 'serve'  
  return {
    plugins: [
      vue(),
      isServe ? mockServerPlugin() : null,
      // mockServerPlugin(),
      VitePWA({
        // ── Режим injectManifest: свой SW с маркером __WB_MANIFEST ──
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw-push.js',
        
        // Отключаем авто-регистрацию: у нас своя регистрация через
        // registerSW в pwaGuard.js.
        injectRegister: null,
        registerType: 'autoUpdate',
        manifest: false,

        // Настройки для injectManifest
        injectManifest: {
          globPatterns: [
            '**/*.{js,css,html,ico,svg,woff,woff2}',
            '**/*.{png,jpg,jpeg,webp,avif,gif}',
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },      

        // Все статические ассеты из public/, которые должны быть офлайн.
        // Расширения: картинки, шрифты, иконки.
        includeAssets: [
          'icons/*.png',
          'maskot/*.png',
          'backgrounds/*.{jpg,jpeg,png,webp,avif,svg}',
          'fonts/*.{woff,woff2}',
        ],

        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
          suppressWarnings: true,
        },

        workbox: {
          // ── Что прекешируется при сборке ──
          globPatterns: [
            '**/*.{js,css,html,ico,svg,woff,woff2}',
            '**/*.{png,jpg,jpeg,webp,avif,gif}',
          ],

          // Отдельно для больших картинок из public/ — поднимаем лимит
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 МБ

          // SPA-роутинг: отдаём index.html на любой путь
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/mock/, /^\/api/, /^\/cdn/],

          // Автоматически удалять старые precache бакеты при апдейте
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,

          runtimeCaching: [
            // ── 1. Мок-картинки в dev/preview (picsum) ──
            {
              urlPattern: /^https:\/\/picsum\.photos\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'external-picsum',
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },

            // ── 2. Внешние шрифты (Google Fonts) ──
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },

            // ── 3. CDN прода: JSON материалов ──
            {
              urlPattern: /^https:\/\/cdn\.x5hd\.ru\/(tasks|lectures)\/.*\.json$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'cdn-json',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /^https:\/\/cdn\.x5hd\.ru\/stats\/.*\.json$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'cdn-stats',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 6 },
              },
            },

            // ── 4. CDN прода: картинки материалов ──
            {
              urlPattern: /^https:\/\/cdn\.x5hd\.ru\/.*\.(png|jpe?g|webp|gif|avif)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-photos',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})