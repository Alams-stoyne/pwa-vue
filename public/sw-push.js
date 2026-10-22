/**
 * Кастомный Service Worker.
 *
 * injectManifest-режим: в self.__WB_MANIFEST Workbox подставит список
 * файлов для прекеша. Runtime-правила и NavigationRoute задаются здесь —
 * опции workbox.navigateFallback в этом режиме НЕ применяются.
 */

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// ── Прекеш ─────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// ── Автоактивация ─────────────────────────────────────────────
self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ── SPA-навигация ──────────────────────────────────────────────
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL('/index.html'),
    {
      denylist: [/^\/mock/, /^\/api/, /^\/cdn/],
    },
  ),
)

// ── Runtime caching ────────────────────────────────────────────

// Внешние картинки (dev/preview picsum)
registerRoute(
  ({ url }) => url.origin === 'https://picsum.photos',
  new CacheFirst({
    cacheName: 'external-picsum',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// CDN JSON: материалы + конфиги + события
registerRoute(
  ({ url }) =>
    url.origin === 'https://cdn.x5hd.ru' &&
    // ДОБАВЛЕНЫ events
    /\/(article|general|useful|archive|tasks|lectures|config|events)\/.*\.json$/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'cdn-json',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
)

// CDN JSON статистики
registerRoute(
  ({ url }) =>
    url.origin === 'https://cdn.x5hd.ru' &&
    /\/stats\/.*\.json$/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'cdn-stats',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 6 }),
    ],
  }),
)

// CDN картинки.
// Картинки обучения (/tutorial/*) исключены — они живут в отдельном
// кэше 'tutorial-slides', который чистится после завершения или
// пропуска обучения.
registerRoute(
  ({ url }) =>
    url.origin === 'https://cdn.x5hd.ru' &&
    /\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname) &&
    !url.pathname.startsWith('/tutorial/'),
  new CacheFirst({
    cacheName: 'cdn-photos',
    plugins: [
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// ── Механизм передачи URL из push в SPA ────────────────────────
const PENDING_NAV_CACHE = 'pwa-pending-nav'
const PENDING_NAV_URL = '/__pending-navigation__'
const PENDING_NAV_TTL = 60_000

async function savePendingNavigation(url) {
  try {
    const cache = await caches.open(PENDING_NAV_CACHE)
    const body = JSON.stringify({ url, ts: Date.now() })
    await cache.put(
      PENDING_NAV_URL,
      new Response(body, {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  } catch (e) {
    console.warn('[SW] savePendingNavigation failed:', e)
  }
}

// ── Web Push: приём уведомления ────────────────────────────────
self.addEventListener('push', function (event) {
  console.log('[SW] push received')

  let data = {
    title: 'День здоровья',
    body: 'Новое уведомление',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
    tag: 'default',
  }

  if (event.data) {
    try {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
      
      // Если сервер прислал ticketId вместо url — собираем url для поддержки
      if (parsed.ticketId && !parsed.url) {
        data.url = `/support/tickets/${parsed.ticketId}`
      }
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      renotify: true,
      data: { url: data.url || '/' },
    }),
  )
})

// ── Web Push: клик по уведомлению ──────────────────────────────
self.addEventListener('notificationclick', function (event) {
  console.log('[SW] notification click', event.notification.data)
  event.notification.close()

  // Берем url из данных уведомления. Если его нет, пробуем собрать из ticketId
  let target = (event.notification.data && event.notification.data.url) || '/'
  
  if (event.notification.data?.ticketId && target === '/') {
    target = `/support/tickets/${event.notification.data.ticketId}`
  }

  const absoluteUrl = new URL(target, self.location.origin).href

  event.waitUntil((async () => {
    await savePendingNavigation(target)

    let allClients = []
    try {
      allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
    } catch (e) {
      console.warn('[SW] matchAll failed:', e)
    }

    const ourClients = []
    for (const c of allClients) {
      try {
        if (new URL(c.url).origin === self.location.origin) ourClients.push(c)
      } catch { /* ignore */ }
    }

    if (ourClients.length === 0) {
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
      return
    }

    for (const client of ourClients) {
      try {
        client.postMessage({ type: 'notification-navigate', url: target })
        if ('focus' in client) return client.focus()
      } catch (e) {
        console.warn('[SW] postMessage failed:', e)
      }
    }
  })())
})