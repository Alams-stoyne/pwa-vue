import { defineStore } from 'pinia'
import { watch } from 'vue'
import {
  getHabit, habitsList, habitsComputed,
  getFallbackHabitsForTheme,
} from './config'
import {
  fetchHabitsConfig, sendHabitComplete, fetchHabits,
  fetchHabitSelection, saveHabitSelection,
} from './api'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useThemeStore } from '../theme/store'
import { useStatsStore } from '../stats/store'
import { useHomeStore } from '../home/store'
import { isOffline } from '../core/utils/network'
import {
  ensurePermission, schedule, cancel, cancelAll,
} from './notifications'

const LS_STATE = 'habits.state'
const LS_QUEUE = 'habits.queue'
const LS_LAST_TIME = 'habits.lastSyncAt'
const LS_CACHE = 'habits.cache'
const LS_CACHE_AT = 'habits.cacheAt'
const LS_CACHE_THEME = 'habits.cacheTheme'
const LS_SELECTED = 'habits.selectedHabitId'
const LS_SELECTED_DATA = 'habits.selectedHabitData'

const HOUR = 60 * 60 * 1000
const CACHE_TTL = 6 * 60 * 60 * 1000

function loadState() {
  try {
    const raw = localStorage.getItem(LS_STATE)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.date !== localDate()) return null
    return parsed
  } catch { return null }
}
function saveState(state) {
  try { localStorage.setItem(LS_STATE, JSON.stringify(state)) } catch {}
}
function queueFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]') } catch { return [] }
}
function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function extractHabitsForTheme(raw, themeId) {
  if (!raw) return null

  if (!Array.isArray(raw) && typeof raw === 'object') {
    if (Array.isArray(raw[themeId])) return raw[themeId]
    if (Array.isArray(raw.default)) return raw.default
    return null
  }
  if (Array.isArray(raw)) {
    const filtered = raw.filter((h) => !h.themeId || h.themeId === themeId)
    return filtered.length ? filtered : null
  }
  return null
}

let _netWatched = false
let _themeWatched = false
let _tickTimer = null

export const useHabitsStore = defineStore('habits', {
  state: () => ({
    data: (() => {
      const s = loadState()
      return s?.data || {}
    })(),
    date: localDate(),
    syncing: false,
    loading: false,
    error: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    lastSyncAt: Number(localStorage.getItem(LS_LAST_TIME) || 0),
    now: Date.now(),
    notificationsEnabled: false,
    selectedHabitId: localStorage.getItem(LS_SELECTED) || null,
    catalogList: [],
  }),

  getters: {
    selectedHabit: (s) => {
      if (!s.selectedHabitId) return null
      return habitsList.value.find((h) => h.id === s.selectedHabitId) || null
    },
    list: () => habitsComputed.value,
    catalog: (s) => s.catalogList,
    hasSelection: (s) => !!s.selectedHabitId,

    progress: (s) => (habitId) => {
      const h = getHabit(habitId)
      if (!h) return null
      const d = s.data[habitId] || { count: 0, lastAt: 0 }
      const lastAt = d.lastAt || 0
      const nextAt = lastAt ? lastAt + h.minIntervalMin * 60 * 1000 : 0
      const leftMs = Math.max(0, nextAt - s.now)
      const done = Math.min(d.count, h.timesPerDay)
      const canComplete = d.count < h.timesPerDay && leftMs === 0
      return { done, total: h.timesPerDay, lastAt, nextAt, canComplete, leftMs }
    },

    totalProgress: (s) => {
      let done = 0
      let total = 0
      for (const h of habitsComputed.value) {
        const d = s.data[h.id] || { count: 0 }
        done += Math.min(d.count, h.timesPerDay)
        total += h.timesPerDay
      }
      return { done, total }
    },

    allDoneToday: (s) => {
      const list = habitsComputed.value
      if (!list.length) return false
      for (const h of list) {
        const d = s.data[h.id] || { count: 0 }
        if (d.count < h.timesPerDay) return false
      }
      return true
    },
  },

  actions: {
    init() {
      this._ensureToday()
      this._startTick()
      this._watchNet()
      this._watchTheme()
      this.notificationsEnabled = (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      )
      this.loadHabits()
    },

    _ensureToday() {
      const today = localDate()
      if (this.date !== today) {
        this.date = today
        this.data = {}
        saveState({ date: today, data: {} })
        cancelAll()
      }
    },

    _startTick() {
      if (_tickTimer) return
      _tickTimer = setInterval(() => {
        this.now = Date.now()
        this._ensureToday()
      }, 1000)
    },

    _watchNet() {
      if (_netWatched) return
      _netWatched = true

      window.addEventListener('online', () => {
        this.online = true
        this.flushQueue()
        this.loadHabits({ force: true })
      })
      window.addEventListener('offline', () => { this.online = false })

      setInterval(() => this.loadHabits(), HOUR)
    },

    _watchTheme() {
      if (_themeWatched) return
      _themeWatched = true
      const theme = useThemeStore()
      watch(
        () => theme.selected,
        (newTheme, oldTheme) => {
          if (!newTheme || newTheme === oldTheme) return
          this.catalogList = []
          try { localStorage.removeItem(LS_CACHE) } catch {}
          this.loadHabits({ force: true })
        },
      )
    },

    async enableNotifications() {
      const ok = await ensurePermission()
      this.notificationsEnabled = ok
      if (ok) this._planAllNotifications()
      return ok
    },

    _planAllNotifications() {
      if (!this.notificationsEnabled) return
      for (const h of habitsComputed.value) {
        const p = this.progress(h.id)
        if (!p) continue
        if (p.done >= h.timesPerDay) { cancel(h.id); continue }
        if (p.canComplete) continue
        schedule(h.id, `${h.emoji || ''} ${h.title}`, h.hint, p.leftMs,
          () => { /* опционально: навигация */ })
      }
    },

    async loadSelection({ force = false } = {}) {
      if (!force && this.selectedHabitId) {
        if (this.catalogList.length && !habitsList.value.length) {
          this._applyFilterToHabitsList()
        }
        return this.selectedHabitId
      }

      if (!isOffline()) {
        const auth = useAuthStore()
        if (auth.idUser) {
          try {
            const res = await fetchHabitSelection({ ID_USER: auth.idUser })
            const habitId = res?.HABIT_ID || res?.HABIT || res?.SELECTED ||
                            res?.SELECTED_HABIT_ID || null
            if (isSuccess(res) && habitId) {
              this.selectedHabitId = habitId
              try { localStorage.setItem(LS_SELECTED, habitId) } catch {}
            }
          } catch { /* fallback to LS */ }
        }
      }
      if (this.selectedHabitId && this.catalogList.length) {
        this._applyFilterToHabitsList()
      }
      return this.selectedHabitId
    },

    async selectHabit(habitId) {
      if (!habitId) return false
      this.saving = true
      this.error = null
      try {
        const auth = useAuthStore()
        const res = await saveHabitSelection({
          ID_USER: auth.idUser,
          HABIT_ID: habitId,
        })
        if (isSuccess(res)) {
          this.selectedHabitId = habitId
          try { localStorage.setItem(LS_SELECTED, habitId) } catch {}

          const habitObj = this.catalogList.find((h) => h.id === habitId)
          if (habitObj) writeLS(LS_SELECTED_DATA, habitObj)

          this._applyFilterToHabitsList()
          this._planAllNotifications()
          try { useHomeStore().refreshToday() } catch { /* ignore */ }
          return true
        }
        this.error = res?.MESSAGE || 'Не удалось сохранить выбор'
        return false
      } catch (e) {
        this.selectedHabitId = habitId
        try { localStorage.setItem(LS_SELECTED, habitId) } catch {}
        const habitObj = this.catalogList.find((h) => h.id === habitId)
        if (habitObj) writeLS(LS_SELECTED_DATA, habitObj)
        this._applyFilterToHabitsList()
        return true
      } finally {
        this.saving = false
      }
    },

    async loadHabits({ force = false } = {}) {
      const theme = useThemeStore()
      const themeId = theme.selected
      if (!themeId) return false

      const cachedAt = Number(localStorage.getItem(LS_CACHE_AT) || 0)
      const cachedTheme = localStorage.getItem(LS_CACHE_THEME)
      const fresh = Date.now() - cachedAt < CACHE_TTL
      const sameTheme = cachedTheme === themeId

      if (!force && fresh && sameTheme) {
        const cached = readLS(LS_CACHE, null)
        if (Array.isArray(cached) && cached.length) {
          this.catalogList = cached
          this._applyFilterToHabitsList()
        }
      }

      if (!force && fresh && sameTheme && this.catalogList.length) {
        return true
      }

      this.syncing = true
      this.loading = !this.catalogList.length
      this.error = null

      try {
        if (!isOffline()) {
          try {
            const raw = await fetchHabitsConfig()
            const configs = extractHabitsForTheme(raw, themeId)
              || getFallbackHabitsForTheme(themeId)

            const normalized = configs.map((h) => ({
              id: h.id,
              icon: h.icon || h.id,
              title: h.title || '',
              emoji: h.emoji || '',
              hint: h.hint || '',
              description: h.description || h.hint || '',
              picture: h.picture || h.image || h.cover || '',
              rewardPoints: h.rewardPoints || h.reward_points || 0,
              timesPerDay: Number(h.timesPerDay) || 1,
              minIntervalMin: Number(h.minIntervalMin) || 60,
              themeId,
            }))

            this.catalogList = normalized
            writeLS(LS_CACHE, normalized)
            localStorage.setItem(LS_CACHE_AT, String(Date.now()))
            localStorage.setItem(LS_CACHE_THEME, themeId)
          } catch (e) {
            if (!this.catalogList.length) {
              this.catalogList = getFallbackHabitsForTheme(themeId)
            }
          }
        }

        this._applyFilterToHabitsList()

        if (!isOffline()) {
          const auth = useAuthStore()
          if (auth.idUser) {
            try {
              const res = await fetchHabits({ ID_USER: auth.idUser })
              if (isSuccess(res) && res.HABITS && typeof res.HABITS === 'object') {
                const today = localDate()
                const merged = { ...this.data }
                for (const h of this.catalogList) {
                  const local = this.data[h.id] || { count: 0, lastAt: 0 }
                  const serverList = Array.isArray(res.HABITS[h.id]) ? res.HABITS[h.id] : []
                  const serverToday = serverList.filter(
                    (iso) => String(iso).slice(0, 10) === today,
                  )
                  const serverCount = serverToday.length
                  const serverLast = serverToday.length
                    ? new Date(serverToday[serverToday.length - 1]).getTime()
                    : 0
                  merged[h.id] = {
                    count: Math.max(local.count || 0, serverCount),
                    lastAt: Math.max(local.lastAt || 0, serverLast),
                  }
                }
                this.data = merged
                saveState({ date: today, data: merged })
              }
            } catch { /* ignore */ }
          }
        }

        this.lastSyncAt = Date.now()
        try { localStorage.setItem(LS_LAST_TIME, String(this.lastSyncAt)) } catch {}
        this._planAllNotifications()
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return true
      } catch (e) {
        this.error = e.message || 'Ошибка загрузки привычек'
        return false
      } finally {
        this.syncing = false
        this.loading = false
      }
    },

    _applyFilterToHabitsList() {
      if (!this.selectedHabitId) {
        habitsList.value = []
        return
      }
      let found = this.catalogList.find((h) => h.id === this.selectedHabitId)
      if (!found) {
        const cached = readLS(LS_SELECTED_DATA, null)
        if (cached && cached.id === this.selectedHabitId) found = cached
      }
      habitsList.value = found ? [found] : []
    },

    async complete(habitId) {
      const h = getHabit(habitId)
      if (!h) return false

      const p = this.progress(habitId)
      if (!p || !p.canComplete) return false

      const now = Date.now()
      const prev = this.data[habitId] || { count: 0, lastAt: 0 }
      if (prev.count >= h.timesPerDay) return false

      this.data[habitId] = { count: prev.count + 1, lastAt: now }
      saveState({ date: this.date, data: this.data })

      this._planAllNotifications()
      try { useStatsStore().bumpHabitDone(habitId) } catch { /* ignore */ }

      const auth = useAuthStore()
      const payload = {
        ID_USER: auth.idUser,
        HABIT_ID: habitId,
        LOCAL_DATETIME: localDateTime(),
      }

      if (isOffline()) {
        const q = queueFromLS(); q.push(payload)
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return true
      }
      try {
        const res = await sendHabitComplete(payload)
        if (!isSuccess(res)) throw new Error('not ok')

        // ▼ Защита: если сервер когда-нибудь пришлёт REWARD_LIMIT_REACHED
        //   для привычки — не начисляем fallback из конфига ▼
        const limitReached = res.REWARD_LIMIT_REACHED === true
        const reward = limitReached
          ? 0
          : (res.REWARD_POINTS !== undefined ? res.REWARD_POINTS : h.rewardPoints)
        if (reward > 0) {
          try { useStatsStore().addApplesLocally(reward) } catch { /* ignore */ }
        }

        if (res.DONE_TODAY != null) {
          const serverCount = Number(res.DONE_TODAY) || 0
          const local = this.data[habitId] || { count: 0, lastAt: 0 }
          if (serverCount > local.count) {
            this.data[habitId] = { ...local, count: serverCount }
            saveState({ date: this.date, data: this.data })
          }
        }
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
      } catch {
        const q = queueFromLS(); q.push(payload)
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
      }
      return true
    },

    async flushQueue() {
      if (isOffline()) return
      const q = queueFromLS()
      if (!q.length) return
      const remain = []
      for (const p of q) {
        try {
          const res = await sendHabitComplete(p)
          if (!isSuccess(res)) {
            remain.push(p)
          } else {
            const habitId = p.HABIT_ID
            const h = getHabit(habitId)
            const limitReached = res.REWARD_LIMIT_REACHED === true
            const reward = limitReached
              ? 0
              : (res.REWARD_POINTS !== undefined
                  ? res.REWARD_POINTS
                  : (h ? h.rewardPoints : 0))
            if (reward > 0) {
              try { useStatsStore().addApplesLocally(reward) } catch { /* ignore */ }
            }
          }
        } catch { remain.push(p) }
      }
      localStorage.setItem(LS_QUEUE, JSON.stringify(remain))
    },

    reload() {
      const s = loadState()
      if (s) {
        this.date = s.date
        this.data = s.data
      } else {
        this.date = localDate()
        this.data = {}
      }
      this.selectedHabitId = localStorage.getItem(LS_SELECTED) || null
      this._planAllNotifications()
    },

    resetSelection() {
      this.selectedHabitId = null
      habitsList.value = []
      try { localStorage.removeItem(LS_SELECTED) } catch {}
      try { localStorage.removeItem(LS_SELECTED_DATA) } catch {}
    },
  },
})