import { defineStore } from 'pinia'
import { sendSupportTicket } from './api'
import { useAuthStore } from '../auth/store'
import { isSuccess } from '../core/utils/response'

export const useSupportStore = defineStore('support', {
  state: () => ({
    sending: false,
    error: null,
    lastTicketId: null,
  }),

  actions: {
    async send({ text, images, consent }) {
      if (this.sending) return false
      this.sending = true
      this.error = null
      try {
        const auth = useAuthStore()
        const res = await sendSupportTicket({
          ID_USER: auth.idUser,
          TEXT: String(text || '').trim(),
          IMAGES: Array.isArray(images) ? images : [],
          CONSENT: !!consent,
        })
        if (isSuccess(res) && res.TICKET_ID) {
          this.lastTicketId = res.TICKET_ID
          return true
        }
        this.error = res?.MESSAGE || 'Не удалось отправить'
        return false
      } catch (e) {
        this.error = e.message || 'Ошибка отправки'
        return false
      } finally {
        this.sending = false
      }
    },

    reset() {
      this.error = null
      this.lastTicketId = null
    },
  },
})