import { defineStore } from 'pinia'
import {
  sendReflection,
  fetchReflectionStatus,
  fetchReflectionTitles,
} from './api'
import { useAuthStore } from '../auth/store'
import { isSuccess } from '../core/utils/response'
import { localDate, localDateTime } from '../core/utils/date'
import { isOffline } from '../core/utils/network'

const LS_SENT_DATE = 'reflection.sentDate'
const LS_TITLES = 'reflection.titles'
const LS_TITLES_AT = 'reflection.titlesAt'
const TITLES_TTL = 6 * 60 * 60 * 1000   // 6 часов
const MIN_TEXT = 50
const MAX_TEXT = 750

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export const useReflectionStore = defineStore('reflection', {
  state: () => ({
    text: '',
    sending: false,
    checking: false,
    error: null,
    sentToday: false,
    lastSentAt: null,

    // Заголовки по дням (тянутся с CDN)
    titlesList: readLS(LS_TITLES, []),
    loadingTitles: false,
  }),

  getters: {
    canSubmit: (s) =>
      s.text.trim().length > 15 &&
      s.text.length <= 750 &&
      !s.sentToday &&
      !s.sending,

    /**
     * Заголовок поля для сегодняшней даты.
     */
    todayTitle: (s) => {
      const today = localDate()
      const entry = (s.titlesList || []).find((t) => t && t.date === today)
      return entry?.title || 'Ваши мысли'
    },

    /**
     * Описание для сегодняшней даты.
     */
    todayDescription: (s) => {
      const today = localDate()
      const entry = (s.titlesList || []).find((t) => t && t.date === today)
      return entry?.description || 'Поделитесь своими мыслями...'
    },


    /**
     * Кол-во баллов для сегодняшней даты.
     */
    todayRewardPoints: (s) => {
      const today = localDate()
      const entry = (s.titlesList || []).find((t) => t && t.date === today)
      return entry?.rewardPoints || false
    },

    /**
     * текст для Маскота при открытии - если не отправлял рефлексию.
     */
    todayOpenTextCloud: (s) => {
      const today = localDate()
      const entry = (s.titlesList || []).find((t) => t && t.date === today)
      return entry?.openTextCloud || ''
    },

    /**
     * текст для Маскота - после отправки рефлексии.
     */
    todaySendTextCloud: (s) => {
      const today = localDate()
      const entry = (s.titlesList || []).find((t) => t && t.date === today)
      return entry?.sendTextCloud || ''
    },

    /**
     * текст для Маскота при открытии - если уже отправлял рефлексию.
     */
    todayAfterTextCloud: (s) => {
      const today = localDate()
      const entry = (s.titlesList || []).find((t) => t && t.date === today)
      return entry?.afterTextCloud || ''
    },


  },

  actions: {
    async loadStatus() {
      this.checking = true
      this.error = null
      try {
        const auth = useAuthStore()
        if (!auth.idUser) {
          const today = localDate()
          this.sentToday = localStorage.getItem(LS_SENT_DATE) === today
          return
        }
        const res = await fetchReflectionStatus({ ID_USER: auth.idUser })
        if (isSuccess(res)) {
          this.sentToday = !!res.SENT_TODAY
          this.lastSentAt = res.LAST_SENT_AT || null
        }
      } catch {
        const today = localDate()
        this.sentToday = localStorage.getItem(LS_SENT_DATE) === today
      } finally {
        this.checking = false
      }
    },

    /**
     * Загрузить заголовки рефлексии с CDN.
     * @param {{ force?: boolean }} opts
     */
    async loadTitles({ force = false } = {}) {
      const cachedAt = Number(localStorage.getItem(LS_TITLES_AT) || 0)
      const fresh = Date.now() - cachedAt < TITLES_TTL
      if (!force && fresh && this.titlesList.length) return true

      if (isOffline()) return false

      this.loadingTitles = true
      try {
        const res = await fetchReflectionTitles()
        const list = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.TITLES) ? res.TITLES : [])

        if (list.length) {
          this.titlesList = list
          writeLS(LS_TITLES, list)
          localStorage.setItem(LS_TITLES_AT, String(Date.now()))
          return true
        }
        return false
      } catch {
        return false
      } finally {
        this.loadingTitles = false
      }
    },

    async send() {
      if (this.sending || this.sentToday) return false
      if (!this.canSubmit) return false

      this.sending = true
      this.error = null
      try {
        const auth = useAuthStore()
        const res = await sendReflection({
          ID_USER: auth.idUser,
          TEXT: this.text.trim(),
          LOCAL_DATETIME: localDateTime(),
        })

        if (res?.RESULT === 'ALREADY_SENT') {
          this.sentToday = true
          try { localStorage.setItem(LS_SENT_DATE, localDate()) } catch {}
          return false
        }

        if (isSuccess(res)) {
          this.sentToday = true
          this.lastSentAt = res.SERVER_DATETIME || null
          this.text = ''
          try { localStorage.setItem(LS_SENT_DATE, localDate()) } catch {}
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
  },
})