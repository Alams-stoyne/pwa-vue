import { defineStore } from 'pinia'
import { fetchConsentStatus, saveConsent } from './api'
import { useAuthStore } from '../auth/store'
import { localDateTime } from '../core/utils/date'
import { isBlocked } from '../core/utils/response'
import { useStatsStore } from '../stats/store'

const LS_ANSWERED = 'consent.answered'
const LS_GRANTED = 'consent.granted'
const LS_AT = 'consent.at'

const SYNC_TIMEOUT_MS = 5000

function readLocal() {
  try {
    return {
      answered: localStorage.getItem(LS_ANSWERED) === '1',
      granted: localStorage.getItem(LS_GRANTED) === '1',
      at: Number(localStorage.getItem(LS_AT) || 0) || null,
    }
  } catch {
    return { answered: false, granted: false, at: null }
  }
}

function writeLocal({ granted, at }) {
  try {
    localStorage.setItem(LS_ANSWERED, '1')
    localStorage.setItem(LS_GRANTED, granted ? '1' : '0')
    if (at) localStorage.setItem(LS_AT, String(at))
  } catch {}
}

function clearLocal() {
  try {
    localStorage.removeItem(LS_ANSWERED)
    localStorage.removeItem(LS_GRANTED)
    localStorage.removeItem(LS_AT)
  } catch {}
}

const initial = readLocal()

export const useConsentStore = defineStore('consent', {
  state: () => ({
    answered: initial.answered,
    granted: initial.granted,
    at: initial.at,
    loading: false,
    saving: false,
    error: null,
  }),

  getters: {
    isGranted: (s) => s.granted === true,
    isAnswered: (s) => s.answered === true,
  },

  actions: {
    reload() {
      const fresh = readLocal()
      this.answered = fresh.answered
      this.granted = fresh.granted
      this.at = fresh.at
    },

    async loadStatus({ force = false } = {}) {
      // Guard: не дёргаем сеть, если согласие уже известно и не force
      if (!force && this.answered) return true
      if (this.loading) return false

      this.loading = true
      this.error = null
      try {
        const auth = useAuthStore()
        if (!auth.idUser) return false

        const res = await Promise.race([
          fetchConsentStatus({ ID_USER: auth.idUser }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), SYNC_TIMEOUT_MS),
          ),
        ])

        if (isBlocked(res)) {
          auth.setBlocked(res.MESSAGE)
          return false
        }

        if (res && res.RESULT === 'OK') {
          // Плоские поля (текущий ответ)
          if (res.CONSENT === true || res.HAS_CONSENT === true) {
            this.answered = true
            this.granted = true
            this.at = res.CONSENT_AT ? new Date(res.CONSENT_AT).getTime() : Date.now()
            writeLocal({ granted: this.granted, at: this.at })
            return true
          }
          // Вложенный объект (старый)
          if (res.CONSENT && typeof res.CONSENT === 'object') {
            this.answered = true
            this.granted = !!res.CONSENT.granted
            this.at = res.CONSENT.at ? new Date(res.CONSENT.at).getTime() : null
            writeLocal({ granted: this.granted, at: this.at })
            return true
          }
          return false
        }
        return false
      } catch {
        return false
      } finally {
        this.loading = false
      }
    },

    async answer(granted) {
      if (this.saving) return false
      this.saving = true
      this.error = null

      this.answered = true
      this.granted = !!granted
      this.at = Date.now()
      writeLocal({ granted: this.granted, at: this.at })

      try {
        const auth = useAuthStore()
        if (auth.idUser) {
          const res = await Promise.race([
            saveConsent({
              ID_USER: auth.idUser,
              GRANTED: !!granted,
              LOCAL_DATETIME: localDateTime(),
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), SYNC_TIMEOUT_MS),
            ),
          ])

          if (isBlocked(res)) {
            auth.setBlocked(res.MESSAGE)
            return false
          }

          if (res && res.RESULT === 'OK' && res.AT) {
            this.at = new Date(res.AT).getTime()
            writeLocal({ granted: this.granted, at: this.at })
          } else {
            console.warn('[consent] server did not confirm, applied locally', res)
          }
        }
      } catch (e) {
        console.warn('[consent] sync failed, applied locally:', e.message)
      } finally {
        this.saving = false
      }

      // ▼ НОВОЕ: после получения согласия форсим подтягивание
      //   персональных данных. Иначе ApplesBadge / статистика останутся
      //   на 0 до следующего визита в /stats или 15-минутного таймера.
      if (granted) {
        try {
          const stats = useStatsStore()
          stats.fetchPersonal({ force: true }).catch(() => {})
          stats.fetchGlobal({ force: true }).catch(() => {})
        } catch { /* ignore */ }
      }

      return true
    },

    reset() {
      this.answered = false
      this.granted = false
      this.at = null
      this.error = null
      clearLocal()
    },
  },
})