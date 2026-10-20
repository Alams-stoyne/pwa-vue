/**
 * Конфигурация экрана «Обучение».
 *
 * Слайды приходят с сервера. Картинки кладём в ОТДЕЛЬНЫЙ кэш
 * `tutorial-slides` — чтобы после завершения или пропуска удалить
 * их одним вызовом, не задевая основной кэш `cdn-photos`.
 *
 * Флаг `tutorial.done` — показывать ли обучение. Взводится при
 * завершении или пропуске.
 */

import { ref, computed } from 'vue'

const CACHE_NAME = 'tutorial-slides'
const LS_DONE = 'tutorial.done'
const LS_CACHE = 'tutorial.cache'
const LS_CACHE_AT = 'tutorial.cacheAt'
const CACHE_TTL = 24 * 60 * 60 * 1000

// ── Fallback: используется, пока сервер не ответил ──
export const FALLBACK_SLIDES = [
  {
    id: 'welcome',
    title: 'Добро пожаловать!',
    text: 'День здоровья — это ежедневные практики и материалы для заботы о себе.',
    image: '',
  },
  {
    id: 'habits',
    title: 'Ежедневные привычки',
    text: 'Отмечайте маленькие победы каждый день — мы напомним, когда придёт время.',
    image: '',
  },
  {
    id: 'themes',
    title: 'Направления',
    text: 'Выберите то, что откликается — материалы подстроятся под вас.',
    image: '',
  },
]

// ── Реактивный список. Сюда пишет tutorial/store ──
export const slidesList = ref([])

export function getSlides() {
  return slidesList.value.length ? slidesList.value : FALLBACK_SLIDES
}

export const slidesComputed = computed(() => getSlides())

// ─────────── Работа с Cache API ───────────

/**
 * Кладёт картинки слайдов в отдельный кэш `tutorial-slides` и
 * возвращает массив blob-URL'ов для показа.
 * Пока слайды на экране — URL'ы валидны, после завершения
 * компонент вызовет clearSlidesCache() и все ресурсы освободятся.
 */
export async function precacheSlides(slides) {
  // Если Cache API недоступен (старый браузер) — отдаём исходные URL'ы
  if (typeof window === 'undefined' || !('caches' in window)) {
    return slides.map((s) => s.image || '')
  }

  const cache = await caches.open(CACHE_NAME)
  const urls = []

  for (const s of slides) {
    if (!s.image) { urls.push(''); continue }
    try {
      let resp = await cache.match(s.image)
      if (!resp) {
        // no-store, чтобы обойти HTTP-кэш браузера; SW-кэш для tutorial
        // картинок отключён в public/sw-push.js.
        resp = await fetch(s.image, { cache: 'no-store' })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        await cache.put(s.image, resp.clone())
      }
      const blob = await resp.blob()
      urls.push(URL.createObjectURL(blob))
    } catch (e) {
      console.warn('[tutorial] image cache failed:', s.image, e.message)
      urls.push(s.image)
    }
  }

  return urls
}

/** Удаляет кэш обучения и освобождает blob-URL'ы. */
export async function clearSlidesCache(objectUrls = []) {
  for (const u of objectUrls) {
    if (u && typeof u === 'string' && u.startsWith('blob:')) {
      try { URL.revokeObjectURL(u) } catch {}
    }
  }
  if (typeof window !== 'undefined' && 'caches' in window) {
    try { await caches.delete(CACHE_NAME) } catch {}
  }
}

// ─────────── Флаги «обучение пройдено» ───────────

export function isTutorialDone() {
  try { return localStorage.getItem(LS_DONE) === '1' } catch { return false }
}

export function markTutorialDone() {
  try {
    localStorage.setItem(LS_DONE, '1')
    localStorage.removeItem(LS_CACHE)
    localStorage.removeItem(LS_CACHE_AT)
  } catch {}
}

export function resetTutorial() {
  try {
    localStorage.removeItem(LS_DONE)
    localStorage.removeItem(LS_CACHE)
    localStorage.removeItem(LS_CACHE_AT)
  } catch {}
}

// ─────────── Кэш списка слайдов (JSON) ───────────

export function readSlidesCache() {
  try {
    const raw = localStorage.getItem(LS_CACHE)
    if (!raw) return null
    const at = Number(localStorage.getItem(LS_CACHE_AT) || 0)
    if (Date.now() - at > CACHE_TTL) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : null
  } catch { return null }
}

export function writeSlidesCache(slides) {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify(slides))
    localStorage.setItem(LS_CACHE_AT, String(Date.now()))
  } catch {}
}