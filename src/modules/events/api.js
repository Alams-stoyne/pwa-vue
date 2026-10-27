import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'
import { localDate } from '../core/utils/date'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

/**
 * Загрузка событий на конкретную дату.
 * Формат: https://cdn.x5hd.ru/events/YYYY-MM-DD.json
 */
export async function fetchEventsForDate(date = localDate()) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/events/${date}.json`)

  if (res.status === 404) return []
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return Array.isArray(data) ? data : (data.events || [])
  } catch {
    throw new Error('Некорректный ответ CDN')
  }
}

/**
 * Синхронизация статусов событий пользователя.
 * POST {API}/events/status { ID_USER }
 * Ответ: { RESULT: 'OK', STATES: { [eventId]: { CLICKED_AT, CONFIRMED_AT } } }
 */
export async function fetchEventsStatus({ ID_USER }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/events/status`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Запись действия (клик или подтверждение).
 * POST {API}/events/action { ID_USER, EVENT_ID, ACTION }
 * ACTION: 'click' | 'confirm'
 *
 * @param {{ ID_USER: string, EVENT_ID: string, ACTION: 'click'|'confirm' }} payload
 * @param {{ keepalive?: boolean }} opts
 *   keepalive=true — критично для click: браузер не отменяет запрос,
 *   когда вкладка уходит в фон (после window.open ссылки).
 */
export async function sendEventAction(payload, { keepalive = false } = {}) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/events/action`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}