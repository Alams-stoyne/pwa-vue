import { fetchWithTimeout, isOffline, OfflineError } from '../../core/utils/network'
import { localDateTime, tzOffsetMin } from '../../core/utils/date'

const API = import.meta.env.VITE_API_URL

/**
 * История начислений и «просмотрено без награды».
 *
 * Запрос:  POST {API}/apples/history  { ID_USER, LOCAL_DATETIME, TZ_OFFSET_MIN, PAGE? }
 * Ответ:   {
 *   RESULT: 'OK',
 *   ITEMS: [{ ID, DATE, TYPE, TITLE, POINTS, STATUS, REASON, CREATED_AT }],
 *   TOTAL, PAGE, PER_PAGE, PAGES
 * }
 *
 * STATUS: 'rewarded' | 'skipped' | ...
 * REASON: null | 'LIMIT_OR_NO_POINTS' | ...
 */
export async function fetchApplesHistory({ ID_USER, PAGE = 1 }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/apples/history`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ID_USER,
      LOCAL_DATETIME: localDateTime(),
      TZ_OFFSET_MIN: tzOffsetMin(),
      PAGE,
    }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}