import { defineStore } from 'pinia'
import { watch } from 'vue'
import { fetchEventsForDate, fetchEventsStatus, sendEventAction } from './api'
import { localDate } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useStatsStore } from '../stats/store'
import { usePeriod } from '../core/period'
import { isOffline } from '../core/utils/network'

const LS_CACHE = 'events.cache'
const LS_CACHE_DATE = 'events.cacheDate'
const LS_CACHE_AT = 'events.cacheAt'
const LS_STATE = 'events.state'
const LS_STATE_SYNC_AT = 'events.statusSyncAt'
const LS_QUEUE = 'events.queue'
const HOUR = 60 * 60 * 1000
const STATUS_TTL = 15 * 60 * 1000

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
let _authWatched = false
let _periodWatched = false

export const useEventsStore = defineStore('events', {
  state: () => ({
    config: [],
    loading: false,
    error: null,
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
      this._watchAuth()
      this._watchPeriod()

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
        this.syncStatus({ force: true })
        this.loadEvents({ force: true })
      })
    },

    _watchAuth() {
      if (_authWatched) return
      _authWatched = true
      const auth = useAuthStore()

      if (!auth.idUser) {
        const stop = watch(() => auth.idUser, (newId) => {
          if (newId) {
            this.syncStatus({ force: true })
            stop()
          }
        })
      }
    },

    _watchPeriod() {
      if (_periodWatched) return
      _periodWatched = true
      const period = usePeriod()
      watch(
        () => period.range.value,
        (newRange, oldRange) => {
          if (!newRange || !oldRange) return
          if (newRange.from === oldRange.from && newRange.to === oldRange.to) return
          // Период изменился — перезагружаем события
          this.loadEvents({ force: true })
        },
      )
    },

    async loadEvents({ force = false } = {}) {
      const period = usePeriod()
      const today = localDate()

      // ▼ Вне периода — очищаем и не грузим ▼
      if (!period.isInPeriod(today)) {
        if (this.config.length) {
          this.config = []
          try { localStorage.removeItem(LS_CACHE) } catch {}
          try { localStorage.removeItem(LS_CACHE_DATE) } catch {}
          try { localStorage.removeItem(LS_CACHE_AT) } catch {}
        }
        this.loading = false
        this.error = null
        return false
      }

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

    async syncStatus({ force = false } = {}) {
      const auth = useAuthStore()
      if (!auth.idUser || isOffline()) return

      if (!force) {
        const lastSync = Number(localStorage.getItem(LS_STATE_SYNC_AT) || 0)
        const isFresh = Date.now() - lastSync < STATUS_TTL

        if (isFresh && this.config.length > 0) {
          return
        }

        if (this.config.length > 0) {
          const hasUnstable = this.config.some(e => {
            const st = this.eventState(e.id)
            return st.status === 'available' || st.status === 'ready_to_confirm'
          })

          if (!hasUnstable) {
            return
          }
        }
      }

      try {
        const res = await fetchEventsStatus({ ID_USER: auth.idUser })

        if (isSuccess(res) && res.STATES) {
          const merged = { ...this.states }

          for (const [id, srvState] of Object.entries(res.STATES)) {
            const local = merged[id] || {}

            const rawClicked = srvState.CLICKED_AT || srvState.clicked_at
            const rawConfirmed = srvState.CONFIRMED_AT || srvState.confirmed_at

            const srvClicked = rawClicked ? new Date(rawClicked).getTime() : 0
            const srvConfirmed = rawConfirmed ? new Date(rawConfirmed).getTime() : 0

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

          localStorage.setItem(LS_STATE_SYNC_AT, String(Date.now()))
        }
      } catch (e) {
        console.warn('[events] syncStatus failed:', e)
      }
    },

    async clickEvent(eventId) {
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

        if (res.CLICKED_AT) {
          this.states[eventId] = {
            ...this.states[eventId],
            clickedAt: new Date(res.CLICKED_AT).getTime()
          }
        }

        if (res.CONFIRMED_AT) {
          this.states[eventId] = {
            ...this.states[eventId],
            confirmedAt: new Date(res.CONFIRMED_AT).getTime()
          }
        }

        writeLS(LS_STATE, this.states)

        if (res.REWARD_POINTS) {
           const ev = this.config.find(e => e.id === eventId)
           if (ev) {
             ev.rewardPoints = res.REWARD_POINTS
             writeLS(LS_CACHE, this.config)
           }
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
          if (res.CONFIRMED_AT) {
            this.states[eventId].confirmedAt = new Date(res.CONFIRMED_AT).getTime()
            writeLS(LS_STATE, this.states)
          }
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

        if (res.REWARD_POINTS) {
          try { useStatsStore().addApplesLocally(res.REWARD_POINTS) } catch { /* ignore */ }
        }

        return { success: true, already: false }
      } catch (e) {
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
          await sendEventAction(p)
        } catch {
          remain.push(p)
        }
      }
      writeLS(LS_QUEUE, remain)
    }
  }
})