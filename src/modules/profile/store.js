import { defineStore } from 'pinia'
import { sendProfile, fetchWorkplaces } from './api'
import { localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { pushState } from '../auth/stateSync'

const LS_KEY = 'profile'
const LS_PENDING = 'profile.pending'
const LS_SYNCED_AT = 'profile.syncedAt'
const LS_WORKPLACES = 'profile.workplaces'
const LS_WORKPLACES_AT = 'profile.workplacesAt'
const WORKPLACES_TTL = 24 * 60 * 60 * 1000 // 24 часа

// Фолбэк, если CDN недоступен и кэша нет
const FALLBACK_WORKPLACES = [
  { id: 'x5_uk', name: 'X5 Управляющая компания' },
  { id: 'logistics', name: 'Логистика' }
]

let netWatched = false

export const useProfileStore = defineStore('profile', {
  state: () => {
    let savedWorkplaces = FALLBACK_WORKPLACES
    try {
      const raw = localStorage.getItem(LS_WORKPLACES)
      if (raw) savedWorkplaces = JSON.parse(raw)
    } catch {}

    return {
      fio: '',
      nickname: '',
      workplace: '',
      syncState: 'idle',
      lastSyncedAt: null,
      workplaces: savedWorkplaces, // Массив объектов { id, name }
    }
  },

  getters: {
    isSynced:  (s) => s.syncState === 'idle',
    isSyncing: (s) => s.syncState === 'syncing',
    isPending: (s) => s.syncState === 'pending',
    isError:   (s) => s.syncState === 'error',
    hasPending: () => !!localStorage.getItem(LS_PENDING),

    isComplete: (s) => {
      if (typeof s.nickname !== 'string' || s.nickname.trim().length < 2) return false
      if (typeof s.workplace !== 'string' || !s.workplace) return false
      
      // Проверяем, что выбранный workplace существует в актуальном списке
      return s.workplaces.some((w) => w.id === s.workplace)
    },
  },

  actions: {
    load() {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) Object.assign(this, JSON.parse(raw))
      } catch {}
      const syncedAt = localStorage.getItem(LS_SYNCED_AT)
      this.lastSyncedAt = syncedAt ? Number(syncedAt) : null
      if (this.hasPending) this.syncState = 'pending'
      
      this.initNetworkWatcher()
      this.loadWorkplaces()
      
      if (this.hasPending) this.flushPending()
    },

    async loadWorkplaces({ force = false } = {}) {
      const cachedAt = Number(localStorage.getItem(LS_WORKPLACES_AT) || 0)
      const fresh = Date.now() - cachedAt < WORKPLACES_TTL
      
      if (!force && fresh && this.workplaces.length > 0) return

      try {
        const data = await fetchWorkplaces()
        if (Array.isArray(data) && data.length > 0) {
          this.workplaces = data
          localStorage.setItem(LS_WORKPLACES, JSON.stringify(data))
          localStorage.setItem(LS_WORKPLACES_AT, String(Date.now()))
        }
      } catch (e) {
        console.warn('[profile] Failed to load workplaces from CDN, using cache/fallback', e)
      }
    },

    saveLocal() {
      localStorage.setItem(LS_KEY, JSON.stringify({
        fio: this.fio,
        nickname: this.nickname,
        workplace: this.workplace,
      }))
    },

    async save() {
      this.saveLocal()
      await this.pushToServer()
    },

    async pushToServer() {
      const auth = useAuthStore()
      if (!auth.idUser) { this.syncState = 'error'; return false }

      const payload = {
        ID_USER: auth.idUser,
        FIO: this.fio,
        NICKNAME: this.nickname,
        WORKPLACE: this.workplace,
        LOCAL_DATETIME: localDateTime(),
      }

      localStorage.setItem(LS_PENDING, JSON.stringify(payload))
      this.syncState = 'syncing'
      return this._trySend(payload)
    },

    async _trySend(payload) {
      try {
        const res = await sendProfile(payload)
        if (!isSuccess(res)) throw new Error('RESULT != OK')

        localStorage.removeItem(LS_PENDING)
        const now = Date.now()
        localStorage.setItem(LS_SYNCED_AT, String(now))
        this.lastSyncedAt = now
        this.syncState = 'idle'

        const auth = useAuthStore()
        if (auth.idUser) pushState(auth.idUser)

        return true
      } catch {
        this.syncState = navigator.onLine ? 'error' : 'pending'
        return false
      }
    },

    async flushPending() {
      const raw = localStorage.getItem(LS_PENDING)
      if (!raw) return
      let payload
      try { payload = JSON.parse(raw) } catch { return }
      this.syncState = 'syncing'
      await this._trySend(payload)
    },

    async retry() { await this.flushPending() },

    initNetworkWatcher() {
      if (netWatched) return
      netWatched = true
      window.addEventListener('online', () => {
        if (localStorage.getItem(LS_PENDING)) this.flushPending()
        this.loadWorkplaces()
      })
    },
  },
})