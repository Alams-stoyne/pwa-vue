import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL
const CDN = import.meta.env.VITE_CDN_URL

export async function sendReflection({ ID_USER, TEXT, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/reflection/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, TEXT, LOCAL_DATETIME }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function fetchReflectionStatus({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/reflection/status`, {
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
 * Заголовки рефлексии по дням с CDN.
 *
 * Запрос:  GET {CDN}/config/reflection.json
 * Ответ:   { TITLES: [ { date: '2026-10-19', title: 'Что сегодня получилось?' }, ... ] }
 *         либо просто массив — клиент поддерживает оба формата.
 */
export async function fetchReflectionTitles() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/config/reflection.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try { return JSON.parse(text) }
  catch {
    console.error('[reflection] invalid titles JSON from CDN:', text.slice(0, 200))
    throw new Error('Некорректный ответ CDN')
  }
}