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

/**
 * Разбор ответа сервера /events/action.
 *
 * Контракт сервера:
 *   Успех:      { RESULT: 'OK',    CLICKED_AT?, CONFIRMED_AT?, REWARD_POINTS?, REWARD_TEXT?, ALREADY? }
 *   Ошибка:     { RESULT: 'ERROR', REASON: 'NO_CLICK' | 'TOO_EARLY' | 'RATE_LIMITED'
 *                                  | 'ALREADY_CONFIRMED' | 'EXPIRED', MESSAGE }
 *
 * @returns {{
 *   ok: boolean,
 *   reason?: string,
 *   already?: boolean,
 *   clickedAt?: number,
 *   confirmedAt?: number,
 *   rewardPoints?: number,
 *   rewardText?: string,
 *   message?: string,
 * }}
 */
function parseActionResponse(res) {
  if (!res || typeof res !== 'object') {
    return { ok: false, reason: 'BAD_RESPONSE', message: 'Некорректный ответ сервера' }
  }

  const clickedAt = res.CLICKED_AT ? new Date(res.CLICKED_AT).getTime() : undefined
  const confirmedAt = res.CONFIRMED_AT ? new Date(res.CONFIRMED_AT).getTime() : undefined
  const rewardPoints = Number(res.REWARD_POINTS) || 0
  const rewardText = res.REWARD_TEXT || ''
  const already = res.ALREADY === true

  if (isSuccess(res)) {
    return {
      ok: true,
      already,
      clickedAt,
      confirmedAt,
      rewardPoints,
      rewardText,
      message: res.MESSAGE,
    }
  }

  return {
    ok: false,
    reason: res.REASON || null,
    already,
    clickedAt,
    confirmedAt,
    rewardPoints,
    rewardText,
    message: res.MESSAGE || 'Ошибка сервера',
  }
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

      const st = s.states[eventId] || {}

      // 1. Подтверждено
      if (st.confirmedAt) return { status: 'done', timeLeft: 0 }

      // 2. Click отправляется
      if (st.clickPending) return { status: 'click_pending', timeLeft: 0 }

      // 3. Click в очереди (офлайн)
      if (st.clickQueued) return { status: 'click_queued', timeLeft: 0 }

      // 4. Click провалился
      if (st.clickError) {
        return { status: 'click_failed', timeLeft: 0, error: st.clickError }
      }

      // 5. Клик был — считаем таймер
      if (st.clickedAt) {
        const cooldownMs = (event.timerMins || 0) * 60 * 1000
        const expireAt = st.clickedAt + cooldownMs
        const timeLeft = expireAt - s.now

        if (timeLeft > 0) return { status: 'timer', timeLeft }

        // Таймер вышел, но клик сервером не подтверждён
        if (!st.clickConfirmed) {
          return { status: 'click_failed', timeLeft: 0, error: 'клик не подтверждён сервером' }
        }

        if (st.confirmQueued) return { status: 'confirm_queued', timeLeft: 0 }

        return {
          status: 'ready_to_confirm',
          timeLeft: 0,
          confirmPending: !!st.confirmPending,
        }
      }

      return { status: 'available', timeLeft: 0 }
    },
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
          this.loadEvents({ force: true })
        },
      )
    },

    async loadEvents({ force = false } = {}) {
      const period = usePeriod()
      const today = localDate()

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

        if (isFresh && this.config.length > 0) return

        if (this.config.length > 0) {
          const hasUnstable = this.config.some(e => {
            const st = this.eventState(e.id)
            return st.status === 'available'
              || st.status === 'ready_to_confirm'
              || st.status === 'click_failed'
              || st.status === 'click_queued'
          })
          if (!hasUnstable) return
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
                clickConfirmed: !!finalClicked,
                clickPending: false,
                clickQueued: false,
                clickError: null,
                confirmPending: false,
                confirmQueued: false,
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

    /**
     * Клик по событию.
     *
     * @returns {{ success: boolean, queued?: boolean, already?: boolean, error?: string }}
     */
    async clickEvent(eventId) {
      const auth = useAuthStore()
      if (!auth.idUser) return { success: false, error: 'не авторизован' }

      if (this.states[eventId]?.clickPending) return { success: false }

      const now = Date.now()

      this.states[eventId] = {
        ...this.states[eventId],
        clickedAt: this.states[eventId]?.clickedAt || now,
        clickPending: true,
        clickQueued: false,
        clickError: null,
        clickConfirmed: false,
      }
      writeLS(LS_STATE, this.states)
      this.now = now

      const payload = { ID_USER: auth.idUser, EVENT_ID: eventId, ACTION: 'click' }

      if (isOffline()) {
        const q = readLS(LS_QUEUE, [])
        q.push({ ...payload, _ts: now })
        writeLS(LS_QUEUE, q)
        this.states[eventId] = {
          ...this.states[eventId],
          clickPending: false,
          clickQueued: true,
        }
        writeLS(LS_STATE, this.states)
        return { success: false, queued: true }
      }

      try {
        // keepalive: запрос не отменится при уходе вкладки в фон
        const res = await sendEventAction(payload, { keepalive: true })
        const parsed = parseActionResponse(res)

        if (parsed.ok) {
          // Успех (в т.ч. ALREADY: true — клик уже был)
          this.states[eventId] = {
            ...this.states[eventId],
            clickedAt: parsed.clickedAt || now,
            clickConfirmed: true,
            clickPending: false,
            clickQueued: false,
            clickError: null,
            // Если событие уже было подтверждено (ALREADY: true + CONFIRMED_AT)
            ...(parsed.confirmedAt ? { confirmedAt: parsed.confirmedAt } : {}),
          }
          writeLS(LS_STATE, this.states)
          this._removeQueuedClick(eventId)

          // Если сервер сообщил, что событие уже было подтверждено —
          // не начисляем повторно, но синхронизируем локальное состояние
          if (parsed.confirmedAt) {
            this.now = Date.now()
            return { success: true, already: true }
          }

          return { success: true, already: parsed.already }
        }

        // Ошибка клика
        this.states[eventId] = {
          ...this.states[eventId],
          clickConfirmed: false,
          clickPending: false,
          clickQueued: false,
          clickError: parsed.message || 'клик отклонён сервером',
        }
        writeLS(LS_STATE, this.states)
        return { success: false, error: parsed.message || 'клик отклонён' }
      } catch (e) {
        const q = readLS(LS_QUEUE, [])
        q.push({ ...payload, _ts: now })
        writeLS(LS_QUEUE, q)
        this.states[eventId] = {
          ...this.states[eventId],
          clickConfirmed: false,
          clickPending: false,
          clickQueued: true,
        }
        writeLS(LS_STATE, this.states)
        return { success: false, queued: true }
      }
    },

    /**
     * Подтверждение события.
     *
     * Гарантия: confirm отправляется на сервер только после того,
     * как click подтверждён (clickConfirmed = true).
     * Если сервер вернул NO_CLICK — один автоматический retry (click → confirm).
     *
     * @param {string} eventId
     * @param {number} _retryCount — внутренний
     * @returns {Promise<{
     *   success: boolean, already?: boolean, queued?: boolean,
     *   message?: string, rewardPoints?: number, rewardText?: string
     * }>}
     */
    async confirmEvent(eventId, _retryCount = 0) {
      if (this.states[eventId]?.confirmPending) return { success: false }

      const auth = useAuthStore()
      if (!auth.idUser) return { success: false, message: 'не авторизован' }

      this.states[eventId] = { ...this.states[eventId], confirmPending: true }
      writeLS(LS_STATE, this.states)

      // ── Шаг 1: если клик не подтверждён сервером — досылаем click ──
      if (!this.states[eventId]?.clickConfirmed) {
        const clickResult = await this.clickEvent(eventId)
        if (!clickResult.success) {
          this.states[eventId] = { ...this.states[eventId], confirmPending: false }
          writeLS(LS_STATE, this.states)

          if (clickResult.queued) {
            return {
              success: false,
              message: 'Клик будет отправлен при подключении к сети. Повторите подтверждение.',
            }
          }
          return {
            success: false,
            message: clickResult.error || 'Клик не прошёл. Нажмите на событие ещё раз.',
          }
        }
      }

      const payload = { ID_USER: auth.idUser, EVENT_ID: eventId, ACTION: 'confirm' }

      if (isOffline()) {
        const q = readLS(LS_QUEUE, [])
        q.push({ ...payload, _ts: Date.now() })
        writeLS(LS_QUEUE, q)
        this.states[eventId] = {
          ...this.states[eventId],
          confirmPending: false,
          confirmQueued: true,
        }
        writeLS(LS_STATE, this.states)
        return { success: true, queued: true }
      }

      try {
        const res = await sendEventAction(payload)
        const parsed = parseActionResponse(res)

        // ── Успех или ALREADY ──
        if (parsed.ok) {
          const at = parsed.confirmedAt || Date.now()
          this.states[eventId] = {
            ...this.states[eventId],
            confirmedAt: at,
            clickConfirmed: true,
            clickPending: false,
            clickQueued: false,
            clickError: null,
            confirmPending: false,
            confirmQueued: false,
          }
          writeLS(LS_STATE, this.states)
          this.now = Date.now()

          if (parsed.rewardPoints > 0 && !parsed.already) {
            try { useStatsStore().addApplesLocally(parsed.rewardPoints) } catch { /* ignore */ }
          }

          return {
            success: true,
            already: parsed.already,
            rewardPoints: parsed.rewardPoints,
            rewardText: parsed.rewardText,
          }
        }

        // ── NO_CLICK — сервер не видит клика ──
        if (parsed.reason === 'NO_CLICK') {
          this.states[eventId] = {
            ...this.states[eventId],
            clickConfirmed: false,
            clickPending: false,
            clickQueued: false,
            clickError: 'клик не зафиксирован сервером',
            confirmPending: false,
            confirmQueued: false,
          }
          writeLS(LS_STATE, this.states)

          if (_retryCount < 1) {
            return this.confirmEvent(eventId, _retryCount + 1)
          }
          return {
            success: false,
            message: 'Клик не зафиксирован сервером. Нажмите на событие ещё раз и получите награду.',
          }
        }

        // ── ALREADY_CONFIRMED (как ошибка) ──
        if (parsed.reason === 'ALREADY_CONFIRMED') {
          const at = parsed.confirmedAt || Date.now()
          this.states[eventId] = {
            ...this.states[eventId],
            confirmedAt: at,
            clickConfirmed: true,
            confirmPending: false,
            confirmQueued: false,
          }
          writeLS(LS_STATE, this.states)
          this.now = Date.now()
          return {
            success: true,
            already: true,
            message: parsed.message || 'Вы уже получили награду за это событие.',
          }
        }

        // ── TOO_EARLY ──
        if (parsed.reason === 'TOO_EARLY') {
          this.states[eventId] = { ...this.states[eventId], confirmPending: false }
          writeLS(LS_STATE, this.states)
          return {
            success: false,
            message: parsed.message || 'Слишком рано подтверждать.',
          }
        }

        // ── RATE_LIMITED ──
        if (parsed.reason === 'RATE_LIMITED') {
          this.states[eventId] = { ...this.states[eventId], confirmPending: false }
          writeLS(LS_STATE, this.states)
          return {
            success: false,
            message: parsed.message || 'Слишком часто. Попробуйте позже.',
          }
        }

        // ── EXPIRED ──
        if (parsed.reason === 'EXPIRED') {
          this.states[eventId] = { ...this.states[eventId], confirmPending: false }
          writeLS(LS_STATE, this.states)
          return {
            success: false,
            message: parsed.message || 'Событие больше неактивно.',
          }
        }

        // ── Прочие ошибки ──
        this.states[eventId] = { ...this.states[eventId], confirmPending: false }
        writeLS(LS_STATE, this.states)
        return {
          success: false,
          message: parsed.message || 'Ошибка подтверждения',
        }
      } catch (e) {
        const q = readLS(LS_QUEUE, [])
        q.push({ ...payload, _ts: Date.now() })
        writeLS(LS_QUEUE, q)
        this.states[eventId] = {
          ...this.states[eventId],
          confirmPending: false,
          confirmQueued: true,
        }
        writeLS(LS_STATE, this.states)
        return { success: true, queued: true }
      }
    },

    async flushQueue() {
      if (isOffline()) return
      const q = readLS(LS_QUEUE, [])
      if (!q.length) return

      // Сортируем: сначала все click, потом confirm — чтобы избежать NO_CLICK
      const sorted = [...q].sort((a, b) => {
        if (a.ACTION === b.ACTION) return (a._ts || 0) - (b._ts || 0)
        return a.ACTION === 'click' ? -1 : 1
      })

      const remain = []
      for (const p of sorted) {
        const { _ts, ...cleanPayload } = p
        try {
          const res = await sendEventAction(cleanPayload)
          this._applyActionResponse(cleanPayload, res)
        } catch {
          remain.push(p)
        }
      }
      writeLS(LS_QUEUE, remain)
    },

    _applyActionResponse(payload, res) {
      const { EVENT_ID, ACTION } = payload
      if (!EVENT_ID || !res) return

      const parsed = parseActionResponse(res)

      if (ACTION === 'click') {
        if (parsed.ok) {
          this.states[EVENT_ID] = {
            ...this.states[EVENT_ID],
            clickedAt: parsed.clickedAt || Date.now(),
            clickConfirmed: true,
            clickPending: false,
            clickQueued: false,
            clickError: null,
            ...(parsed.confirmedAt ? { confirmedAt: parsed.confirmedAt } : {}),
          }
        } else {
          this.states[EVENT_ID] = {
            ...this.states[EVENT_ID],
            clickConfirmed: false,
            clickPending: false,
            clickQueued: false,
            clickError: parsed.message || 'клик отклонён',
          }
        }
        writeLS(LS_STATE, this.states)
        return
      }

      if (ACTION === 'confirm') {
        if (parsed.ok || parsed.reason === 'ALREADY_CONFIRMED') {
          this.states[EVENT_ID] = {
            ...this.states[EVENT_ID],
            confirmedAt: parsed.confirmedAt || Date.now(),
            clickConfirmed: true,
            clickQueued: false,
            clickError: null,
            confirmPending: false,
            confirmQueued: false,
          }
          writeLS(LS_STATE, this.states)
        } else {
          this.states[EVENT_ID] = {
            ...this.states[EVENT_ID],
            confirmPending: false,
            confirmQueued: false,
          }
          writeLS(LS_STATE, this.states)
        }
      }
    },

    _removeQueuedClick(eventId) {
      const q = readLS(LS_QUEUE, [])
      const filtered = q.filter(
        (p) => !(p.EVENT_ID === eventId && p.ACTION === 'click'),
      )
      if (filtered.length !== q.length) writeLS(LS_QUEUE, filtered)
    },
  },
})