import { tzOffsetMin } from '../core/utils/date'
import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

/**
 * Конфиг привычек с CDN.
 *
 * cache: 'no-store' — обход HTTP-кеша браузера.
 * Service Worker (cdn-json, NetworkFirst) обновит свой кеш сам.
 *
 * @param {{ force?: boolean }} opts — force добавляет ?v=... для обхода
 *   HTTP/CDN-кеша (полезно для отладки и «обновить»-кнопок).
 */
export async function fetchHabitsConfig({ force = false } = {}) {
  if (isOffline()) throw new OfflineError()

  const url = force
    ? `${CDN}/config/habits.json?v=${Date.now()}`
    : `${CDN}/config/habits.json`

  const res = await fetchWithTimeout(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error('[habits] invalid JSON from CDN:', text.slice(0, 200))
    throw new Error('Некорректный ответ CDN')
  }
}

export async function sendHabitComplete({ ID_USER, HABIT_ID, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/habit/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ID_USER,
      HABIT_ID,
      LOCAL_DATETIME,
      TZ_OFFSET_MIN: tzOffsetMin(),
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchHabits({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/habits`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchHabitSelection({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/habits/selection`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function saveHabitSelection({ ID_USER, HABIT_ID }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/habits/select`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, HABIT_ID }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}