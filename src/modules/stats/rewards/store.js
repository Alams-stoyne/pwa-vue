import { defineStore } from 'pinia'
import { isSuccess, isBlocked } from '../../core/utils/response'
import { useAuthStore } from '../../auth/store'
import { fetchApplesHistory } from './api'

const LS_CACHE = 'rewards.history'
const LS_CACHE_AT = 'rewards.historyAt'
const TTL = 5 * 60 * 1000 // 5 минут

function readCache(userId) {
  try {
    const raw = localStorage.getItem(LS_CACHE)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (cached?.userId !== userId) return null
    return cached.data
  } catch { return null }
}

function writeCache(userId, data) {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify({ userId, data }))
    localStorage.setItem(LS_CACHE_AT, String(Date.now()))
  } catch {}
}

function readCacheAt() {
  try { return Number(localStorage.getItem(LS_CACHE_AT) || 0) } catch { return 0 }
}

function clearCache() {
  try {
    localStorage.removeItem(LS_CACHE)
    localStorage.removeItem(LS_CACHE_AT)
  } catch {}
}

export const useRewardsStore = defineStore('rewards', {
  state: () => ({
    earned: [],
    pending: [],
    totalEarned: 0,
    loading: false,
    error: null,
    lastLoadedAt: 0,
    loadedUserId: null,
  }),

  getters: {
    hasData: (s) => s.earned.length > 0 || s.pending.length > 0,
    pendingCount: (s) => s.pending.length,
  },

  actions: {
    /**
     * Загрузка истории.
     * @param {{ force?: boolean }} opts
     *   force = false (по умолчанию) → если кеш свежий и для этого же
     *   пользователя — используется кеш, сеть не дёргается.
     *   force = true → всегда запрос.
     */
    async load({ force = false } = {}) {
      const auth = useAuthStore()
      if (!auth.idUser) return false
      if (this.loading) return false

      // Смена пользователя → сбрасываем in-memory состояние
      if (this.loadedUserId && this.loadedUserId !== auth.idUser) {
        this.clear()
      }

      // Кеш
      if (!force) {
        const cached = readCache(auth.idUser)
        const cachedAt = readCacheAt()
        if (cached && Date.now() - cachedAt < TTL) {
          this.earned = Array.isArray(cached.EARNED) ? cached.EARNED : []
          this.pending = Array.isArray(cached.PENDING) ? cached.PENDING : []
          this.totalEarned = Number(cached.TOTAL_EARNED) || 0
          this.loadedUserId = auth.idUser
          this.lastLoadedAt = cachedAt
          this.error = null
          return true
        }
      }

      this.loading = true
      this.error = null

      try {
        const res = await fetchApplesHistory({ ID_USER: auth.idUser })

        if (isBlocked(res)) {
          auth.setBlocked(res.MESSAGE)
          return false
        }

        if (isSuccess(res)) {
          const data = {
            EARNED: Array.isArray(res.EARNED) ? res.EARNED : [],
            PENDING: Array.isArray(res.PENDING) ? res.PENDING : [],
            TOTAL_EARNED: Number(res.TOTAL_EARNED) || 0,
          }
          this.earned = data.EARNED
          this.pending = data.PENDING
          this.totalEarned = data.TOTAL_EARNED
          this.loadedUserId = auth.idUser
          this.lastLoadedAt = Date.now()
          writeCache(auth.idUser, data)
          return true
        }

        this.error = res?.MESSAGE || 'Не удалось загрузить историю начислений'
        return false
      } catch (e) {
        this.error = e.message || 'Ошибка загрузки'
        return false
      } finally {
        this.loading = false
      }
    },

    /** Сброс in-memory + localStorage-кеша. Вызывается при logout. */
    clear() {
      this.earned = []
      this.pending = []
      this.totalEarned = 0
      this.loadedUserId = null
      this.lastLoadedAt = 0
      this.error = null
      clearCache()
    },

    /** Публичный хелпер — принудительная инвалидация кеша. */
    invalidateCache() {
      clearCache()
      this.lastLoadedAt = 0
    },
  },
})