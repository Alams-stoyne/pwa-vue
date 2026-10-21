import { defineStore } from 'pinia'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { sendSteps, fetchStepsSummary } from './api'

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
     * Отправлял ли пользователь данные сегодня (локально ИЛИ на сервере).
     */
    isSubmittedToday: (s) => {
      // 1. Если сервер уже знает, что сегодня есть зачтенные шаги
      if (Number(s.summary?.TODAY_STEPS) > 0) return true;
      
      // 2. Если сервер вернул флаг, что сегодня была отправка (даже на проверке)
      if (s.summary?.TODAY_SUBMITTED === true) return true;

      // 3. Проверка локального времени
      if (!s.lastSubmittedAt) return false
      const lastDate = new Date(s.lastSubmittedAt)
      const today = new Date()
      return lastDate.getDate() === today.getDate() &&
             lastDate.getMonth() === today.getMonth() &&
             lastDate.getFullYear() === today.getFullYear()
    },

    /**
     * Подтверждены ли сегодняшние шаги сервером.
     * Если сервер присылает флаг TODAY_CONFIRMED — используем его.
     * Если нет — считаем подтвержденными, если TODAY_STEPS > 0.
     */
    isConfirmedToday: (s) => {
      if (!s.summary) return false;
      // В идеале сервер должен присылать явный флаг
      if (s.summary.TODAY_CONFIRMED !== undefined) {
        return s.summary.TODAY_CONFIRMED === true;
      }
      // Фолбэк: если есть зачтенные шаги за сегодня, значит, подтверждено
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

        // Сразу запрашиваем сводку, чтобы проверить, подтвердилось ли (вдруг авто-модерация)
        await this.loadSummary()

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