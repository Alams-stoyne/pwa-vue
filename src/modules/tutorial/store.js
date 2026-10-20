import { defineStore } from 'pinia'
import { fetchTutorialSlides } from './api'
import {
  slidesList, getSlides, FALLBACK_SLIDES,
  precacheSlides, clearSlidesCache,
  readSlidesCache, writeSlidesCache,
  markTutorialDone, isTutorialDone, resetTutorial,
} from './config'
import { isSuccess } from '../core/utils/response'
import { isOffline } from '../core/utils/network'

// Массив blob-URL'ов живёт в module-scope: чистим при finish()
// и при повторном load() — во избежание утечки.
let _objectUrls = []

export const useTutorialStore = defineStore('tutorial', {
  state: () => ({
    loading: false,
    error: null,
    slideImages: [],
    currentStep: 0,
  }),

  getters: {
    slides: () => getSlides(),
    total: () => getSlides().length,
    current: (s) => getSlides()[s.currentStep] || null,
    isFirst: (s) => s.currentStep === 0,
    isLast: (s) => s.currentStep >= getSlides().length - 1,
    currentImage: (s) => s.slideImages[s.currentStep] || '',
  },

  actions: {
    /**
     * Загрузить слайды и подготовить картинки.
     * @param {{ force?: boolean }} opts
     */
    async load({ force = false } = {}) {
      // 1. Мгновенно применяем кэш JSON, чтобы UI не ждал сеть
      if (!force && !slidesList.value.length) {
        const cached = readSlidesCache()
        if (cached) slidesList.value = cached
      }

      // 2. Если кэш уже есть и force не нужен — просто готовим картинки
      if (!force && slidesList.value.length) {
        await this._prepareImages(slidesList.value)
        return true
      }

      // 3. Офлайн — используем что есть
      if (isOffline()) {
        await this._prepareImages(getSlides())
        return false
      }

      // 4. Сеть
      this.loading = true
      this.error = null
      try {
        const res = await fetchTutorialSlides()
        // CDN отдаёт либо { SLIDES: [...] }, либо просто массив [...]
        const slides = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.SLIDES) ? res.SLIDES : null)

        if (slides && slides.length) {
          slidesList.value = slides
          writeSlidesCache(slides)
        } else {
          slidesList.value = FALLBACK_SLIDES
        }
      } catch (e) {
        this.error = e.message || 'Ошибка загрузки'
        slidesList.value = FALLBACK_SLIDES
      } finally {
        this.loading = false
      }

      await this._prepareImages(getSlides())
      return true
    },

    async _prepareImages(slides) {
      // Освобождаем предыдущие blob-URL'ы
      for (const u of _objectUrls) {
        if (u && typeof u === 'string' && u.startsWith('blob:')) {
          try { URL.revokeObjectURL(u) } catch {}
        }
      }
      _objectUrls = []

      const urls = await precacheSlides(slides)
      _objectUrls = urls
      this.slideImages = urls
    },

    next() {
      if (this.currentStep < getSlides().length - 1) this.currentStep++
    },

    prev() {
      if (this.currentStep > 0) this.currentStep--
    },

    goTo(index) {
      const total = getSlides().length
      if (index >= 0 && index < total) this.currentStep = index
    },

    /**
     * Завершение или пропуск обучения.
     * Удаляет кэш картинок, освобождает blob-URL'ы, ставит флаг.
     */
    async finish() {
      await clearSlidesCache(_objectUrls)
      _objectUrls = []
      this.slideImages = []
      markTutorialDone()
    },

    reset() {
      resetTutorial()
      this.currentStep = 0
      this.slideImages = []
      slidesList.value = []
    },

    isDone() {
      return isTutorialDone()
    },
  },
})