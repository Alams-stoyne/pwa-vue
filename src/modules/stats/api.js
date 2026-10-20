import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

export async function fetchGlobalStats() {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${CDN}/stats/global.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Сервер — источник истины. Клиент отправляет только ID_USER, ничего
 * из локальных счётчиков (защита от подделки).
 *
 * Ожидаемый ответ:
 * {
 *   RESULT: 'OK',
 *   LECTURES_READ, TASKS_DONE, HABITS_DONE, DAYS_ACTIVE, STREAK,
 *   BY_THEME: { energy, antistress, body, balance, general, charging },
 *   BY_HABIT: { water, workout, eyes },
 *   WEEK_ACTIVITY: [{ date, count }, ...]  // 7 элементов, включая сегодня
 * }
 */
export async function fetchPersonalStats({ ID_USER, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/stats/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, LOCAL_DATETIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}