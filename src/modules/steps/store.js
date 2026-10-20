import { defineStore } from 'pinia'
import { localDate } from '../core/utils/date' // предполагаю, что утилита есть
// импортируйте ваш API для шагов, например:
// import { sendSteps } from './api' 

const LS_LAST_SUBMIT = 'steps.lastSubmittedAt'

export const useStepsStore = defineStore('steps', {
  state: () => ({
    summary: null,
    loadingSummary: false,
    sending: false,
    error: null,
    // Время последней отправки (timestamp)
    lastSubmittedAt: Number(localStorage.getItem(LS_LAST_SUBMIT) || 0),
  }),

  getters: {
    hasSummary: (s) => !!s.summary,
    progressPercent: (s) => s.summary?.PROGRESS_PERCENT || 0,
    goal: (s) => s.summary?.GOAL || 0,
    rank: (s) => s.summary?.RANK || 0,
    totalUsers: (s) => s.summary?.TOTAL_USERS || 0,
    totalSteps: (s) => s.summary?.TOTAL_STEPS || 0,
    todaySteps: (s) => s.summary?.TODAY_STEPS || 0,

    /**
     * Проверяем, отправлял ли пользователь данные сегодня.
     * Сравниваем дату последней отправки с сегодняшней.
     */
    isSubmittedToday: (s) => {
      if (!s.lastSubmittedAt) return false
      const lastDate = new Date(s.lastSubmittedAt)
      const today = new Date()
      
      return lastDate.getDate() === today.getDate() &&
             lastDate.getMonth() === today.getMonth() &&
             lastDate.getFullYear() === today.getFullYear()
    }
  },

  actions: {
    async loadSummary() {
      this.loadingSummary = true
      try {
        // Замените на ваш реальный вызов API
        // const res = await fetchSummary()
        // this.summary = res
      } catch (e) {
        console.error(e)
      } finally {
        this.loadingSummary = false
      }
    },

    async send({ steps, images, consent }) {
      this.sending = true
      this.error = null
      try {
        // Замените на ваш реальный вызов API
        // const res = await sendSteps({ steps, images, consent })
        
        // Имитация успешной отправки:
        // if (!res.ok) throw new Error('Ошибка')

        // Сохраняем время успешной отправки
        this.lastSubmittedAt = Date.now()
        localStorage.setItem(LS_LAST_SUBMIT, String(this.lastSubmittedAt))

        return true
      } catch (e) {
        this.error = e.message || 'Не удалось отправить данные'
        return false
      } finally {
        this.sending = false
      }
    },

    reset() {
      this.error = null
    }
  }
})