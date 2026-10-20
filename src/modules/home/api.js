import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL

export async function sendDaily({ ID_USER, THEME, LOCAL_TIME }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, THEME, LOCAL_TIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Синхронизация дат «Читаю сегодня». */
export async function fetchDailyStatus({ ID_USER }) {
  if (isOffline()) throw new OfflineError()
  const res = await fetchWithTimeout(`${API}/daily-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Состояние виджета «Сегодня».
 *
 * Запрос:  POST /api/home/today  { ID_USER }
 * Ответ:   {
 *   RESULT: 'OK',
 *   TODAY: {
 *     id:           'day-2026-10-14',
 *     state:        'active' | 'done',
 *     title:        'Все практики выполнены!',
 *     description:  'Отличная работа.',
 *     buttonLabel:  'Смотреть статистику',
 *     buttonAction: { type: 'internal' | 'external', url: '/stats' }
 *   }
 * }
 * Если TODAY отсутствует или null — виджет не показывается.
 */
export async function fetchTodayState({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/today`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error('[home] invalid JSON from /home/today:', text.slice(0, 200))
    throw new Error('Некорректный ответ сервера')
  }
}