import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL
const CDN = import.meta.env.VITE_CDN_URL

export async function sendSteps({ ID_USER, STEPS, IMAGES, CONSENT, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/steps`, {
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
 * Ответ:   {
 *   RESULT: 'OK',
 *   TOTAL_STEPS: 70000,     // подтверждённые на сервере шаги
 *   GOAL: 100000,           // цель, если задана
 *   RANK: 12,               // место в рейтинге (1 = лучший)
 *   TOTAL_USERS: 340,       // всего участников
 *   TODAY_STEPS: 3500,      // сколько сегодня зачтено
 *   DAILY_AVG: 5000,        // среднее в день (опционально)
 *   TOP_PERCENT: 4          // в каком проценте сверху (опционально)
 * }
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
 *
 * Запрос:  GET {CDN}/config/steps_rules.json
 * Ответ:   {
 *   TITLE: 'Правила шагомера',
 *   INTRO: 'Короткий вводный текст',
 *   SECTIONS: [ { id, title, text }, ... ]
 * }
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