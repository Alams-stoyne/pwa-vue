import { tzOffsetMin } from '../core/utils/date'
import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

export async function fetchHabitsConfig() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/config/habits.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try { return JSON.parse(text) }
  catch {
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