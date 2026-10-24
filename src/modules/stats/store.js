import { defineStore } from 'pinia'
import { localDateTime, localDate } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { isOffline } from '../core/utils/network'
import { fetchGlobalStats, fetchPersonalStats } from './api'

const LS_PERSONAL = 'stats.personal.v3'
const LS_GLOBAL = 'stats.global.v3'
const LS_TIMES = 'stats.times.v3'
const LS_PENDING_APPLES = 'stats.pendingApples'

const PERSONAL_TTL = 15 * 60 * 1000 // 15 минут
const GLOBAL_TTL = 15 * 60 * 1000   // 15 минут (как вы и просили)

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

let _timer = null
let _netWatched = false

export const useStatsStore = defineStore('stats', {
  state: () => ({
    personal: loadLS(LS_PERSONAL, null),
    global: loadLS(LS_GLOBAL, null),
    times: loadLS(LS_TIMES, { lastPersonal: 0, lastGlobal: 0 }),
    pendingApples: Number(localStorage.getItem(LS_PENDING_APPLES) || 0),
    loadingPersonal: false,
    loadingGlobal: false,
    syncing: false,
    error: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  }),

  getters: {
    /** Итоговый баланс для UI (серверный + локальные начисления) */
    apples: (s) => (Number(s.personal?.APPLES) || 0) + s.pendingApples,

    /** Период марафона (из global.json) */
    period: (s) => s.global?.PERIOD || { FROM: null, TO: null },

    isPeriodActive: (s) => {
      const from = s.global?.PERIOD?.FROM
      const to = s.global?.PERIOD?.TO
      if (!from || !to) return true
      const today = localDate()
      return today >= from && today <= to
    },

    /** Данные компаний для рейтинга */
    companiesList: (s) => s.global?.COMPANIES?.LIST || [],

    /** Эффективность компании пользователя */
    userCompany: (s) => {
      if (!s.personal?.COMPANY_CODE || !s.global?.COMPANIES?.LIST) return null
      return s.global.COMPANIES.LIST.find(c => c.ID === s.personal.COMPANY_CODE) || null
    }
  },

  actions: {
    init() {
      this._watchNet()
      this._startTimer()
      this.fetchPersonal()
      this.fetchGlobal()
    },

    _watchNet() {
      if (_netWatched) return
      _netWatched = true
      window.addEventListener('online', () => {
        this.online = true
        this.fetchPersonal({ force: true })
        this.fetchGlobal({ force: true })
      })
      window.addEventListener('offline', () => {
        this.online = false
      })
    },

    _startTimer() {
      if (_timer) return
      _timer = setInterval(() => {
        this.fetchPersonal()
        this.fetchGlobal() // <-- ДОБАВЛЕНО: обновляем общую статистику каждые 15 минут
      }, PERSONAL_TTL)
    },

    addApplesLocally(amount) {
      if (!amount || amount <= 0) return
      this.pendingApples += Number(amount)
      localStorage.setItem(LS_PENDING_APPLES, String(this.pendingApples))
      console.log(`[stats] +${amount} яблок добавлено локально. Ожидает сверки.`)
    },

    async fetchPersonal({ force = false } = {}) {
      if (this.loadingPersonal) return
      const now = Date.now()
      
      if (!force && this.personal && now - this.times.lastPersonal < PERSONAL_TTL) return
      if (isOffline()) return

      const auth = useAuthStore()
      if (!auth.idUser) return

      this.loadingPersonal = true
      try {
        const data = await fetchPersonalStats({
          ID_USER: auth.idUser,
          LOCAL_DATETIME: localDateTime()
        })
        
        if (isSuccess(data)) {
          if (data.USER_PROGRESS) {
            this.personal = data.USER_PROGRESS
          } else {
            // Если null (новый пользователь/нет активности) — ставим дефолт
            this.personal = { APPLES: 0, RANK: 0, LECTURES_READ: 0, TASKS_DONE: 0, HABITS_DAYS: 0, STEPS_CONFIRMED: 0 }
          }
          
          // СЕРВЕР - ИСТИНА: сбрасываем локальные начисления
          this.pendingApples = 0
          localStorage.removeItem(LS_PENDING_APPLES)
          
          this.times.lastPersonal = now
          saveLS(LS_PERSONAL, this.personal)
          saveLS(LS_TIMES, this.times)
        } else if (data.RESULT === 'BLOCKED') {
          this.error = data.MESSAGE
        }
      } catch (e) {
        console.warn('[stats] personal fetch failed', e)
      } finally {
        this.loadingPersonal = false
      }
    },

    async fetchGlobal({ force = false } = {}) {
      if (this.loadingGlobal) return
      const now = Date.now()
      
      // ▼ ДОБАВЛЕНА ПРОВЕРКА: если в кэше нет COMPANIES — форсируем запрос ▼
      const hasCompanies = !!(this.global && this.global.COMPANIES)
      if (!force && hasCompanies && now - this.times.lastGlobal < GLOBAL_TTL) return
      
      if (isOffline()) return

      this.loadingGlobal = true
      try {
        const data = await fetchGlobalStats()
        if (data && data.GLOBAL_PROGRESS) {
          this.global = data
          this.times.lastGlobal = now
          saveLS(LS_GLOBAL, this.global)
          saveLS(LS_TIMES, this.times)
        }
      } catch (e) {
        console.warn('[stats] global fetch failed', e)
      } finally {
        this.loadingGlobal = false
      }
    }
  }
})