import { defineStore } from 'pinia'
import { sendProfile } from './api'
import { localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { WORKPLACES } from './workplaces'
import { pushState } from '../auth/stateSync'

const LS_KEY = 'profile'
const LS_PENDING = 'profile.pending'
const LS_SYNCED_AT = 'profile.syncedAt'

const VALID_WORKPLACES = new Set(WORKPLACES.map((w) => w.value))

let netWatched = false

export const useProfileStore = defineStore('profile', {
  state: () => ({
    fio: '',
    nickname: '',
    workplace: '',
    syncState: 'idle',
    lastSyncedAt: null,
  }),

  getters: {
    isSynced:  (s) => s.syncState === 'idle',
    isSyncing: (s) => s.syncState === 'syncing',
    isPending: (s) => s.syncState === 'pending',
    isError:   (s) => s.syncState === 'error',
    hasPending: () => !!localStorage.getItem(LS_PENDING),

    /** Минимум для прохождения онбординга: Ф.И.О + место работы */
    isComplete: (s) =>
      typeof s.nickname === 'string' && s.nickname.trim().length >= 2 &&
      typeof s.workplace === 'string' && VALID_WORKPLACES.has(s.workplace),
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
      if (this.hasPending) this.flushPending()
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
        this.syncState = 'idle'

        // Синхронизируем состояние с сервером (для восстановления после переустановки)
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
      })
    },
  },
})