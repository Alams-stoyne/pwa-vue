import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL
const CDN = import.meta.env.VITE_CDN_URL

export async function sendSteps({ ID_USER, STEPS, IMAGES, CONSENT, LOCAL_DATETIME }) { 
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/steps/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, STEPS, IMAGES, CONSENT, LOCAL_DATETIME }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

/**
 * Сводка шагомера: общее количество подтверждённых шагов, цель, место в рейтинге.
 *
 * Запрос:  POST {API}/steps/summary  { ID_USER }
 */
export async function fetchStepsSummary({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/steps/summary`, {
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

/**
 * Правила шагомера с CDN.
 */
export async function fetchStepsRules() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/config/steps_rules.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try { return JSON.parse(text) }
  catch {
    console.error('[steps] invalid rules JSON from CDN:', text.slice(0, 200))
    throw new Error('Некорректный ответ CDN')
  }
}

/**
 * ТОП шагомера (лидерборд).
 * @param {string|null} date — null для all-time, 'YYYY-MM-DD' для конкретного дня
 */
export async function fetchStepsLeaderboard(date = null) {
  if (isOffline()) throw new OfflineError()
  
  const url = date 
    ? `${CDN}/steps/leaderboard/${date}.json` 
    : `${CDN}/steps/leaderboard.json`
    
  const res = await fetchWithTimeout(url)
  if (res.status === 404) return null // Нет данных за этот день — это нормально
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ CDN') }
}

/**
 * Сводка по школе/всем участникам (из school.json).
 */
export async function fetchSchoolStats() {
  if (isOffline()) throw new OfflineError()
  
  const res = await fetchWithTimeout(`${CDN}/steps/school.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ CDN') }
}