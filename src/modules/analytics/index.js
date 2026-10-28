import { localDateTime, tzOffsetMin } from '../core/utils/date'
import { fetchWithTimeout, isOffline } from '../core/utils/network'
import { EVT } from './events'

const API = import.meta.env.VITE_API_URL
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'

const LS_QUEUE = 'analytics.queue'
const LS_SESSION = 'analytics.sessionId'
const LS_FIRST_OPEN = 'analytics.firstOpenAt'
const LS_LAST_OPEN = 'analytics.lastOpenAt'
const LS_LAST_SCREEN = 'analytics.lastScreen'

const FLUSH_INTERVAL_MS = 15000
const MAX_BATCH_SIZE = 50        // строго по ТЗ (до 50)
const MAX_QUEUE_SIZE = 1000
const QUEUE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

let _queue = []
let _flushTimer = null
let _inited = false
let _flushing = false
let _sessionId = null
let _sessionStartedAt = null
let _sessionEventsCount = 0
let _sessionScreens = new Set()
let _enabled = true
let _retryAfterMs = 0

let _getUserId = () => null
let _getDeviceId = () => null

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, val) } catch {}
}
function readJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function restoreQueue() {
  const stored = readJSON(LS_QUEUE, [])
  if (!Array.isArray(stored)) return
  const now = Date.now()
  _queue = stored.filter((e) => {
    const ts = Number(e.ts) || 0
    return now - ts < QUEUE_MAX_AGE_MS
  })
}

function persistQueue() {
  const slice = _queue.slice(-MAX_QUEUE_SIZE)
  writeJSON(LS_QUEUE, slice)
}

// Ограничиваем размер PROPS до 2000 символов
function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return {}
  const out = {}
  let totalSize = 0
  for (const [k, v] of Object.entries(props)) {
    if (totalSize > 1900) break // запас
    if (v == null) continue
    let val = v
    if (typeof v === 'string') val = v.slice(0, 200)
    const itemSize = String(k).length + String(val).length + 6
    if (totalSize + itemSize > 2000) break
    out[k] = val
    totalSize += itemSize
  }
  return out
}

export function configureAnalytics({ getUserId, getDeviceId } = {}) {
  if (typeof getUserId === 'function') _getUserId = getUserId
  if (typeof getDeviceId === 'function') _getDeviceId = getDeviceId
}

export function init() {
  if (_inited) return
  _inited = true

  try {
    const params = new URLSearchParams(location.search)
    if (params.get('analytics') === '0') _enabled = false
  } catch {}

  if (!_enabled) return

  restoreQueue()

  window.addEventListener('error', (e) => {
    track(EVT.APP_ERROR, {
      message: String(e?.message || '').slice(0, 300),
      filename: String(e?.filename || '').slice(0, 200),
      lineno: e?.lineno,
    })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e?.reason
    track(EVT.APP_ERROR, {
      message: String(r?.message || r || '').slice(0, 300),
      kind: 'unhandledrejection',
    })
  })

  const firstOpenAt = readLS(LS_FIRST_OPEN, null)
  if (!firstOpenAt) {
    writeLS(LS_FIRST_OPEN, String(Date.now()))
    track(EVT.APP_FIRST_OPEN, {
      isStandalone: !!(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone),
      source: 'link',
    })
  }

  _flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })
  window.addEventListener('pagehide', () => flush(true))
  window.addEventListener('online', () => flush(true))
}

export function track(name, props = {}) {
  if (!_enabled) return
  if (!name) return

  // Валидация имени (только a-z0-9_)
  const safeName = String(name).replace(/[^a-z0-9_]/g, '').slice(0, 64)
  if (!safeName) return

  _queue.push({ name: safeName, ts: Date.now(), props: sanitizeProps(props) })
  _sessionEventsCount++

  if (_queue.length > MAX_QUEUE_SIZE) _queue = _queue.slice(-MAX_QUEUE_SIZE)
  if (_queue.length >= 30) flush().catch(() => {})
}

export function trackAppOpen(extra = {}) {
  const lastScreen = readLS(LS_LAST_SCREEN, '')
  const firstOpenAt = Number(readLS(LS_FIRST_OPEN, 0)) || 0
  const lastOpenAt = Number(readLS(LS_LAST_OPEN, 0)) || 0
  const now = Date.now()
  const isStandalone = !!(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone)
  const isFirstOpen = !firstOpenAt || Math.abs(firstOpenAt - now) < 1000

  writeLS(LS_LAST_OPEN, String(now))

  track(EVT.APP_OPEN, {
    isStandalone,
    isFirstOpen,
    lastScreen,
    daysSinceFirstOpen: firstOpenAt ? Math.floor((now - firstOpenAt) / 86400000) : 0,
    daysSinceLastOpen: lastOpenAt ? Math.floor((now - lastOpenAt) / 86400000) : null,
    path: location.pathname,
    ...extra,
  })
}

export function startSession() {
  _sessionId = generateId()
  _sessionStartedAt = Date.now()
  _sessionEventsCount = 0
  _sessionScreens = new Set()
  writeLS(LS_SESSION, _sessionId)
  track(EVT.SESSION_START, {})
}

export function endSession(reason = 'hidden') {
  if (!_sessionStartedAt) return
  track(EVT.SESSION_END, {
    durationMs: Date.now() - _sessionStartedAt,
    screens: _sessionScreens.size,
    events: _sessionEventsCount,
    reason,
  })
  _sessionStartedAt = null
  _sessionScreens = new Set()
}

export function trackScreenView(to, from) {
  if (!_enabled) return
  const path = to?.path || 'unknown'
  _sessionScreens.add(path)
  writeLS(LS_LAST_SCREEN, path)
  track(EVT.SCREEN_VIEW, {
    path,
    from: from?.path || null,
    title: typeof to?.meta?.title === 'string' ? to.meta.title : '',
  })
}

export async function flush(useBeacon = false) {
  if (_flushing) return
  if (!useBeacon && isOffline()) return
  if (!_queue.length) return
  if (_retryAfterMs > Date.now()) return

  _flushing = true
  const batch = _queue.splice(0, MAX_BATCH_SIZE)

  const payload = {
    DEVICE_ID: _getDeviceId() || 'unknown',
    ID_USER: _getUserId() || null,
    SESSION_ID: _sessionId,
    TZ_OFFSET_MIN: tzOffsetMin(),
    APP_VERSION,
    LOCAL_DATETIME: localDateTime(),
    EVENTS: batch.map((e) => ({ NAME: e.name, TS: e.ts, PROPS: e.props || {} })),
  }

  try {
    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const ok = navigator.sendBeacon(`${API}/analytics/event`, blob)
      if (!ok) throw new Error('beacon_failed')
    } else {
      const res = await fetchWithTimeout(`${API}/analytics/event`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 10000,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const data = await res.json()
      
      // ▼ ОБРАБОТКА ОТВЕТОВ СЕРВЕРА ▼
      if (data?.RESULT === 'SKIPPED') {
        // Пользователь не дал согласие — сервер отбросил данные. Не ретраим.
        return
      }
      if (data?.RESULT === 'RATE_LIMITED') {
        _retryAfterMs = Date.now() + (Number(data.RETRY_AFTER_MS) || 5000)
        throw new Error('rate_limited')
      }
      if (data?.RESULT === 'ERROR') {
        throw new Error('server_error')
      }
    }
  } catch (e) {
    // Возвращаем батч в очередь (кроме SKIPPED)
    if (e.message !== 'skipped') {
      _queue.unshift(...batch)
      if (_queue.length > MAX_QUEUE_SIZE) _queue = _queue.slice(-MAX_QUEUE_SIZE)
      persistQueue()
    }
  } finally {
    if (!useBeacon) persistQueue()
    _flushing = false
  }
}