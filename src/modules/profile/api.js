import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL
const CDN = import.meta.env.VITE_CDN_URL

export async function sendProfile({
  ID_USER, FIO, NICKNAME, WORKPLACE, LOCAL_DATETIME,
}) {
  const res = await fetch(`${API}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, FIO, NICKNAME, WORKPLACE, LOCAL_DATETIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Получение справочника мест работы с CDN.
 * Ожидаемый формат: { workplaces: [{ id, name, logo }] }
 */
export async function fetchWorkplaces() {
  if (isOffline()) throw new OfflineError()
  
  const res = await fetchWithTimeout(`${CDN}/config/workplaces.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return Array.isArray(data) ? data : (data.workplaces || [])
  } catch {
    throw new Error('Некорректный ответ CDN')
  }
}