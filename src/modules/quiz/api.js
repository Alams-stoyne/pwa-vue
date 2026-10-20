import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL

/**
 * Загрузить вопросы теста с CDN.
 *
 * Запрос:  GET {CDN}/config/quiz.json
 * Ответ:   { QUESTIONS: [
 *             { id, text, answers: [ { text, weights: { themeId: score } } ] }
 *           ] }
 *         либо просто массив вопросов — клиент поддерживает оба формата.
 */
export async function fetchQuestions() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/config/quiz_theme.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error('[quiz] invalid JSON from CDN:', text.slice(0, 200))
    throw new Error('Некорректный ответ CDN')
  }
}