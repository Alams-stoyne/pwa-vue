import { defineStore } from 'pinia'
import { fetchEventsForDate, fetchEventsStatus, sendEventAction } from './api'
import { localDate } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { isOffline } from '../core/utils/network'

const LS_CACHE = 'events.cache'
const LS_CACHE_DATE = 'events.cacheDate'
const LS_CACHE_AT = 'events.cacheAt'
const LS_STATE = 'events.state'
const HOUR = 60 * 60 * 1000

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export const useEventsStore = defineStore('events', {
  state: () => ({
    config: [],
    loading: false,
    error: null,
    // Состояния пользователя: { [eventId]: { clickedAt: timestamp, confirmedAt: timestamp } }
    states: readLS(LS_STATE, {}),
    now: Date.now(),
  }),

  getters: {
    /** События на сегодня (файл уже содержит только их) */
    todayEvents: (s) => s.config,

    /** Вычисляет текущий статус события для UI */
    eventState: (s) => (eventId) => {
      const event = s.config.find((e) => e.id === eventId)
      if (!event) return { status: 'unknown', timeLeft: 0 }

      const userState = s.states[eventId] || {}
      
      // 1. Уже подтверждено
      if (userState.confirmedAt) {
        return { status: 'done', timeLeft: 0 }
      }

      // 2. Был клик, проверяем таймер
      if (userState.clickedAt) {
        const cooldownMs = (event.timerMins || 0) * 60 * 1000
        const expireAt = userState.clickedAt + cooldownMs
        const timeLeft = expireAt - s.now
        
        if (timeLeft > 0) {
          return { status: 'timer', timeLeft }
        } else {
          // Время вышло, ждем подтверждения
          return { status: 'ready_to_confirm', timeLeft: 0 }
        }
      }

      // 3. Еще не начинал
      return { status: 'available', timeLeft: 0 }
    }
  },

  actions: {
    init() {
      this.loadEvents()
      this.syncStatus()
      
      // Тикер для обновления таймеров на экране
      setInterval(() => {
        this.now = Date.now()
      }, 1000)
    },

    async loadEvents({ force = false } = {}) {
      const today = localDate()
      const cachedDate = localStorage.getItem(LS_CACHE_DATE)
      const cachedAt = Number(localStorage.getItem(LS_CACHE_AT) || 0)
      const fresh = Date.now() - cachedAt < HOUR
      const isSameDay = cachedDate === today

      // Если кэш свежий и на сегодня — выходим
      if (!force && fresh && isSameDay && this.config.length) return true

      // Подтягиваем кэш, если он на сегодня
      if (!force && isSameDay && this.config.length === 0) {
        this.config = readLS(LS_CACHE, [])
      }

      if (isOffline()) return false

      this.loading = !this.config.length
      try {
        const events = await fetchEventsForDate(today)
        this.config = events
        writeLS(LS_CACHE, events)
        localStorage.setItem(LS_CACHE_DATE, today)
        localStorage.setItem(LS_CACHE_AT, String(Date.now()))
        return true
      } catch (e) {
        this.error = e.message
        return false
      } finally {
        this.loading = false
      }
    },

    async syncStatus() {
      const auth = useAuthStore()
      if (!auth.idUser || isOffline()) return

      try {
        const res = await fetchEventsStatus({ ID_USER: auth.idUser })
        if (isSuccess(res) && res.STATES) {
          // Сервер возвращает только те, по которым есть действия
          this.states = { ...this.states, ...res.STATES }
          writeLS(LS_STATE, this.states)
        }
      } catch { /* ignore */ }
    },

    async clickEvent(eventId) {
      // Оптимистично ставим локальное время, только если еще не было клика
      if (!this.states[eventId]?.clickedAt) {
        this.states[eventId] = { ...this.states[eventId], clickedAt: Date.now() }
        writeLS(LS_STATE, this.states)
        this.now = Date.now()
      }

      const auth = useAuthStore()
      if (auth.idUser && !isOffline()) {
        try {
          const res = await sendEventAction({
            ID_USER: auth.idUser,
            EVENT_ID: eventId,
            ACTION: 'click'
          })
          
          // Бэкенд вернул ALREADY: true (уже подтверждено или уже кликали)
          if (res.ALREADY) {
            if (res.CLICKED_AT && !this.states[eventId]?.clickedAt) {
               this.states[eventId] = { ...this.states[eventId], clickedAt: new Date(res.CLICKED_AT).getTime() }
               writeLS(LS_STATE, this.states)
            }
          }
        } catch (e) {
          console.warn('[events] Failed to sync click:', e)
        }
      }
    },

    async confirmEvent(eventId) {
      const auth = useAuthStore()
      
      // Оптимистично ставим confirmedAt
      this.states[eventId] = { ...this.states[eventId], confirmedAt: Date.now() }
      writeLS(LS_STATE, this.states)
      this.now = Date.now()

      if (auth.idUser && !isOffline()) {
        try {
          const res = await sendEventAction({
            ID_USER: auth.idUser,
            EVENT_ID: eventId,
            ACTION: 'confirm'
          })
          
          if (res.RESULT === 'ALREADY_CONFIRMED') {
             return { success: true, already: true, message: 'Вы уже получили награду за это событие.' }
          }
          
          if (res.RESULT === 'TOO_EARLY') {
             // Откатываем подтверждение, если сервер говорит, что рано
             delete this.states[eventId].confirmedAt
             writeLS(LS_STATE, this.states)
             
             let msg = 'Слишком рано подтверждать.'
             if (res.RETRY_AFTER_SECONDS) {
                const min = Math.ceil(res.RETRY_AFTER_SECONDS / 60)
                msg = `Подождите еще ${min} мин.`
             }
             return { success: false, message: msg }
          }

          if (res.RESULT === 'RATE_LIMITED') {
             delete this.states[eventId].confirmedAt
             writeLS(LS_STATE, this.states)
             return { success: false, message: res.MESSAGE || 'Слишком часто. Попробуйте позже.' }
          }

          if (!isSuccess(res)) {
             delete this.states[eventId].confirmedAt
             writeLS(LS_STATE, this.states)
             return { success: false, message: res.MESSAGE || 'Ошибка подтверждения' }
          }
          
          return { success: true, already: false }
        } catch (e) {
           // В офлайне оставляем оптимистично
           return { success: true, already: false }
        }
      }
      
      return { success: true, already: false }
    }
  }
})