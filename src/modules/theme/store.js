import { defineStore } from 'pinia'
import { fetchThemes } from './api'
import { themesList, themesComputed } from './themes'
import { isOffline } from '../core/utils/network'
import { pushState } from '../auth/stateSync'

const LS_KEY = 'theme.selected'
const LS_CACHE = 'theme.themesCache'
const LS_CACHE_AT = 'theme.themesCacheAt'
const CACHE_TTL = 24 * 60 * 60 * 1000

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function removeLS(key) {
  try { localStorage.removeItem(key) } catch {}
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    selected: null,
    draft: null,
    loading: false,
    error: null,
  }),

  getters: {
    themes: () => themesComputed.value,
    hasTheme: (s) => !!s.selected,
    currentTheme: (s) => {
      if (!s.selected) return null
      const list = themesList.value
      if (!list.length) return null
      return list.find((t) => t.id === s.selected) || null
    },
    draftTheme: (s) => {
      if (!s.draft) return null
      return themesList.value.find((t) => t.id === s.draft) || null
    },
    effective: (s) => s.draft || s.selected,
    isDirty: (s) => !!s.draft && s.draft !== s.selected,
  },

  actions: {
    async loadThemes({ force = false } = {}) {
      if (!themesList.value.length) {
        const cached = readLS(LS_CACHE, null)
        if (Array.isArray(cached) && cached.length) {
          themesList.value = cached
        }
      }

      const cachedAt = Number(localStorage.getItem(LS_CACHE_AT) || 0)
      const fresh = Date.now() - cachedAt < CACHE_TTL
      if (!force && fresh && themesList.value.length) return true

      if (isOffline()) return false

      this.loading = true
      this.error = null
      try {
        const res = await fetchThemes()
        // CDN отдаёт либо массив [{...}], либо { THEMES: [...] }
        const themes = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.THEMES) ? res.THEMES : null)

        if (themes && themes.length) {
          themesList.value = themes
          writeLS(LS_CACHE, themes)
          localStorage.setItem(LS_CACHE_AT, String(Date.now()))

          if (this.selected && !themes.some((t) => t.id === this.selected)) {
            this.reset()
          }
          return true
        }
        return false
      } catch (e) {
        this.error = e.message || 'Ошибка загрузки направлений'
        return false
      } finally {
        this.loading = false
      }
    },

    load() {
      const id = localStorage.getItem(LS_KEY)
      if (id) {
        const list = themesList.value
        if (!list.length || list.some((t) => t.id === id)) {
          this.selected = id
        } else {
          this.selected = null
          removeLS(LS_KEY)
        }
      } else {
        this.selected = null
      }
      this.draft = null
    },

    setDraft(id) {
      const list = themesList.value.length ? themesList.value : []
      if (list.length && !list.some((t) => t.id === id)) return false
      this.draft = id
      return true
    },

    clearDraft() { this.draft = null },

    commitDraft() {
      if (!this.draft) return false
      this.selected = this.draft
      localStorage.setItem(LS_KEY, this.selected)
      this.draft = null

      const uid = localStorage.getItem('auth.uid') || ''
      if (uid) pushState(uid)

      return true
    },

    setTheme(id) {
      const list = themesList.value.length ? themesList.value : []
      if (list.length && !list.some((t) => t.id === id)) return false
      this.selected = id
      this.draft = null
      localStorage.setItem(LS_KEY, id)
      return true
    },

    reset() {
      this.selected = null
      this.draft = null
      removeLS(LS_KEY)
    },
  },
})