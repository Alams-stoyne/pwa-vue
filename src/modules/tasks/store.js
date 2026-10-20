import { defineStore } from 'pinia'
import {
  fetchTasksByThemeDate, sendTaskComplete, fetchTasks,
} from './api'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useThemeStore } from '../theme/store'
import { useStatsStore } from '../stats/store'
import { useHomeStore } from '../home/store'
import { useConsentStore } from '../consent/store'
import { isOffline, OfflineError } from '../core/utils/network'

const LS_DONE = 'tasks.doneKeys'
const LS_QUEUE = 'tasks.queue'
const LS_LAST_TIME = 'tasks.lastSyncAt'
const HOUR = 60 * 60 * 1000

function doneFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_DONE) || '[]') } catch { return [] }
}
function queueFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]') } catch { return [] }
}

let _netWatched = false

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    list: [],
    doneKeys: doneFromLS(),
    loading: false,
    syncing: false,
    error: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    loadedTheme: null,
    loadedDate: null,
    lastSyncAt: Number(localStorage.getItem(LS_LAST_TIME) || 0),
  }),

  getters: {
    // Второй аргумент — явная дата (для детального просмотра прошлых дней).
    // Без него используется loadedDate (для списка «сегодня»).
    isDone: (s) => (taskId, date = s.loadedDate) => {
      if (!taskId || !date) return false
      return s.doneKeys.includes(`${date}:${taskId}`)
    },
    progress: (s) => {
      if (!s.list.length) return { done: 0, total: 0 }
      const key = (id) => `${s.loadedDate}:${id}`
      // ▼ ИСПРАВЛЕНО: t.ID → t.ID_TASK
      const done = s.list.filter((t) => s.doneKeys.includes(key(t.ID_TASK))).length
      return { done, total: s.list.length }
    },
  },

  actions: {
    reloadDoneKeys() {
      this.doneKeys = doneFromLS()
    },

    initNetworkWatcher() {
      if (_netWatched) return
      _netWatched = true

      window.addEventListener('online', () => {
        this.online = true
        this.flushQueue()
        this.syncFromServer({ force: true })
        if (this.loadedTheme) this.load({ force: true })
      })
      window.addEventListener('offline', () => { this.online = false })

      setInterval(() => this.syncFromServer(), HOUR)
    },

    async load({ force = false } = {}) {
      const theme = useThemeStore()
      const themeId = theme.selected
      if (!themeId) return

      const today = localDate()
      if (!force && this.loadedTheme === themeId && this.loadedDate === today) return

      this.doneKeys = this.doneKeys.filter((k) => k.startsWith(`${today}:`))
      localStorage.setItem(LS_DONE, JSON.stringify(this.doneKeys))

      this.loadedTheme = themeId
      this.loadedDate = today
      this.error = null

      if (isOffline()) {
        this.online = false
        this.list = []
        this.error = 'OFFLINE_EMPTY'
        return
      }

      this.online = true
      this.loading = true
      try {
        this.list = await fetchTasksByThemeDate(themeId, today)
        // Виджет «Сегодня» зависит от состава практик — обновим
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
      } catch (e) {
        this.list = []
        this.error = e instanceof OfflineError
          ? 'OFFLINE_EMPTY'
          : 'Не удалось загрузить задания.'
      } finally {
        this.loading = false
      }
    },

    async complete(task) {
      // Без согласия на обработку ПД отметка недоступна —
      // проверяем на уровне действия, чтобы нельзя было обойти через UI.
      const consent = useConsentStore()
      if (!consent.isGranted) {
        throw new Error('CONSENT_REQUIRED')
      }

      const date = task.DATE || localDate()
      // ▼ ИСПРАВЛЕНО: task.ID → task.ID_TASK
      const key = `${date}:${task.ID_TASK}`
      if (this.doneKeys.includes(key)) return false

      this.doneKeys.push(key)
      localStorage.setItem(LS_DONE, JSON.stringify(this.doneKeys))

      // ─── Инкремент статистики ───
      try { useStatsStore().bumpTaskDone() } catch { /* ignore */ }

      const auth = useAuthStore()
      const payload = {
        ID_USER: auth.idUser,
        ID_TASK: key,
        LOCAL_DATETIME: localDateTime(),
      }

      if (isOffline()) {
        const q = queueFromLS(); q.push(payload)
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return true
      }
      try {
        const res = await sendTaskComplete(payload)
        if (!isSuccess(res)) throw new Error('not ok')
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
          const res = await sendTaskComplete(p)
          if (!isSuccess(res)) remain.push(p)
        } catch { remain.push(p) }
      }
      localStorage.setItem(LS_QUEUE, JSON.stringify(remain))
    },

    async syncFromServer({ force = false } = {}) {
      if (isOffline()) return { merged: false, error: 'OFFLINE' }
      if (this.syncing) return { merged: false, error: 'IN_PROGRESS' }

      const auth = useAuthStore()
      if (!auth.idUser) return { merged: false, error: 'NO_USER' }

      const hourPassed = Date.now() - this.lastSyncAt >= HOUR
      if (!force && !hourPassed) return { merged: false, error: null }

      this.syncing = true
      try {
        const res = await fetchTasks({ ID_USER: auth.idUser })
        if (!isSuccess(res) || !Array.isArray(res.TASKS)) {
          return { merged: false, error: 'BAD_RESPONSE' }
        }

        const merged = new Set([...this.doneKeys, ...res.TASKS])
        const before = this.doneKeys.length
        this.doneKeys = [...merged]
        localStorage.setItem(LS_DONE, JSON.stringify(this.doneKeys))

        this.lastSyncAt = Date.now()
        try { localStorage.setItem(LS_LAST_TIME, String(this.lastSyncAt)) } catch {}

        const added = this.doneKeys.length - before

        if (added > 0) {
          try { useHomeStore().refreshToday() } catch { /* ignore */ }
        }

        return { merged: true, added, error: null }
      } catch (e) {
        return { merged: false, error: e.message || 'ERROR' }
      } finally {
        this.syncing = false
      }
    },
  },
})