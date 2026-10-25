import { createApp, watch } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { installPwaGuard } from './modules/install/pwaGuard'
import { installNoZoomGuards } from './modules/core/composables/useNoZoom'
import { useInstall } from './modules/install/useInstall'
import { useAccess } from './modules/install/useAccess'
import { useAuthStore } from './modules/auth/store'
import { useThemeStore } from './modules/theme/store'
import { useConsentStore } from './modules/consent/store'
import { useHabitsStore } from './modules/habits/store'
import { useLimits } from './modules/core/limits'
import { subscribeToPush, getSubscription } from './modules/push/push'

const pinia = createPinia()
setActivePinia(pinia)

// ── Отладочный сброс по ?reset=1 ───────────────────────────────
try {
  const url = new URL(location.href)
  if (url.searchParams.get('reset') === '1') {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim()
      if (name) document.cookie = `${name}=; max-age=0; path=/`
    })
    console.warn('[debug] storage cleared')
    url.searchParams.delete('reset')
    history.replaceState({}, '', url.pathname + url.search + url.hash)
  }
} catch {}

useInstall()
installNoZoomGuards()

const app = createApp(App)
app.use(pinia)
app.use(router)

// auth.load() синхронный и идемпотентный — вызываем один раз.
const auth = useAuthStore()
auth.load()

app.mount('#app')

// ── Всё ниже — вне критического пути ──────────────────────────

const shift = Number(sessionStorage.getItem('debug.dateShift') || 0)
if (shift) {
  const RealDate = Date
  window.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + shift)
      else super(...args)
    }
    static now() { return RealDate.now() + shift }
  }
  console.log('[debug] сдвиг даты:', shift / 86400000, 'дн.')
}

// ── Лимиты дневных наград ────────────────────────────────────
// init() запускается внутри useLimits(): читает used из LS,
// подтягивает rules с CDN (кэш 1 час). startDayWatcher() ставит
// setInterval(60с) + visibilitychange → сверка с /config/limits.
const limits = useLimits()
limits.startDayWatcher()
limits.refreshUsed().catch(() => {})

// Согласие ПД — загружаем при старте, если пользователь авторизован
const consent = useConsentStore()
if (auth.idUser && !consent.isAnswered) {
  consent.loadStatus().catch(() => {})
}

// Направления — с CDN
const theme = useThemeStore()
theme.load()
theme.loadThemes().catch(() => {})

// Привычка — не меняется, восстанавливается через STATE.HABIT_SELECTED
if (auth.idUser) {
  const habits = useHabitsStore()
  habits.reload()
  if (!habits.selectedHabitId) {
    habits.loadSelection().catch(() => {})
  }
}

installPwaGuard().catch((e) => {
  console.warn('[pwa] guard failed:', e)
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data
    if (!msg || msg.type !== 'notification-navigate') return

    let targetUrl = msg.url
    if (!targetUrl && msg.ticketId) {
      targetUrl = `/support/tickets/${msg.ticketId}`
    }
    if (!targetUrl) return

    console.log('[push] navigate from SW message:', targetUrl)

    router.isReady().then(() => {
      try {
        const targetPath = String(targetUrl).split('?')[0]
        if (router.currentRoute.value.path === targetPath) return
        router.push(targetUrl).catch((e) => {
          console.warn('[push] router.push failed:', e)
          router.push('/home')
        })
      } catch (e) {
        console.warn('[push] message handler error:', e)
      }
    })
  })
}

const PENDING_NAV_CACHE = 'pwa-pending-nav'
const PENDING_NAV_URL = '/__pending-navigation__'
const PENDING_NAV_TTL = 60_000

async function readPendingNavigation() {
  try {
    if (!('caches' in window)) return null
    const cache = await caches.open(PENDING_NAV_CACHE)
    const resp = await cache.match(PENDING_NAV_URL)
    if (!resp) return null
    await cache.delete(PENDING_NAV_URL)
    const data = await resp.json()
    if (!data || !data.url) return null
    if (Date.now() - (data.ts || 0) > PENDING_NAV_TTL) return null
    return data.url
  } catch { return null }
}

async function applyPendingNavigation() {
  const url = await readPendingNavigation()
  if (!url) return
  console.log('[push] pending navigation from SW:', url)
  await router.isReady()
  try {
    const target = String(url).split('?')[0]
    if (router.currentRoute.value.path === target) return
    await router.replace(url)
  } catch {
    try { router.replace('/home') } catch {}
  }
}

setTimeout(() => { applyPendingNavigation() }, 150)
setTimeout(() => { applyPendingNavigation() }, 1500)

const API_BASE = import.meta.env.VITE_API_URL || '/mock'
let _pushSubscribed = false

async function registerPushSubscription() {
  if (_pushSubscribed) return
  if (!auth.isAuthed || !auth.idUser) return
  _pushSubscribed = true
  try {
    let subscription = await getSubscription()
    if (!subscription) subscription = await subscribeToPush()
    if (!subscription) { _pushSubscribed = false; return }
    const res = await fetch(`${API_BASE}/push/subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID_USER: auth.idUser,
        subscription: subscription.toJSON(),
      }),
    })
    if (!res.ok) { _pushSubscribed = false; return }
    console.log('[push] подписка сохранена на сервере')
  } catch (e) {
    console.warn('[push] ошибка при подписке:', e)
    _pushSubscribed = false
  }
}

watch(
  () => auth.isAuthed && !!auth.idUser,
  (ready) => { if (ready) setTimeout(registerPushSubscription, 1500) },
  { immediate: true },
)

const install = useInstall()
const { hasUid, uidMismatch } = useAccess()
console.log('[bootstrap]', {
  isInstalled: install.isInstalled.value,
  hasUid: hasUid.value,
  uidMismatch: uidMismatch.value,
  isAuthed: auth.isAuthed,
  isRegistered: auth.isRegistered,
  idUser: auth.idUser,
  consentGranted: consent.isGranted,
  consentAnswered: consent.isAnswered,
  iosStandalone: window.navigator.standalone,
  displayStandalone: window.matchMedia('(display-mode: standalone)').matches,
  apiBase: API_BASE,
  limits: limits.asMap.value,
  url: location.href,
})