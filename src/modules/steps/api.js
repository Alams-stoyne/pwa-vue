import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'
import { localDate } from '../core/utils/date'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

/**
 * Отправка шагов.
 *
 * STEP_DATE — за какой день (YYYY-MM-DD). ОБЯЗАТЕЛЕН после согласования
 * с бэком:
 *   • сейчас (2 недели переходный период): если STEP_DATE пуст,
 *     сервер применяет fallback LOCAL_DATE − 1 (старое поведение);
 *   • через 2 недели бэк переключит fallback на LOCAL_DATE.
 *
 * Клиент всегда передаёт STEP_DATE явно:
 *   • StepsHomePanel → вчера (отправка «за вчера»)
 *   • StepsHistoryView → выбранный день из истории
 *
 * Это делает поведение независимым от fallback-логики сервера.
 *
 * Таймаут 30 секунд (вместо дефолтных 8) — base64 от сжатого изображения
 * может весить несколько МБ.
 */
export async function sendSteps({ ID_USER, STEP_DATE, STEPS, IMAGES, CONSENT, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()

  const payload = { ID_USER, STEPS, IMAGES, CONSENT, LOCAL_DATETIME }
  if (STEP_DATE) payload.STEP_DATE = STEP_DATE

  const res = await fetchWithTimeout(`${API}/steps/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    timeout: 30000,
  })

  if (!res.ok) {
    let detail = ''
    let result = ''
    try {
      const text = await res.text()
      const json = JSON.parse(text)
      detail = json?.MESSAGE || json?.REASON || ''
      result = json?.RESULT || ''
    } catch { /* ignore */ }
    const err = new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`)
    err.code = result || `HTTP_${res.status}`
    err.result = result
    err.status = res.status
    throw err
  }

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
 * История шагов по дням марафона.
 *
 * Запрос:  POST {API}/steps/history  { ID_USER }
 * Ответ:   {
 *   RESULT: 'OK',
 *   PERIOD: { FROM, TO, DEADLINE, MAX_STEPS_PER_DAY },
 *   DAYS: [{
 *     DATE, STEPS, STATUS, REJECT_REASON,
 *     SENT_AT, CONFIRMED_AT, REWARD_POINTS
 *   }]
 * }
 *
 * STATUS: 'approved' | 'pending' | 'rejected' | 'not_sent' | 'future' | 'expired'
 * DAYS — всегда все дни периода, по возрастанию даты.
 */
export async function fetchStepsHistory({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/steps/history`, {
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

export async function fetchStepsLeaderboard(date = null) {
  if (isOffline()) throw new OfflineError()

  const url = date
    ? `${CDN}/steps/leaderboard/${date}.json`
    : `${CDN}/steps/leaderboard.json`

  const res = await fetchWithTimeout(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ CDN') }
}

export async function fetchSchoolStats() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/steps/school.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ CDN') }
}