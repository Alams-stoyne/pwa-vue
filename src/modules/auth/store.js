import { defineStore } from 'pinia'
import { registerRequest } from './api'
import { isSuccess } from '../core/utils/response'
import { useThemeStore } from '../theme/store'
import { useHomeStore } from '../home/store'
import {
  readUid,
  readDeviceId,
  readBoundUid,
  readDeviceIdCreatedAt,
  readDeviceRotatedAt,
} from '../install/useAccess'
import { applyState, applyReads, applyTasks, applyHabits } from './stateSync'

const LS_ID = 'auth.id_user'
const LS_REGISTERED = 'auth.registered'
const LS_CONFIRMED = 'auth.confirmed'
const LS_UID_BOUND = 'auth.uid_bound'
const LS_LAST_ATTEMPT = 'auth.last_attempt'
const LS_ATTEMPTS = 'auth.attempts_count'

const MIN_INTERVAL_MS = 5000
const MAX_ATTEMPTS = 10

function readAttempts() {
  try {
    const v = Number(localStorage.getItem(LS_ATTEMPTS))
    return Number.isFinite(v) && v >= 0 ? v : 0
  } catch { return 0 }
}

function bumpAttempts() {
  const next = readAttempts() + 1
  try { localStorage.setItem(LS_ATTEMPTS, String(next)) } catch {}
  return next
}

function resetAttempts() {
  try { localStorage.removeItem(LS_ATTEMPTS) } catch {}
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    idUser: null,
    isAuthed: false,
    registering: false,
    error: null,
    boundUid: readBoundUid(),

    isRegistered: false,
    isConfirmed: false,

    lastResult: null,
    retryAfterMs: 0,
  }),

  getters: {
    hasBoundUid: (s) => !!s.boundUid,
  },

  actions: {
    load() {
      const id = localStorage.getItem(LS_ID)
      if (id) {
        this.idUser = id
        this.isAuthed = true
      }
      this.isRegistered = localStorage.getItem(LS_REGISTERED) === '1'
      this.isConfirmed = localStorage.getItem(LS_CONFIRMED) === '1'
      this.boundUid = readBoundUid()
    },

    confirmRegistration() {
      try { localStorage.setItem(LS_CONFIRMED, '1') } catch {}
      this.isConfirmed = true
    },

    async registerWithUid() {
      if (this.isAuthed) return true
      if (this.registering) return false

      try {
        const last = Number(localStorage.getItem(LS_LAST_ATTEMPT) || 0)
        const sinceLast = Date.now() - last
        if (last && sinceLast < MIN_INTERVAL_MS) {
          this.error = 'Подождите пару секунд и попробуйте снова'
          return false
        }
        localStorage.setItem(LS_LAST_ATTEMPT, String(Date.now()))
      } catch {}

      const uid = readUid()
      const deviceId = readDeviceId()
      const deviceIdCreatedAt = readDeviceIdCreatedAt()
      const deviceRotatedAt = readDeviceRotatedAt()

      if (!uid) {
        this.error = 'Не найден uid'
        return false
      }

      this.registering = true
      this.error = null
      this.lastResult = null
      this.retryAfterMs = 0

      const short = (s) => (s ? String(s).slice(0, 8) + '…' : '—')
      console.log('[auth] register →', {
        uid: short(uid),
        deviceId: short(deviceId),
        deviceAgeMs: deviceIdCreatedAt ? Date.now() - deviceIdCreatedAt : null,
        deviceRotatedAgoMs: deviceRotatedAt ? Date.now() - deviceRotatedAt : null,
        attempt: readAttempts() + 1,
      })

      try {
        const data = await registerRequest({
          uid,
          deviceId,
          deviceIdCreatedAt: deviceIdCreatedAt || undefined,
          deviceRotatedAt: deviceRotatedAt || undefined,
        })

        if (data?.RESULT === 'UID_TAKEN') {
          this.lastResult = 'UID_TAKEN'
          this.error = 'UID_TAKEN'
          return false
        }

        if (data?.RESULT === 'DEVICE_ROTATED') {
          this.lastResult = 'DEVICE_ROTATED'
          this.error = 'DEVICE_ROTATED'
          return false
        }

        if (data?.RESULT === 'UID_LOCKED') {
          try {
            if (data.LOCKED_UID) {
              localStorage.setItem(LS_UID_BOUND, data.LOCKED_UID)
              localStorage.setItem('auth.uid', data.LOCKED_UID)
            }
          } catch {}
          this.boundUid = data.LOCKED_UID || this.boundUid
          this.lastResult = 'UID_LOCKED'
          this.error = 'UID_LOCKED'
          return false
        }

        if (data?.RESULT === 'UID_NOT_FOUND') {
          this.lastResult = 'UID_NOT_FOUND'
          this.error = 'UID_NOT_FOUND'
          return false
        }

        if (data?.RESULT === 'RATE_LIMITED') {
          this.lastResult = 'RATE_LIMITED'
          this.retryAfterMs = Number(data.RETRY_AFTER_MS) || 0
          const sec = Math.ceil(this.retryAfterMs / 1000)
          this.error = sec > 0
            ? `Слишком много попыток. Повторите через ${sec} с.`
            : 'Слишком много попыток. Подождите и попробуйте снова.'
          return false
        }

        if (!isSuccess(data) || !data.ID_USER) {
          this.error = 'Сервер отклонил регистрацию'
          return false
        }

        if (data.STATE) {
          try { applyState(data.STATE) } catch {}
        }
        if (Array.isArray(data.READS)) {
          try { applyReads(data.READS) } catch {}
        }
        if (Array.isArray(data.TASKS)) {
          try { applyTasks(data.TASKS) } catch {}
        }
        if (data.HABITS) {
          try { applyHabits(data.HABITS) } catch {}
        }

        this.idUser = String(data.ID_USER)
        this.isAuthed = true
        localStorage.setItem(LS_ID, this.idUser)
        localStorage.setItem(LS_REGISTERED, '1')
        localStorage.setItem(LS_UID_BOUND, uid)
        localStorage.setItem('auth.uid', uid)
        this.boundUid = uid
        this.isRegistered = true
        resetAttempts()

        return true
      } catch (e) {
        this.error = 'Ошибка сети. Проверьте соединение.'
        bumpAttempts()
        if (readAttempts() >= MAX_ATTEMPTS) {
          this.error = 'Слишком много попыток. Перезапустите приложение.'
        }
        return false
      } finally {
        this.registering = false
      }
    },

    logout() {
      this.idUser = null
      this.isAuthed = false
      this.isRegistered = false
      this.isConfirmed = false
      this.lastResult = null
      this.retryAfterMs = 0
      localStorage.removeItem(LS_ID)
      localStorage.removeItem(LS_REGISTERED)
      localStorage.removeItem(LS_CONFIRMED)
      resetAttempts()

      useThemeStore().reset()
      // Сброс кеша виджета «Сегодня»
      try { useHomeStore().resetToday() } catch { /* ignore */ }
      // Сброс кеша обучения (Cache Storage + localStorage)
      try {
        if ('caches' in window) caches.delete('tutorial-slides').catch(() => {})
      } catch {}

      const userKeys = [
        'quiz.done', 'quiz.recommended', 'quiz.answers',
        'quiz.questionsCache', 'quiz.questionsCacheAt',
        'tutorial.done', 'tutorial.cache', 'tutorial.cacheAt',
        'profile', 'profile.pending', 'profile.syncedAt',
        'lectures.readKeys', 'lectures.readQueue',
        'lectures.lastSyncAt', 'lectures.lastArchiveSyncAt',
        'lectures.lastReadsSyncAt',
        'tasks.doneKeys', 'tasks.queue', 'tasks.lastSyncAt',
        'habits.state', 'habits.queue', 'habits.lastSyncAt',
        'habits.cache', 'habits.cacheAt', 'habits.cacheTheme',
        'habits.selectedHabitId', 'habits.selectedHabitData', 
        'stats.local', 'stats.server', 'stats.global', 'stats.times',
        'home.lastSendDate', 'home.lastSyncAt', 'home.queue',
        'home.today', 'home.todayAt',
        'theme.selected', 'theme.themesCache', 'theme.themesCacheAt',
      ]
      for (const k of userKeys) localStorage.removeItem(k)
    },
  },
})