import { defineStore } from 'pinia'
import { 
  sendSupportTicket, 
  sendSupportMessage,
  fetchSupportTickets, 
  fetchSupportTicket,
  createGuestTicket,
  fetchGuestTicket,
  sendGuestMessage,
  createResetUidTicket as createResetUidTicketAPI,
} from './api'
import { useAuthStore } from '../auth/store'
import { isSuccess } from '../core/utils/response'
import { readDeviceId, readUid } from '../install/useAccess'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

function collectMeta(authError, takenUid) {
  return {
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    PLATFORM: navigator.userAgent,
    AUTH_ERROR: authError || null,
    TAKEN_UID: takenUid || null,
    TIMESTAMP_LOCAL: new Date().toISOString(),
    TZ_OFFSET_MIN: -new Date().getTimezoneOffset(),
    LANG: navigator.language,
    NETWORK: navigator.connection ? navigator.connection.effectiveType : 'unknown'
  }
}

export const useSupportStore = defineStore('support', {
  state: () => ({
    sending: false,
    replying: false,
    error: null,
    lastTicketId: null,
    
    tickets: [],
    loadingTickets: false,
    
    currentTicket: null,
    currentMessages: [],
    loadingTicket: false,
    
    // ID гостевого тикета (сохраняется локально)
    guestTicketId: Number(localStorage.getItem('support.guestTicketId') || 0),
  }),

  actions: {
    async send({ text, subject, images, consent }) {
      if (this.sending) return false
      this.sending = true
      this.error = null
      try {
        const auth = useAuthStore()
        
        const base64Images = []
        if (Array.isArray(images)) {
          for (const file of images) {
            if (file instanceof File) {
              if (file.size > 3 * 1024 * 1024) throw new Error('фото больше 3 МБ')
              const base64 = await fileToBase64(file)
              base64Images.push(base64)
            } else if (typeof file === 'string') {
              base64Images.push(file)
            }
          }
        }

        const res = await sendSupportTicket({
          ID_USER: auth.idUser || null,
          SUBJECT: subject || 'обращение в поддержку',
          TEXT: String(text || '').trim(),
          IMAGES: base64Images,
        })
        
        if (isSuccess(res) && res.TICKET_ID) {
          this.lastTicketId = res.TICKET_ID
          return true
        }
        this.error = res?.MESSAGE || 'не удалось отправить'
        return false
      } catch (e) {
        this.error = e.message || 'ошибка отправки'
        return false
      } finally {
        this.sending = false
      }
    },

    async createGuestTicket({ text, images, authError, uid }) {
      if (this.sending) return false
      this.sending = true
      this.error = null
      try {
        const base64Images = []
        if (Array.isArray(images)) {
          for (const file of images) {
            if (file instanceof File) {
              if (file.size > 3 * 1024 * 1024) throw new Error('фото больше 3 МБ')
              const base64 = await fileToBase64(file)
              base64Images.push(base64)
            } else if (typeof file === 'string') {
              base64Images.push(file)
            }
          }
        }

        const deviceId = readDeviceId()
        if (!deviceId) throw new Error('не найден ID устройства')
        
        const meta = collectMeta(authError, uid)
        
        const res = await createGuestTicket({
          DEVICE_ID: deviceId,
          TEXT: String(text || '').trim(),
          UID: uid || readUid() || undefined,
          AUTH_ERROR: authError || undefined,
          IMAGES: base64Images,
          META: meta
        })
        
        if (isSuccess(res) && res.TICKET_ID) {
          this.lastTicketId = res.TICKET_ID
          this.guestTicketId = res.TICKET_ID
          localStorage.setItem('support.guestTicketId', String(res.TICKET_ID))
          return true
        }
        this.error = res?.MESSAGE || 'не удалось отправить'
        return false
      } catch (e) {
        this.error = e.message || 'ошибка отправки'
        return false
      } finally {
        this.sending = false
      }
    },

    // ── Запрос на сброс привязки UID ──────────────────────────
    // Возвращает объект с полями:
    //   { ok: true,  ticketId, resetStatus, estimatedMinutes }
    //   { ok: false, error, message, retryAfterSec }
    // error — код из бэка: RESET_NOT_APPLICABLE | UID_BLOCKED
    //   | WAIT_BEFORE_RESET | RATE_LIMITED | ERROR | NETWORK
    async createResetUidTicket({ text, images = [], uid, reasons = [], meta = {} }) {
      if (this.sending) return { ok: false, error: 'ALREADY_SENDING' }
      this.sending = true
      this.error = null
      try {
        const base64Images = []
        if (Array.isArray(images)) {
          for (const file of images) {
            if (file instanceof File) {
              if (file.size > 3 * 1024 * 1024) throw new Error('фото больше 3 МБ')
              const base64 = await fileToBase64(file)
              base64Images.push(base64)
            } else if (typeof file === 'string') {
              base64Images.push(file)
            }
          }
        }

        const deviceId = readDeviceId()
        if (!deviceId) throw new Error('не найден ID устройства')

        const effectiveUid = uid || readUid() || ''
        if (!effectiveUid) throw new Error('не найден UID')

        const collectedMeta = {
          ...collectMeta(null, effectiveUid),
          ...meta,
        }

        const res = await createResetUidTicketAPI({
          DEVICE_ID: deviceId,
          UID: effectiveUid,
          RESET_REASONS: Array.isArray(reasons) ? reasons : [],
          TEXT: String(text || '').trim(),
          IMAGES: base64Images,
          META: collectedMeta,
        })

        if (res?.RESULT === 'OK' && res.TICKET_ID) {
          this.lastTicketId = res.TICKET_ID
          this.guestTicketId = res.TICKET_ID
          try {
            localStorage.setItem('support.guestTicketId', String(res.TICKET_ID))
          } catch {}
          return {
            ok: true,
            ticketId: res.TICKET_ID,
            resetStatus: res.RESET_STATUS || 'pending_admin_review',
            estimatedMinutes: Number(res.ESTIMATED_WAIT_MINUTES) || 60,
          }
        }

        // Ошибка из бэка — возвращаем структурированно
        const code = res?.RESULT || res?.REASON || 'ERROR'
        this.error = code
        return {
          ok: false,
          error: code,
          message: res?.MESSAGE || '',
          retryAfterSec: Number(res?.RETRY_AFTER_SEC) || null,
        }
      } catch (e) {
        this.error = e.message || 'ошибка отправки'
        return { ok: false, error: 'NETWORK', message: e.message }
      } finally {
        this.sending = false
      }
    },

    async replyToTicket({ ticketId, text, images }) {
      if (this.replying) return false
      this.replying = true
      this.error = null
      try {
        const base64Images = []
        if (Array.isArray(images)) {
          for (const file of images) {
            if (file instanceof File) {
              if (file.size > 3 * 1024 * 1024) throw new Error('фото больше 3 МБ')
              const base64 = await fileToBase64(file)
              base64Images.push(base64)
            } else if (typeof file === 'string') {
              base64Images.push(file)
            }
          }
        }

        const auth = useAuthStore()
        let res

        if (auth.isAuthed) {
          if (!auth.idUser) throw new Error('пользователь не авторизован')
          res = await sendSupportMessage({
            ID_USER: auth.idUser,
            TICKET_ID: ticketId,
            TEXT: String(text || '').trim(),
            IMAGES: base64Images,
          })
        } else {
          const deviceId = readDeviceId()
          if (!deviceId) throw new Error('не найден ID устройства')
          res = await sendGuestMessage({
            DEVICE_ID: deviceId,
            TICKET_ID: ticketId,
            TEXT: String(text || '').trim(),
            IMAGES: base64Images,
          })
        }

        if (isSuccess(res)) {
          await this.loadTicket(ticketId)
          return true
        }
        
        this.error = res?.MESSAGE || 'Не удалось отправить сообщение'
        return false
      } catch (e) {
        this.error = e.message || 'Ошибка отправки'
        return false
      } finally {
        this.replying = false
      }
    },

    async loadTickets() {
      const auth = useAuthStore()
      this.loadingTickets = true
      this.error = null
      try {
        if (auth.isAuthed) {
          const res = await fetchSupportTickets({ ID_USER: auth.idUser })
          if (isSuccess(res) && Array.isArray(res.TICKETS)) {
            this.tickets = res.TICKETS
          }
        } else {
          // Для гостя грузим только его тикет
          const gId = this.guestTicketId
          if (!gId) {
            this.tickets = []
            return
          }
          const deviceId = readDeviceId()
          if (!deviceId) throw new Error('не найден ID устройства')
          
          const res = await fetchGuestTicket({ DEVICE_ID: deviceId, TICKET_ID: gId })
          if (isSuccess(res) && res.TICKET) {
            this.tickets = [res.TICKET]
          } else {
            this.tickets = []
          }
        }
      } catch (e) {
        this.error = e.message || 'не удалось загрузить обращения'
      } finally {
        this.loadingTickets = false
      }
    },

    async loadTicket(ticketId) {
      const auth = useAuthStore()
      this.loadingTicket = true
      this.error = null
      try {
        let res
        if (auth.isAuthed) {
          res = await fetchSupportTicket({ ID_USER: auth.idUser, TICKET_ID: ticketId })
        } else {
          const deviceId = readDeviceId()
          if (!deviceId) throw new Error('не найден ID устройства')
          res = await fetchGuestTicket({ DEVICE_ID: deviceId, TICKET_ID: ticketId })
        }

        if (isSuccess(res) && res.TICKET) {
          this.currentTicket = res.TICKET
          this.currentMessages = res.MESSAGES || []
        } else {
          this.error = res?.MESSAGE || 'обращение не найдено'
        }
      } catch (e) {
        this.error = e.message || 'не удалось загрузить обращение'
      } finally {
        this.loadingTicket = false
      }
    },

    reset() {
      this.error = null
      this.lastTicketId = null
      this.currentTicket = null
      this.currentMessages = []
    },
  },
})