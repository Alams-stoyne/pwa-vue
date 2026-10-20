import { defineStore } from 'pinia'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useThemeStore } from '../theme/store'
import { isOffline, OfflineError } from '../core/utils/network'
import { sendDaily, fetchDailyStatus, fetchTodayState } from './api'

const LS_LAST = 'home.lastSendDate'
const LS_LAST_TIME = 'home.lastSyncAt'
const LS_QUEUE = 'home.queue'
const LS_TODAY = 'home.today'
const LS_TODAY_AT = 'home.todayAt'
const LS_SNAPSHOT = 'home.today.snapshot'

const HOUR = 60 * 60 * 1000
const TODAY_TTL = 30 * 60 * 1000

function queueFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]') } catch { return [] }
}

function readTodayCache() {
  try {
    const raw = localStorage.getItem(LS_TODAY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed._date !== localDate()) return null
    return parsed
  } catch { return null }
}

function writeTodayCache(today) {
  try {
    localStorage.setItem(LS_TODAY, JSON.stringify({ ...today, _date: localDate() }))
    localStorage.setItem(LS_TODAY_AT, String(Date.now()))
  } catch {}
}

/* ─── Снимок «последнего показанного» ───────────────────────── */
function readSnapshot() {
  try {
    const raw = localStorage.getItem(LS_SNAPSHOT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.date !== localDate()) return null
    return parsed
  } catch { return null }
}

function writeSnapshot(actions) {
  try {
    const snap = { date: localDate(), actions: {} }
    for (const [key, a] of Object.entries(actions || {})) {
      snap.actions[key] = a?.done ? (a.status || true) : false
    }
    localStorage.setItem(LS_SNAPSHOT, JSON.stringify(snap))
  } catch {}
}

function clearSnapshot() {
  try { localStorage.removeItem(LS_SNAPSHOT) } catch {}
}

function diffActions(prev, current) {
  const newlyDone = []
  const newlyVerified = []
  const prevA = prev?.actions || {}

  for (const [key, action] of Object.entries(current || {})) {
    if (!action?.exists) continue
    const was = prevA[key] ?? false
    const is  = action.done ? (action.status || true) : false

    if (!was && is) {
      newlyDone.push({
        key,
        label: action.label || key,
        emoji: action.emoji || '',
      })
    } else if (was === 'pending' && is === 'approved') {
      newlyVerified.push({
        key,
        label: action.label || key,
        emoji: action.emoji || '',
      })
    }
  }
  return { newlyDone, newlyVerified }
}

let _netWatched = false

export const useHomeStore = defineStore('home', {
  state: () => ({
    // «Читаю сегодня» — старая логика, оставляем
    lastSendDate: localStorage.getItem(LS_LAST) || null,
    lastSyncAt: Number(localStorage.getItem(LS_LAST_TIME) || 0),
    sending: false,
    syncing: false,
    error: null,
    justSent: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,

    // Виджет «Сегодня»
    today: readTodayCache(),
    todayLoading: false,
    todayError: null,

    // Дифф с прошлого просмотра — для Mascot
    newlyDone: [],
    newlyVerified: [],
  }),

  getters: {
    canSendToday: (s) => s.lastSendDate !== localDate(),

    hasToday: (s) => !!s.today && !!s.today.title,

    hasTodayButton: (s) =>
      !!s.today
      && s.today.state !== 'done'
      && !!s.today.buttonLabel
      && !!s.today.buttonAction,

    progressDone:    (s) => Number(s.today?.progress?.done)    || 0,
    progressTotal:   (s) => Number(s.today?.progress?.total)   || 0,
    progressPercent: (s) => Number(s.today?.progress?.percent) || 0,
    allDone:         (s) => s.today?.state === 'done',
  },

  actions: {
    load() {
      this.lastSendDate = localStorage.getItem(LS_LAST) || null
      this.lastSyncAt = Number(localStorage.getItem(LS_LAST_TIME) || 0)
      this.initNetworkWatcher()
    },

    initNetworkWatcher() {
      if (_netWatched) return
      _netWatched = true

      window.addEventListener('online', () => {
        this.online = true
        this.flushQueue()
        this.syncFromServer({ force: true })
        this.refreshToday()
      })
      window.addEventListener('offline', () => { this.online = false })

      setInterval(() => this.syncFromServer(), HOUR)
    },

    async sendToday() { /* без изменений — см. предыдущий код */ },
    async flushQueue() { /* без изменений */ },
    async syncFromServer(opts = {}) { /* без изменений */ },

    /**
     * Загрузить состояние виджета «Сегодня».
     * @param {{ force?: boolean, commitSnapshot?: boolean }} opts
     *   commitSnapshot: true — считать дифф с прошлого снимка
     *   И перезаписать снимок текущим состоянием.
     *   Использовать ТОЛЬКО из HomeView.onMounted.
     */
    async loadToday({ force = false, commitSnapshot = false } = {}) {
      const cachedAt = Number(localStorage.getItem(LS_TODAY_AT) || 0)
      const fresh = Date.now() - cachedAt < TODAY_TTL
      if (!force && fresh && this.today) return true

      if (isOffline()) return false

      const auth = useAuthStore()
      if (!auth.idUser) return false

      // Снимок читаем ДО перезаписи
      const prevSnapshot = commitSnapshot ? readSnapshot() : null
      const hasPrev = !!prevSnapshot && prevSnapshot.date === localDate()

      this.todayLoading = true
      this.todayError = null
      try {
        const res = await fetchTodayState({ ID_USER: auth.idUser })
        if (isSuccess(res) && res.TODAY && typeof res.TODAY === 'object') {
          this.today = res.TODAY
          writeTodayCache(res.TODAY)

          if (commitSnapshot) {
            const { newlyDone, newlyVerified } = hasPrev
              ? diffActions(prevSnapshot, res.TODAY.actions)
              : { newlyDone: [], newlyVerified: [] }
            this.newlyDone = newlyDone
            this.newlyVerified = newlyVerified
            writeSnapshot(res.TODAY.actions)
          } else {
            this.newlyDone = []
            this.newlyVerified = []
          }
          return true
        }

        this.today = null
        try { localStorage.removeItem(LS_TODAY) } catch {}
        try { localStorage.removeItem(LS_TODAY_AT) } catch {}
        return false
      } catch (e) {
        this.todayError = e.message || 'Ошибка загрузки'
        return false
      } finally {
        this.todayLoading = false
      }
    },

    async refreshToday(opts = {}) {
      return this.loadToday({ force: true, ...opts })
    },

    resetToday() {
      this.today = null
      this.todayError = null
      this.newlyDone = []
      this.newlyVerified = []
      try { localStorage.removeItem(LS_TODAY) } catch {}
      try { localStorage.removeItem(LS_TODAY_AT) } catch {}
      clearSnapshot()
    },
  },
})