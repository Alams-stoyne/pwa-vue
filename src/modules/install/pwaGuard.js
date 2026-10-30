import { registerSW } from 'virtual:pwa-register'

const HOUR = 60 * 60 * 1000
let _intervalId = null

/**
 * Регистрирует Service Worker.
 *
 * Манифест живёт статически в index.html — iOS читает его
 * в момент установки, манипуляции с <link rel="manifest">
 * в рантайме на iOS не работают.
 *
 * Управление доступом — задача App.vue и роутера.
 */
export async function installPwaGuard() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  const updateSW = registerSW({
    immediate: true,

    onRegisteredSW(swUrl, registration) {
      if (!registration) return

      // Раз в час — проверка обновлений SW
      if (_intervalId) clearInterval(_intervalId)
      _intervalId = setInterval(() => {
        registration.update().catch(() => {})
      }, HOUR)

      // При возврате в приложение — тоже обновляемся
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {})
        }
      })

      registerPeriodicSync(registration).catch(() => {})
    },

    onOfflineReady() {
      console.log('[pwa] приложение готово к работе офлайн')
    },

    onNeedRefresh() {
      // updateSW(true) возвращает Promise: skipWaiting + reload + registration.update().
      // На iOS Safari registration.update() может reject'нуться (гонка: SW ещё в installing,
      // .waiting ещё нет). Раньше это давало unhandledrejection в консоли пользователя.
      // Ловим — SW всё равно активируется через skipWaiting/autoUpdate.
      try {
        const p = updateSW?.(true)
        if (p && typeof p.catch === 'function') {
          p.catch((e) => console.warn('[pwa] updateSW failed:', e))
        }
      } catch (e) {
        console.warn('[pwa] updateSW threw:', e)
      }
    },
  })

  return updateSW
}

async function registerPeriodicSync(registration) {
  if (!('periodicSync' in registration)) return
  try {
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync',
    })
    if (status.state !== 'granted') return
    await registration.periodicSync.register('pwa-content-check', {
      minInterval: 12 * 60 * 60 * 1000,
    })
  } catch {}
}