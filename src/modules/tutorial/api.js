import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL

/**
 * Загрузить слайды обучения с CDN.
 *
 * Запрос:  GET {CDN}/config/tutorial.json
 * Ответ:   { SLIDES: [
 *             { id, title, text, image }
 *           ] }
 *
 * Файл кешируется SW (NetworkFirst, кэш cdn-json) и дополнительно
 * кешируется в localStorage на 24 часа через tutorial/store.
 */
export async function fetchTutorialSlides() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/config/tutorial.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error('[tutorial] invalid JSON from CDN:', text.slice(0, 200))
    throw new Error('Некорректный ответ CDN')
  }
}