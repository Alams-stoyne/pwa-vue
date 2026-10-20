import { localDate } from '../core/utils/date'
import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

function normalizeList(data) {
  return Array.isArray(data) ? data : (data ? [data] : [])
}

export async function fetchGeneralLectures(date = localDate()) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${CDN}/lectures/general/${date}.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return normalizeList(await res.json())
}

export async function fetchThemeLectures(theme, date = localDate()) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${CDN}/lectures/${theme}/${date}.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return normalizeList(await res.json())
}

export async function fetchChargingLectures(date = localDate()) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${CDN}/lectures/charging/${date}.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return normalizeList(await res.json())
}

export async function sendLectureRead({ ID_USER, ID_LECTURE, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/lecture/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, ID_LECTURE, LOCAL_DATETIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Запрос списка отмеченных материалов с сервера. */
export async function fetchReads({ ID_USER }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/reads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}