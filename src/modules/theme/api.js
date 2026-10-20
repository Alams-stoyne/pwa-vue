import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const CDN = import.meta.env.VITE_CDN_URL

/**
 * Приводит URL картинки к абсолютному.
 * Если CDN вернул относительный путь ('/backgrounds/theme.jpg'),
 * подставляем базовый URL CDN.
 */
function normalizeImageUrl(url) {
  if (!url) return ''
  // уже абсолютный
  if (/^https?:\/\//i.test(url)) return url
  // путь относительно CDN
  const base = CDN.endsWith('/') ? CDN.slice(0, -1) : CDN
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

export async function fetchThemes() {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${CDN}/config/themes.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const text = await res.text()
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    console.error('[themes] invalid JSON from CDN:', text.slice(0, 200))
    throw new Error('Некорректный ответ CDN')
  }

  const list = Array.isArray(raw) ? raw : (raw?.THEMES ?? [])
  if (!Array.isArray(list)) return []

  return list.map((t) => ({
    ...t,
    backgroundImage: normalizeImageUrl(t.backgroundImage),
    // на всякий случай — если у темы есть вложенное поле
    details: t.details
      ? { ...t.details, backgroundImage: normalizeImageUrl(t.details.backgroundImage) }
      : undefined,
  }))
}