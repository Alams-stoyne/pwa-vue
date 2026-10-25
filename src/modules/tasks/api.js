import { localDate, tzOffsetMin } from '../core/utils/date'
import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

export async function fetchTasksByThemeDate(theme, date = localDate()) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${CDN}/tasks/${theme}/${date}.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : (data ? [data] : [])
}

export async function sendTaskComplete({ ID_USER, ID_TASK, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/task/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ID_USER,
      ID_TASK,
      LOCAL_DATETIME,
      TZ_OFFSET_MIN: tzOffsetMin(),
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchTasks({ ID_USER }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}