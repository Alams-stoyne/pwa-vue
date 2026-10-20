import { defineStore } from 'pinia'
import { fetchGlobalStats, fetchPersonalStats } from './api'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { isOffline } from '../core/utils/network'

const LS_LOCAL  = 'stats.local'
const LS_SERVER = 'stats.server'
const LS_GLOBAL = 'stats.global'
const LS_TIMES  = 'stats.times'

const HOUR = 60 * 60 * 1000
const CHECK_INTERVAL = 60 * 1000
const QUEUE_INTERVAL = 15 * 1000

// ─── Динамические карты ───
// Темы и привычки теперь приходят с сервера, поэтому заранее
// известных ключей больше нет. День создаётся с пустыми словарями,
// а ключи добавляются по мере выполнения.
//
// Для совместимости с уже сохранёнными данными (где были ключи
// energy/antistress/body/balance/general/charging и water/workout/eyes)
// ничего специального делать не нужно: старые записи остаются,
// новые ключи просто добавляются рядом.

function emptyByTheme() { return {} }
function emptyByHabit() { return {} }

const PERIOD_DAYS = {
  today: 1,
  '7d':  7,
  '30d': 30,
  all:   Infinity,
}

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

/** Проверка, что локальные данные в новой схеме; иначе — сброс. */
function loadLocalStats() {
  const parsed = loadLS(LS_LOCAL, null)
  if (!parsed || typeof parsed !== 'object' || !parsed.byDate) {
    try { localStorage.removeItem(LS_LOCAL) } catch {}
    return { byDate: {} }
  }
  return parsed
}

function addDays(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}

/** Список дат YYYY-MM-DD за период */
function datesForPeriod(period) {
  const days = PERIOD_DAYS[period] ?? 7
  if (days === Infinity) return null // null = все даты из byDate
  const out = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i)
    out.push(localDate(d))
  }
  return out
}

function computeStreak(byDate) {
  const dates = Object.keys(byDate).filter((d) => {
    const day = byDate[d]
    return day && (day.lecturesRead || day.tasksDone || day.habitsDone)
  })
  if (!dates.length) return 0
  const set = new Set(dates)
  const today = new Date()
  const todayStr = localDate(today)
  const yStr = localDate(addDays(today, -1))
  let cursor
  if (set.has(todayStr)) cursor = today
  else if (set.has(yStr)) cursor = addDays(today, -1)
  else return 0
  let streak = 0
  while (set.has(localDate(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

function emptyDay() {
  return {
    lecturesRead: 0,
    tasksDone: 0,
    habitsDone: 0,
    byTheme: emptyByTheme(),
    byHabit: emptyByHabit(),
  }
}

/**
 * Мёрж двух карт по ключам (max).
 * Работает для любых ключей, включая те, что пришли с сервера
 * и появились в статистике впервые.
 */
function mergeMaps(a, b) {
  const out = { ...(a || {}) }
  for (const k of Object.keys(b || {})) {
    out[k] = Math.max(Number(out[k]) || 0, Number(b[k]) || 0)
  }
  return out
}

/** Подсчёт элементов в очередях localStorage */
function readQueueInfo() {
  const countArr = (key) => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return 0
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr.length : 0
    } catch { return 0 }
  }
  const lectures = countArr('lectures.readQueue')
  const tasks    = countArr('tasks.queue')
  const habits   = countArr('habits.queue')
  const profile  = localStorage.getItem('profile.pending') ? 1 : 0
  return {
    lectures, tasks, habits, profile,
    total: lectures + tasks + habits + profile,
  }
}

/** Карта серверной недельной активности: date → count */
function serverWeekMap(server) {
  const map = new Map()
  const list = Array.isArray(server?.weekActivity) ? server.weekActivity : []
  for (const item of list) {
    if (item && typeof item.date === 'string') {
      map.set(item.date, Number(item.count) || 0)
    }
  }
  return map
}

let _timer = null
let _queueTimer = null
let _netWatched = false

export const useStatsStore = defineStore('stats', {
  state: () => ({
    period: '7d',

    local: loadLocalStats(),

    server: loadLS(LS_SERVER, {
      lecturesRead: 0,
      tasksDone: 0,
      habitsDone: 0,
      daysActive: 0,
      streak: 0,
      byTheme: {},
      byHabit: {},
      weekActivity: [],
    }),

    global: loadLS(LS_GLOBAL, null),
    times: loadLS(LS_TIMES, { lastSyncAt: 0, lastGlobalAt: 0 }),

    queueInfo: readQueueInfo(),

    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    syncing: false,
    loadingGlobal: false,
    errorGlobal: null,
  }),

  getters: {
    periodDays: (s) => PERIOD_DAYS[s.period] ?? 7,
    periodDates: (s) => datesForPeriod(s.period),

    localAggregated: (s) => {
      const dates = datesForPeriod(s.period)
      const allowed = dates ? new Set(dates) : null

      const total = {
        LECTURES_READ: 0,
        TASKS_DONE: 0,
        HABITS_DONE: 0,
        DAYS_ACTIVE: 0,
        byTheme: {},
        byHabit: {},
      }
      const activeDays = new Set()

      for (const [date, day] of Object.entries(s.local.byDate || {})) {
        if (allowed && !allowed.has(date)) continue
        total.LECTURES_READ += day.lecturesRead || 0
        total.TASKS_DONE    += day.tasksDone    || 0
        total.HABITS_DONE   += day.habitsDone   || 0

        if (day.lecturesRead || day.tasksDone || day.habitsDone) activeDays.add(date)

        for (const [k, v] of Object.entries(day.byTheme || {})) {
          total.byTheme[k] = (total.byTheme[k] || 0) + (v || 0)
        }
        for (const [k, v] of Object.entries(day.byHabit || {})) {
          total.byHabit[k] = (total.byHabit[k] || 0) + (v || 0)
        }
      }
      total.DAYS_ACTIVE = activeDays.size
      return total
    },

    personal: (s) => {
      const la = s.localAggregated

      if (s.period === 'all') {
        return {
          LECTURES_READ: Math.max(la.LECTURES_READ, s.server.lecturesRead || 0),
          TASKS_DONE:    Math.max(la.TASKS_DONE,    s.server.tasksDone    || 0),
          HABITS_DONE:   Math.max(la.HABITS_DONE,   s.server.habitsDone   || 0),
          DAYS_ACTIVE:   Math.max(la.DAYS_ACTIVE,   s.server.daysActive   || 0),
          STREAK:        Math.max(
            computeStreak(s.local.byDate),
            s.server.streak || 0,
          ),
        }
      }

      return {
        LECTURES_READ: la.LECTURES_READ,
        TASKS_DONE:    la.TASKS_DONE,
        HABITS_DONE:   la.HABITS_DONE,
        DAYS_ACTIVE:   la.DAYS_ACTIVE,
        STREAK:        computeStreak(s.local.byDate),
      }
    },

    byTheme: (s) => {
      const la = s.localAggregated.byTheme
      if (s.period === 'all') return mergeMaps(la, s.server.byTheme)
      return la
    },

    byHabit: (s) => {
      const la = s.localAggregated.byHabit
      if (s.period === 'all') return mergeMaps(la, s.server.byHabit)
      return la
    },

    weekActivity: (s) => {
      const srv = serverWeekMap(s.server)
      const out = []
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i)
        const key = localDate(d)
        const day = s.local.byDate?.[key]

        const localCount = day
          ? (day.lecturesRead || 0) + (day.tasksDone || 0) + (day.habitsDone || 0)
          : 0
        const serverCount = srv.get(key) || 0
        const count = Math.max(localCount, serverCount)

        out.push({
          date: key,
          count,
          localCount,
          serverCount,
          source: count === 0 ? 'none'
                : serverCount > localCount ? 'server'
                : serverCount < localCount ? 'local'
                : 'both',
        })
      }
      return out
    },

    hasLocalData: (s) => Object.keys(s.local.byDate || {}).length > 0,

    nextSyncIn: (s) => Math.max(0, HOUR - (Date.now() - s.times.lastSyncAt)),
    nextGlobalIn: (s) => Math.max(0, HOUR - (Date.now() - s.times.lastGlobalAt)),
  },

  actions: {
    init() {
      this.online = !isOffline()
      this.refreshQueueInfo()
      this._watchNet()
      this._startTimer()
      this._startQueueTimer()
      this.syncPersonal({ force: true })
      this.loadGlobal({ force: true })
    },

    setPeriod(p) {
      if (p in PERIOD_DAYS) this.period = p
    },

    refreshQueueInfo() {
      this.queueInfo = readQueueInfo()
    },

    _watchNet() {
      if (_netWatched) return
      _netWatched = true
      window.addEventListener('online', () => {
        this.online = true
        this.syncPersonal({ force: true })
        this.loadGlobal({ force: true })
        this.refreshQueueInfo()
      })
      window.addEventListener('offline', () => {
        this.online = false
        this.refreshQueueInfo()
      })
    },

    _startTimer() {
      if (_timer) return
      _timer = setInterval(() => {
        this.syncPersonal()
        this.loadGlobal()
      }, CHECK_INTERVAL)
    },

    _startQueueTimer() {
      if (_queueTimer) return
      _queueTimer = setInterval(() => {
        this.refreshQueueInfo()
      }, QUEUE_INTERVAL)
    },

    // ─────────── Локальные инкременты ───────────

    _touchDay(mutator) {
      const today = localDate()
      if (!this.local.byDate) this.local.byDate = {}
      const day = this.local.byDate[today] || emptyDay()
      // гарантируем наличие словарей, сохраняя уже существующие ключи
      day.byTheme = { ...emptyByTheme(), ...(day.byTheme || {}) }
      day.byHabit = { ...emptyByHabit(), ...(day.byHabit || {}) }

      mutator(day)

      this.local.byDate[today] = day
      saveLS(LS_LOCAL, this.local)

      // подчистим старые дни (> 400)
      const keys = Object.keys(this.local.byDate).sort()
      if (keys.length > 400) {
        for (const k of keys.slice(0, keys.length - 400)) {
          delete this.local.byDate[k]
        }
        saveLS(LS_LOCAL, this.local)
      }
    },

    bumpLecturesRead(themeKey) {
      const key = String(themeKey || 'general').replace(/^lecture-/, '')
      this._touchDay((day) => {
        day.lecturesRead += 1
        // Добавляем ключ динамически — работает и для новых тем с сервера
        day.byTheme[key] = (day.byTheme[key] || 0) + 1
      })
      this.syncPersonal()
    },

    bumpTaskDone() {
      this._touchDay((day) => { day.tasksDone += 1 })
      this.syncPersonal()
    },

    bumpHabitDone(habitId) {
      this._touchDay((day) => {
        day.habitsDone += 1
        // Добавляем ключ динамически — работает и для новых привычек
        if (habitId) {
          day.byHabit[habitId] = (day.byHabit[habitId] || 0) + 1
        }
      })
      this.syncPersonal()
    },

    // ─────────── Синхронизация с сервером ───────────
    async syncPersonal({ force = false } = {}) {
      if (this.syncing) return false
      const now = Date.now()
      if (!force && now - this.times.lastSyncAt < HOUR) return false
      if (isOffline()) { this.online = false; return false }

      const auth = useAuthStore()
      if (!auth.idUser) return false

      this.syncing = true
      try {
        const res = await fetchPersonalStats({
          ID_USER: auth.idUser,
          LOCAL_DATETIME: localDateTime(),
        })

        if (isSuccess(res)) {
          this.server = {
            lecturesRead: Number(res.LECTURES_READ) || 0,
            tasksDone:    Number(res.TASKS_DONE)    || 0,
            habitsDone:   Number(res.HABITS_DONE)   || 0,
            daysActive:   Number(res.DAYS_ACTIVE)   || 0,
            streak:       Number(res.STREAK)        || 0,
            byTheme:      { ...(res.BY_THEME || {}) },
            byHabit:      { ...(res.BY_HABIT || {}) },
            weekActivity: Array.isArray(res.WEEK_ACTIVITY) ? res.WEEK_ACTIVITY : [],
          }
          this.times.lastSyncAt = now
          saveLS(LS_SERVER, this.server)
          saveLS(LS_TIMES, this.times)
          return true
        }
      } catch { /* ignore */ }
      finally { this.syncing = false }
      return false
    },

    async loadGlobal({ force = false } = {}) {
      if (this.loadingGlobal) return false
      const now = Date.now()
      if (!force && this.global && now - this.times.lastGlobalAt < HOUR) return false

      if (isOffline()) {
        this.online = false
        if (!this.global) this.errorGlobal = 'OFFLINE_EMPTY'
        return false
      }

      this.loadingGlobal = true
      this.errorGlobal = null
      try {
        this.global = await fetchGlobalStats()
        this.times.lastGlobalAt = now
        saveLS(LS_GLOBAL, this.global)
        saveLS(LS_TIMES, this.times)
        return true
      } catch (e) {
        if (!this.global) this.errorGlobal = 'Не удалось загрузить'
        return false
      } finally {
        this.loadingGlobal = false
      }
    },

    async loadPersonal(opts = {}) { return this.syncPersonal(opts) },
  },
})