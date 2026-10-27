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
import { useLimits } from '../core/limits'
import { useMascotStore } from '../mascot/store'
import { usePeriod } from '../core/period'
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
    isDone: (s) => (taskId, date = s.loadedDate) => {
      if (!taskId || !date) return false
      return s.doneKeys.includes(`${date}:${taskId}`)
    },
    progress: (s) => {
      if (!s.list.length) return { done: 0, total: 0 }
      const key = (id) => `${s.loadedDate}:${id}`
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

      const period = usePeriod()
      const today = localDate()

      if (!period.isInPeriod(today)) {
        this.list = []
        this.doneKeys = this.doneKeys.filter((k) => {
          const date = String(k).split(':')[0]
          return period.isInPeriod(date)
        })
        localStorage.setItem(LS_DONE, JSON.stringify(this.doneKeys))
        this.loadedTheme = themeId
        this.loadedDate = today
        this.error = null
        this.loading = false
        return
      }

      if (!force && this.loadedTheme === themeId && this.loadedDate === today) return

      this.doneKeys = this.doneKeys.filter((k) => {
        const date = String(k).split(':')[0]
        return period.isInPeriod(date)
      })
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
      const consent = useConsentStore()
      if (!consent.isGranted) {
        throw new Error('CONSENT_REQUIRED')
      }

      const date = task.DATE || localDate()

      const period = usePeriod()
      if (!period.isInPeriod(date)) {
        return { done: false, reason: 'OUT_OF_PERIOD' }
      }

      // ▼ Защита от накрутки: нельзя отметить практику за прошлый день ▼
      if (date !== localDate()) {
        return { done: false, reason: 'NOT_TODAY' }
      }

      const key = `${date}:${task.ID_TASK}`
      if (this.doneKeys.includes(key)) return { done: false, reason: 'ALREADY_DONE' }

      this.doneKeys.push(key)
      localStorage.setItem(LS_DONE, JSON.stringify(this.doneKeys))

      const rewardType = 'task'
      try { useStatsStore().bumpTaskDone() } catch { /* ignore */ }

      try { useMascotStore().trigger('practice') } catch { /* ignore */ }

      const auth = useAuthStore()
      const payload = {
        ID_USER: auth.idUser,
        ID_TASK: key,
        LOCAL_DATETIME: localDateTime(),
      }

      if (isOffline()) {
        const q = queueFromLS()
        q.push({ ...payload, _rewardType: rewardType })
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return {
          done: true, rewardPoints: 0, limitReached: false,
          limitInfo: null, rewardType, queued: true,
        }
      }

      try {
        const res = await sendTaskComplete(payload)
        if (!isSuccess(res)) throw new Error('not ok')

        const outcome = useLimits().handleRewardResponse(res, rewardType)
        if (outcome.rewardPoints > 0) {
          try { useStatsStore().addApplesLocally(outcome.rewardPoints) } catch { /* ignore */ }
        }
        try { useHomeStore().refreshToday() } catch { /* ignore */ }

        return { done: true, ...outcome, queued: false }
      } catch {
        const q = queueFromLS()
        q.push({ ...payload, _rewardType: rewardType })
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return {
          done: true, rewardPoints: 0, limitReached: false,
          limitInfo: null, rewardType, queued: true,
        }
      }
    },

    async flushQueue() {
      if (isOffline()) return
      const q = queueFromLS()
      if (!q.length) return
      const remain = []
      const limits = useLimits()
      for (const p of q) {
        const { _rewardType, ...cleanPayload } = p
        const fallbackType = _rewardType || 'task'
        try {
          const res = await sendTaskComplete(cleanPayload)
          if (!isSuccess(res)) {
            remain.push(p)
          } else {
            const outcome = limits.handleRewardResponse(res, fallbackType)
            if (outcome.rewardPoints > 0) {
              try { useStatsStore().addApplesLocally(outcome.rewardPoints) } catch { /* ignore */ }
            }
          }
        } catch { remain.push(p) }
      }
      localStorage.setItem(LS_QUEUE, JSON.stringify(remain))
    },

    async syncFromServer({ force = false } = {}) {
      if (isOffline()) return { merged: false, error: 'OFFLINE' }
      if (this.syncing) return { merged: false, error: 'IN_PROGRESS' }

      const auth = useAuthStore()
      if (!auth.idUser) return { merged: false, error: 'NO_USER' }

      const period = usePeriod()
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
        this.doneKeys = [...merged].filter((k) => {
          const date = String(k).split(':')[0]
          return period.isInPeriod(date)
        })
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