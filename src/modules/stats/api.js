import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

/**
 * Глобальная статистика с CDN.
 * Кэш: 24 часа (настраивается на CDN).
 */
export async function fetchGlobalStats() {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${CDN}/stats/global.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Персональная статистика (сервер — источник истины).
 * POST {API}/stats/personal
 */
export async function fetchPersonalStats({ ID_USER, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/stats/personal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, LOCAL_DATETIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}