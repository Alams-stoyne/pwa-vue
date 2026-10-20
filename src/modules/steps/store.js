import { defineStore } from 'pinia'
import { sendSteps, fetchStepsSummary, fetchStepsRules } from './api'
import { FALLBACK_RULES } from './rules'
import { useAuthStore } from '../auth/store'
import { isSuccess } from '../core/utils/response'
import { localDateTime } from '../core/utils/date'
import { isOffline } from '../core/utils/network'

const LS_SUMMARY = 'steps.summary'
const LS_SUMMARY_AT = 'steps.summaryAt'
const LS_RULES = 'steps.rules'
const LS_RULES_AT = 'steps.rulesAt'
const SUMMARY_TTL = 5 * 60 * 1000      // 5 минут
const RULES_TTL = 24 * 60 * 60 * 1000   // 24 часа

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export const useStepsStore = defineStore('steps', {
  state: () => ({
    // Форма отправки
    sending: false,
    error: null,
    lastEntryId: null,

    // Сводка
    summary: readLS(LS_SUMMARY, null),
    loadingSummary: false,
    summaryError: null,

    // Правила
    rules: readLS(LS_RULES, null) || FALLBACK_RULES,
    loadingRules: false,
    rulesError: null,
  }),

  getters: {
    totalSteps: (s) => Number(s.summary?.TOTAL_STEPS) || 0,
    goal: (s) => Number(s.summary?.GOAL) || 0,
    rank: (s) => Number(s.summary?.RANK) || 0,
    totalUsers: (s) => Number(s.summary?.TOTAL_USERS) || 0,
    todaySteps: (s) => Number(s.summary?.TODAY_STEPS) || 0,

    /** Процент прогресса от 0 до 100. */
    progressPercent: (s) => {
      const goal = Number(s.summary?.GOAL) || 0
      const total = Number(s.summary?.TOTAL_STEPS) || 0
      if (goal <= 0) return 0
      return Math.min(100, Math.max(0, (total / goal) * 100))
    },

    hasSummary: (s) => !!s.summary,
  },

  actions: {
    // ─── Отправка шагов ───
    async send({ steps, images, consent }) {
      if (this.sending) return false
      this.sending = true
      this.error = null
      try {
        const auth = useAuthStore()
        const res = await sendSteps({
          ID_USER: auth.idUser,
          STEPS: Number(steps),
          IMAGES: Array.isArray(images) ? images : [],
          CONSENT: !!consent,
          LOCAL_DATETIME: localDateTime(),
        })
        if (isSuccess(res)) {
          this.lastEntryId = res.ENTRY_ID || null
          // Обновим сводку после успешной отправки
          this.loadSummary({ force: true }).catch(() => {})
          return true
        }
        this.error = res?.MESSAGE || 'Не удалось отправить'
        return false
      } catch (e) {
        this.error = e.message || 'Ошибка отправки'
        return false
      } finally {
        this.sending = false
      }
    },

    reset() {
      this.error = null
      this.lastEntryId = null
    },

    // ─── Сводка ───
    async loadSummary({ force = false } = {}) {
      const cachedAt = Number(localStorage.getItem(LS_SUMMARY_AT) || 0)
      const fresh = Date.now() - cachedAt < SUMMARY_TTL
      if (!force && fresh && this.summary) return true

      if (isOffline()) return false

      const auth = useAuthStore()
      if (!auth.idUser) return false

      this.loadingSummary = true
      this.summaryError = null
      try {
        const res = await fetchStepsSummary({ ID_USER: auth.idUser })
        if (isSuccess(res)) {
          this.summary = {
            TOTAL_STEPS: Number(res.TOTAL_STEPS) || 0,
            GOAL: Number(res.GOAL) || 0,
            RANK: Number(res.RANK) || 0,
            TOTAL_USERS: Number(res.TOTAL_USERS) || 0,
            TODAY_STEPS: Number(res.TODAY_STEPS) || 0,
            DAILY_AVG: Number(res.DAILY_AVG) || 0,
            TOP_PERCENT: Number(res.TOP_PERCENT) || 0,
          }
          writeLS(LS_SUMMARY, this.summary)
          localStorage.setItem(LS_SUMMARY_AT, String(Date.now()))
          return true
        }
        this.summaryError = res?.MESSAGE || 'Не удалось загрузить прогресс'
        return false
      } catch (e) {
        this.summaryError = e.message || 'Ошибка загрузки'
        return false
      } finally {
        this.loadingSummary = false
      }
    },

    // ─── Правила ───
    async loadRules({ force = false } = {}) {
      const cachedAt = Number(localStorage.getItem(LS_RULES_AT) || 0)
      const fresh = Date.now() - cachedAt < RULES_TTL
      if (!force && fresh && this.rules && this.rules !== FALLBACK_RULES) {
        return true
      }

      if (isOffline()) return false

      this.loadingRules = true
      this.rulesError = null
      try {
        const res = await fetchStepsRules()
        if (res && Array.isArray(res.SECTIONS)) {
          this.rules = res
          writeLS(LS_RULES, res)
          localStorage.setItem(LS_RULES_AT, String(Date.now()))
          return true
        }
        return false
      } catch (e) {
        this.rulesError = e.message || 'Ошибка загрузки правил'
        return false
      } finally {
        this.loadingRules = false
      }
    },
  },
})