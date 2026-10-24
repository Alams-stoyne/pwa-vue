import { defineStore } from 'pinia'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useStatsStore } from '../stats/store'
import { 
  sendSteps, 
  fetchStepsSummary,
  fetchStepsLeaderboard,
  fetchSchoolStats
} from './api'

const LS_LAST_SUBMIT = 'steps.lastSubmittedAt'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

export const useStepsStore = defineStore('steps', {
  state: () => ({
    summary: null,
    loadingSummary: false,
    sending: false,
    error: null,
    lastSubmittedAt: Number(localStorage.getItem(LS_LAST_SUBMIT) || 0),

    leaderboard: null,
    leaderboardDate: 'all',
    schoolStats: null,
    loadingLeaderboard: false,
    leaderboardUpdatedAt: null,
  }),

  getters: {
    hasSummary: (s) => !!s.summary,
    progressPercent: (s) => s.summary?.PROGRESS_PERCENT || 0,
    goal: (s) => s.summary?.GOAL || 0,
    rank: (s) => s.summary?.RANK || 0,
    totalUsers: (s) => s.summary?.TOTAL_USERS || 0,
    totalSteps: (s) => s.summary?.TOTAL_STEPS || 0,
    todaySteps: (s) => s.summary?.TODAY_STEPS || 0,

    userWorkplace: () => {
      try {
        const profile = JSON.parse(localStorage.getItem('profile') || '{}')
        return profile.workplace || ''
      } catch {
        return ''
      }
    },

    myWorkplaceTop: (s) => {
      if (!s.leaderboard) return []
      
      const wp = s.userWorkplace
      if (wp && s.leaderboard.BY_WORKPLACE && s.leaderboard.BY_WORKPLACE[wp]) {
        return s.leaderboard.BY_WORKPLACE[wp].TOP || []
      }
      
      return s.leaderboard.ALL || []
    },

    workplaceMeta: (s) => {
      if (!s.leaderboard || !s.userWorkplace) return null
      return s.leaderboard.BY_WORKPLACE?.[s.userWorkplace] || null
    },

    isSubmittedToday: (s) => {
      if (Number(s.summary?.TODAY_STEPS) > 0) return true;
      if (s.summary?.TODAY_SUBMITTED === true) return true;

      if (!s.lastSubmittedAt) return false
      const lastDate = new Date(s.lastSubmittedAt)
      const today = new Date()
      return lastDate.getDate() === today.getDate() &&
             lastDate.getMonth() === today.getMonth() &&
             lastDate.getFullYear() === today.getFullYear()
    },

    isConfirmedToday: (s) => {
      if (!s.summary) return false;
      if (s.summary.TODAY_CONFIRMED !== undefined) {
        return s.summary.TODAY_CONFIRMED === true;
      }
      return Number(s.summary.TODAY_STEPS) > 0;
    }
  },

  actions: {
    async loadSummary() {
      const auth = useAuthStore()
      if (!auth.idUser) return

      this.loadingSummary = true
      try {
        const res = await fetchStepsSummary({ ID_USER: auth.idUser })
        if (isSuccess(res)) {
          this.summary = res
        }
      } catch (e) {
        console.error('[steps] loadSummary error:', e)
      } finally {
        this.loadingSummary = false
      }
    },

    async send({ steps, images, consent }) {
      const auth = useAuthStore()
      if (!auth.idUser) {
        this.error = 'Пользователь не авторизован'
        return false
      }

      this.sending = true
      this.error = null
      try {
        const base64Images = []
        for (const file of images) {
          if (file instanceof File) {
            const base64 = await fileToBase64(file)
            base64Images.push(base64)
          }
        }

        const res = await sendSteps({
          ID_USER: auth.idUser,
          STEPS: steps,
          IMAGES: base64Images,
          CONSENT: consent,
          LOCAL_DATETIME: localDateTime(),
        })

        if (!isSuccess(res)) {
          throw new Error(res?.MESSAGE || 'Ошибка при отправке данных')
        }

        this.lastSubmittedAt = Date.now()
        localStorage.setItem(LS_LAST_SUBMIT, String(this.lastSubmittedAt))

        // ▼ ОПТИМИСТИЧНОЕ НАЧИСЛЕНИЕ ▼
        try {
          if (res.REWARD_POINTS) {
            useStatsStore().addApplesLocally(res.REWARD_POINTS)
          }
        } catch { /* ignore */ }

        await this.loadSummary()
        return true
      } catch (e) {
        this.error = e.message || 'Не удалось отправить данные'
        return false
      } finally {
        this.sending = false
      }
    },

    async loadLeaderboard({ date = 'all', force = false } = {}) {
      if (!force && this.leaderboard && this.leaderboardDate === date) {
        const cacheTime = Number(localStorage.getItem(`steps.lb.cacheAt.${date}`) || 0)
        if (Date.now() - cacheTime < 30 * 60 * 1000) return
      }

      this.leaderboardDate = date
      this.loadingLeaderboard = true
      
      let queryDate = null
      if (date === 'today') {
        queryDate = localDate()
      } else if (date === 'yesterday') {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        queryDate = localDate(d)
      }

      try {
        const [lbData, schoolData] = await Promise.all([
          fetchStepsLeaderboard(queryDate),
          fetchSchoolStats()
        ])

        this.leaderboard = lbData
        this.schoolStats = schoolData
        this.leaderboardUpdatedAt = lbData?.UPDATED_AT || schoolData?.UPDATED_AT
        
        localStorage.setItem(`steps.lb.cacheAt.${date}`, String(Date.now()))
      } catch (e) {
        console.warn('[steps] loadLeaderboard failed:', e)
      } finally {
        this.loadingLeaderboard = false
      }
    },

    reset() {
      this.error = null
    }
  }
})