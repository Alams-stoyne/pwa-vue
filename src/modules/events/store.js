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
const LS_QUEUE = 'events.queue'
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

let _tickTimer = null
let _netWatched = false

export const useEventsStore = defineStore('events', {
  state: () => ({
    config: [],
    loading: false,
    error: null,
    // Состояния пользователя: { [eventId]: { clickedAt, confirmedAt } }
    states: readLS(LS_STATE, {}),
    now: Date.now(),
  }),

  getters: {
    todayEvents: (s) => s.config,

    eventState: (s) => (eventId) => {
      const event = s.config.find((e) => e.id === eventId)
      if (!event) return { status: 'unknown', timeLeft: 0 }

      const userState = s.states[eventId] || {}
      
      if (userState.confirmedAt) {
        return { status: 'done', timeLeft: 0 }
      }

      if (userState.clickedAt) {
        const cooldownMs = (event.timerMins || 0) * 60 * 1000
        const expireAt = userState.clickedAt + cooldownMs
        const timeLeft = expireAt - s.now
        
        if (timeLeft > 0) {
          return { status: 'timer', timeLeft }
        } else {
          return { status: 'ready_to_confirm', timeLeft: 0 }
        }
      }

      return { status: 'available', timeLeft: 0 }
    }
  },

  actions: {
    init() {
      this._watchNet()
      
      this.loadEvents()
      this.syncStatus()

      if (!_tickTimer) {
        _tickTimer = setInterval(() => {
          this.now = Date.now()
        }, 1000)
      }
    },

    _watchNet() {
      if (_netWatched) return
      _netWatched = true
      window.addEventListener('online', () => {
        this.flushQueue()
        this.syncStatus()
        this.loadEvents({ force: true })
      })
    },

    async loadEvents({ force = false } = {}) {
      const today = localDate()
      const cachedDate = localStorage.getItem(LS_CACHE_DATE)
      const cachedAt = Number(localStorage.getItem(LS_CACHE_AT) || 0)
      const fresh = Date.now() - cachedAt < HOUR
      const isSameDay = cachedDate === today

      if (!force && fresh && isSameDay && this.config.length) return true

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
          const merged = { ...this.states }
          
          for (const [id, srvState] of Object.entries(res.STATES)) {
            const local = merged[id] || {}
            
            // Бэкенд присылает ISO-строки, переводим в timestamp
            const srvClicked = srvState.CLICKED_AT ? new Date(srvState.CLICKED_AT).getTime() : 0
            const srvConfirmed = srvState.CONFIRMED_AT ? new Date(srvState.CONFIRMED_AT).getTime() : 0
            
            // Мержим: берем максимум из локального и серверного, чтобы
            // не затереть локальный клик, если сервер еще не получил запрос
            const finalClicked = Math.max(local.clickedAt || 0, srvClicked) || undefined
            const finalConfirmed = Math.max(local.confirmedAt || 0, srvConfirmed) || undefined

            if (finalClicked || finalConfirmed) {
              merged[id] = {
                ...local,
                clickedAt: finalClicked,
                confirmedAt: finalConfirmed,
              }
            }
          }
          
          this.states = merged
          writeLS(LS_STATE, this.states)
        }
      } catch { /* ignore */ }
    },

    async clickEvent(eventId) {
      // Оптимистично ставим время
      if (!this.states[eventId]?.clickedAt) {
        this.states[eventId] = { ...this.states[eventId], clickedAt: Date.now() }
        writeLS(LS_STATE, this.states)
        this.now = Date.now()
      }

      const auth = useAuthStore()
      if (!auth.idUser) return

      const payload = { ID_USER: auth.idUser, EVENT_ID: eventId, ACTION: 'click' }

      if (isOffline()) {
        const q = readLS(LS_QUEUE, [])
        q.push(payload)
        writeLS(LS_QUEUE, q)
        return
      }

      try {
        const res = await sendEventAction(payload)
        if (res.ALREADY && res.CLICKED_AT && !this.states[eventId]?.clickedAt) {
          this.states[eventId] = { ...this.states[eventId], clickedAt: new Date(res.CLICKED_AT).getTime() }
          writeLS(LS_STATE, this.states)
        }
      } catch (e) {
        const q = readLS(LS_QUEUE, [])
        q.push(payload)
        writeLS(LS_QUEUE, q)
      }
    },

    async confirmEvent(eventId) {
      const auth = useAuthStore()
      
      this.states[eventId] = { ...this.states[eventId], confirmedAt: Date.now() }
      writeLS(LS_STATE, this.states)
      this.now = Date.now()

      if (!auth.idUser) return { success: true, already: false }

      const payload = { ID_USER: auth.idUser, EVENT_ID: eventId, ACTION: 'confirm' }

      if (isOffline()) {
        const q = readLS(LS_QUEUE, [])
        q.push(payload)
        writeLS(LS_QUEUE, q)
        return { success: true, already: false }
      }

      try {
        const res = await sendEventAction(payload)
        
        if (res.RESULT === 'ALREADY_CONFIRMED') {
          return { success: true, already: true, message: 'Вы уже получили награду за это событие.' }
        }
        
        if (res.RESULT === 'TOO_EARLY') {
          delete this.states[eventId].confirmedAt
          writeLS(LS_STATE, this.states)
          
          let msg = 'Слишком рано подтверждать.'
          if (res.RETRY_AFTER_SECONDS) {
            msg = `Подождите еще ${Math.ceil(res.RETRY_AFTER_SECONDS / 60)} мин.`
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
        // Оставляем оптимистично, уйдёт в очередь при онлайн
        const q = readLS(LS_QUEUE, [])
        q.push(payload)
        writeLS(LS_QUEUE, q)
        return { success: true, already: false }
      }
    },

    async flushQueue() {
      if (isOffline()) return
      const q = readLS(LS_QUEUE, [])
      if (!q.length) return

      const remain = []
      for (const p of q) {
        try {
          const res = await sendEventAction(p)
          // Если пришел TOO_EARLY или ошибка — можем выкинуть из очереди, 
          // так как клик уже не актуален, либо оставить. Оставляем только сетевые ошибки.
          if (!isSuccess(res) && res.RESULT !== 'ALREADY_CONFIRMED') {
             // Скорее всего, сервер отклонил. Повторять нет смысла.
          }
        } catch {
          remain.push(p)
        }
      }
      writeLS(LS_QUEUE, remain)
    }
  }
})