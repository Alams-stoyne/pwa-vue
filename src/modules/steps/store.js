import { defineStore } from 'pinia'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useStatsStore } from '../stats/store'
import { useMascotStore } from '../mascot/store'
import {
  sendSteps,
  fetchStepsSummary,
  fetchStepsLeaderboard,
  fetchSchoolStats,
} from './api'

const LS_LAST_SUBMIT = 'steps.lastSubmittedAt'
const LS_LB_CACHE_AT = 'steps.lb.cacheAt'
const LS_SCHOOL_CACHE_AT = 'steps.school.cacheAt'

const LB_TTL_MS = 30 * 60 * 1000
const SCHOOL_TTL_MS = 30 * 60 * 1000
const SUMMARY_MIN_INTERVAL_MS = 2 * 60 * 1000
const NEGATIVE_TTL_MS = 5 * 60 * 1000

/**
 * Сжатие изображения через canvas.
 *
 * Использует URL.createObjectURL вместо FileReader.
 * Причина: на Android (Samsung S20+ / Android 13 / Chrome) FileReader
 * регулярно падает с NotReadableError ("The requested file could not
 * be read, typically due to permission problems...") — особенно для
 * HEIC и файлов из Samsung Gallery / Google Photos.
 *
 * URL.createObjectURL + Image работают надёжнее: браузер сам забирает
 * данные из источника, пока тот ещё доступен.
 *
 * Если файл битый или формат не поддерживается (HEIC на некоторых
 * сборках Chrome) — сработает img.onerror, и мы покажем пользователю
 * понятный текст.
 */
function compressImage(file, { maxDim = 1600, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    let url
    try {
      url = URL.createObjectURL(file)
    } catch (e) {
      reject(new Error('не удалось получить доступ к файлу'))
      return
    }

    const cleanup = () => {
      try { URL.revokeObjectURL(url) } catch { /* ignore */ }
    }

    const img = new Image()

    img.onload = () => {
      cleanup()
      try {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim }
        } else {
          if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (e) {
        reject(new Error('не удалось сжать изображение: ' + (e?.message || 'unknown')))
      }
    }

    img.onerror = () => {
      cleanup()
      reject(new Error(
        'не удалось прочитать изображение. попробуйте другое фото ' +
        'или сделайте скриншот экрана заново'
      ))
    }

    img.src = url
  })
}

function resolveDateKey(sel) {
  if (!sel || sel === 'all') return 'all'
  if (sel === 'today') return localDate()
  if (sel === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return localDate(d)
  }
  return String(sel)
}

function hasLeaderboardData(data) {
  if (!data) return false
  if (Array.isArray(data.ALL) && data.ALL.length > 0) return true
  if (data.BY_WORKPLACE && Object.keys(data.BY_WORKPLACE).length > 0) return true
  return false
}

function daysInclusive(fromIso, toIso) {
  if (!fromIso || !toIso) return 0
  const from = new Date(fromIso).getTime()
  const to = new Date(toIso).getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0
  return Math.round((to - from) / 86400000) + 1
}

function plannedFrom(summary) {
  return summary?.PLANNED_FROM || summary?.PERIOD?.PLANNED_FROM || null
}
function plannedTo(summary) {
  return summary?.PLANNED_TO || summary?.PERIOD?.PLANNED_TO || null
}

/**
 * Флаг «админ задал реальный период».
 * PERIOD_CONFIGURED есть в summary.PERIOD (новый контракт).
 * Legacy-ответы (без поля) считаем «настроен» — старое поведение.
 */
function isConfigured(summary) {
  const v = summary?.PERIOD?.PERIOD_CONFIGURED
  if (typeof v === 'boolean') return v
  return true
}

function parseIsoLocal(iso) {
  if (!iso || typeof iso !== 'string') return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const inFlightLB = new Map()

export const useStepsStore = defineStore('steps', {
  state: () => ({
    summary: null,
    loadingSummary: false,
    lastSummaryAt: 0,
    sending: false,
    error: null,
    lastSubmittedAt: Number(localStorage.getItem(LS_LAST_SUBMIT) || 0),

    leaderboards: {},
    leaderboardMeta: {},

    _probedDates: {},

    leaderboardDate: 'all',
    leaderboardResolvedKey: 'all',

    _lbInFlight: {},

    schoolStats: null,
    schoolStatsAt: 0,
  }),

  getters: {
    hasSummary: (s) => !!s.summary,
    goal: (s) => s.summary?.GOAL || 0,
    rank: (s) => s.summary?.RANK || 0,
    totalUsers: (s) => s.summary?.TOTAL_USERS || 0,
    totalSteps: (s) => s.summary?.TOTAL_STEPS || 0,
    todaySteps: (s) => s.summary?.TODAY_STEPS || 0,
    lastSentSteps: (s) => Number(s.summary?.TODAY_SENT_STEPS) || 0,

    isPeriodConfigured: (s) => isConfigured(s.summary),

    confirmedDays: (s) => {
      const cnt = Number(s.summary?.CONFIRMED_DAYS_COUNT)
      if (Number.isFinite(cnt) && cnt >= 0) return cnt
      const dates = Array.isArray(s.summary?.CONFIRMED_DATES) ? s.summary.CONFIRMED_DATES : []
      return dates.length
    },

    totalDays: (s) => {
      if (!isConfigured(s.summary)) return 0
      const n = daysInclusive(plannedFrom(s.summary), plannedTo(s.summary))
      if (n > 0) return n
      const p = s.summary?.PERIOD
      return daysInclusive(p?.FROM, p?.TO)
    },

    progressPercent: (s) => {
      if (!isConfigured(s.summary)) return 0

      const total = daysInclusive(plannedFrom(s.summary), plannedTo(s.summary))
        || daysInclusive(s.summary?.PERIOD?.FROM, s.summary?.PERIOD?.TO)
      if (total <= 0) return 0

      let confirmed = Number(s.summary?.CONFIRMED_DAYS_COUNT)
      if (!Number.isFinite(confirmed) || confirmed < 0) {
        const dates = Array.isArray(s.summary?.CONFIRMED_DATES) ? s.summary.CONFIRMED_DATES : []
        confirmed = dates.length
      }
      return Math.max(0, Math.min(100, (confirmed / total) * 100))
    },

    plannedPeriod: (s) => {
      if (!isConfigured(s.summary)) return null

      const from = plannedFrom(s.summary)
      const to = plannedTo(s.summary)
      if (!from || !to) return null
      return { FROM: from, TO: to }
    },

    effectivePeriod: (s) => s.summary?.PERIOD || null,
    progressToGoal: (s) => Number(s.summary?.PROGRESS_PERCENT) || 0,

    daysLeft: (s) => {
      if (!isConfigured(s.summary)) return null

      const to = plannedTo(s.summary)
      if (!to) return null
      const toTs = new Date(to).getTime()
      if (!Number.isFinite(toTs)) return null
      const today = new Date(localDate()).getTime()
      const diff = Math.ceil((toTs - today) / 86400000)
      return Math.max(0, diff + 1)
    },

    availableDates: (s) => {
      const p = s.summary?.PERIOD
      let fromIso = p?.FROM || plannedFrom(s.summary)
      let toIso = p?.TO || plannedTo(s.summary)
      if (!fromIso || !toIso) return []

      const from = parseIsoLocal(fromIso)
      const to = parseIsoLocal(toIso)
      if (!from || !to || to < from) return []

      const out = []
      const cursor = new Date(to)
      while (cursor >= from) {
        out.push(localDate(cursor))
        cursor.setDate(cursor.getDate() - 1)
      }
      return out
    },

    userWorkplace: () => {
      try {
        const profile = JSON.parse(localStorage.getItem('profile') || '{}')
        return profile.workplace || ''
      } catch {
        return ''
      }
    },

    currentLeaderboard: (s) => s.leaderboards[s.leaderboardResolvedKey] || null,

    loadingLeaderboard: (s) => {
      const resolved = s.leaderboardResolvedKey
      if (resolved && s._lbInFlight[resolved]) return true
      if (s.leaderboardDate === 'today') {
        const todayKey = resolveDateKey('today')
        return !!s._lbInFlight[todayKey]
      }
      return false
    },

    myWorkplaceTop: (s) => {
      const lb = s.leaderboards[s.leaderboardResolvedKey]
      if (!lb) return []
      const wp = s.userWorkplace
      if (wp && lb.BY_WORKPLACE && lb.BY_WORKPLACE[wp]) {
        return lb.BY_WORKPLACE[wp].TOP || []
      }
      return lb.ALL || []
    },

    workplaceMeta: (s) => {
      const lb = s.leaderboards[s.leaderboardResolvedKey]
      if (!lb || !s.userWorkplace) return null
      return lb.BY_WORKPLACE?.[s.userWorkplace] || null
    },

    leaderboardUpdatedAt: (s) => {
      const lb = s.leaderboards[s.leaderboardResolvedKey]
      return lb?.UPDATED_AT || s.schoolStats?.UPDATED_AT || null
    },

    todayStatus: (s) => {
      const st = s.summary?.TODAY_STATUS
      if (st === 'approved' || st === 'pending' || st === 'rejected' || st === 'none') return st
      if (s.summary) {
        if (s.summary.TODAY_CONFIRMED === true) return 'approved'
        if (Number(s.summary.TODAY_STEPS) > 0) return 'approved'
        if (s.summary.TODAY_SUBMITTED === true) return 'pending'
        return 'none'
      }
      if (s.lastSubmittedAt) {
        const last = new Date(s.lastSubmittedAt)
        const today = new Date()
        const sameDay =
          last.getDate() === today.getDate() &&
          last.getMonth() === today.getMonth() &&
          last.getFullYear() === today.getFullYear()
        if (sameDay) return 'pending'
      }
      return 'none'
    },

    todayState: (s) => {
      const st = s.summary?.TODAY_STATUS
      if (st === 'approved') return 'confirmed'
      if (st === 'pending') return 'pending'
      if (st === 'rejected') return 'rejected'
      if (s.summary?.TODAY_CONFIRMED === true) return 'confirmed'
      if (Number(s.summary?.TODAY_STEPS) > 0) return 'confirmed'
      if (s.summary?.TODAY_SUBMITTED === true) return 'pending'
      return 'form'
    },

    isSubmittedToday: (s) => {
      const st = s.summary?.TODAY_STATUS
      if (st === 'pending' || st === 'approved') return true
      if (st === 'rejected' || st === 'none') return false
      if (Number(s.summary?.TODAY_STEPS) > 0) return true
      if (s.summary?.TODAY_SUBMITTED === true) return true
      if (!s.lastSubmittedAt) return false
      const lastDate = new Date(s.lastSubmittedAt)
      const today = new Date()
      return (
        lastDate.getDate() === today.getDate() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getFullYear() === today.getFullYear()
      )
    },

    isConfirmedToday: (s) => {
      const st = s.summary?.TODAY_STATUS
      if (st === 'approved') return true
      if (st === 'pending' || st === 'rejected' || st === 'none') return false
      if (!s.summary) return false
      if (s.summary.TODAY_CONFIRMED !== undefined) return s.summary.TODAY_CONFIRMED === true
      return Number(s.summary.TODAY_STEPS) > 0
    },

    isRejectedToday: (s) => s.summary?.TODAY_STATUS === 'rejected',

    rejectReason: (s) => {
      if (!s.summary) return ''
      const reason = s.summary.TODAY_REJECT_REASON
      if (typeof reason === 'string' && reason.trim()) return reason.trim()
      return 'Попробуйте отправить еще раз'
    },
  },

  actions: {
    async loadSummary({ force = false } = {}) {
      const auth = useAuthStore()
      if (!auth.idUser) return
      if (this.loadingSummary) return
      if (!force && this.lastSummaryAt && Date.now() - this.lastSummaryAt < SUMMARY_MIN_INTERVAL_MS) {
        return
      }

      this.loadingSummary = true
      try {
        const res = await fetchStepsSummary({ ID_USER: auth.idUser })
        if (isSuccess(res)) {
          this.summary = res
          this.lastSummaryAt = Date.now()
        }
      } catch (e) {
        console.error('[steps] loadSummary error:', e)
      } finally {
        this.loadingSummary = false
      }
    },

    async loadSchoolStats({ force = false } = {}) {
      if (!force && this.schoolStats && Date.now() - this.schoolStatsAt < SCHOOL_TTL_MS) return
      try {
        const data = await fetchSchoolStats()
        if (data) {
          this.schoolStats = data
          this.schoolStatsAt = Date.now()
          try {
            localStorage.setItem(LS_SCHOOL_CACHE_AT, String(this.schoolStatsAt))
          } catch {}
        }
      } catch (e) {
        console.warn('[steps] loadSchoolStats failed:', e)
      }
    },

    async loadLeaderboard({ date = 'all', force = false } = {}) {
      this.leaderboardDate = date

      if (date === 'all') {
        this.leaderboardResolvedKey = 'all'
        await this._loadOneKey('all', { force })
      } else if (date === 'today') {
        const todayKey = resolveDateKey('today')
        const yesterdayKey = resolveDateKey('yesterday')
        this.leaderboardResolvedKey = todayKey
        const todayLoaded = await this._loadOneKey(todayKey, { force })
        if (!todayLoaded) {
          const yesterdayLoaded = await this._loadOneKey(yesterdayKey, { force })
          if (yesterdayLoaded) this.leaderboardResolvedKey = yesterdayKey
        }
      } else {
        const key = resolveDateKey(date)
        this.leaderboardResolvedKey = key
        await this._loadOneKey(key, { force })
        this._probedDates[key] = !!this.leaderboards[key]
      }

      this.loadSchoolStats().catch(() => {})
    },

    async probeDates(dates) {
      if (!Array.isArray(dates) || !dates.length) return
      const toProbe = dates.filter((d) => !(d in this._probedDates))
      if (!toProbe.length) return

      await Promise.all(
        toProbe.map(async (d) => {
          await this._loadOneKey(d)
          this._probedDates[d] = !!this.leaderboards[d]
        }),
      )
    },

    async _loadOneKey(key, { force = false } = {}) {
      const meta = this.leaderboardMeta[key] || {}
      const loaded = this.leaderboards[key]
      const now = Date.now()

      if (!force && loaded) {
        const cacheAt = Number(localStorage.getItem(`${LS_LB_CACHE_AT}.${key}`) || 0)
        if (now - cacheAt < LB_TTL_MS) return true
      }
      if (!force && meta.emptyAt && now - meta.emptyAt < NEGATIVE_TTL_MS) return false
      if (!force && !loaded && meta.triedAt && now - meta.triedAt < NEGATIVE_TTL_MS) return false

      if (inFlightLB.has(key)) return inFlightLB.get(key)

      this._lbInFlight[key] = true

      const promise = (async () => {
        try {
          const data = key === 'all'
            ? await fetchStepsLeaderboard(null)
            : await fetchStepsLeaderboard(key)

          this.leaderboardMeta[key] = { ...meta, triedAt: now }

          if (hasLeaderboardData(data)) {
            this.leaderboards[key] = data
            this.leaderboardMeta[key].emptyAt = 0
            try {
              localStorage.setItem(`${LS_LB_CACHE_AT}.${key}`, String(now))
            } catch {}
            return true
          } else {
            this.leaderboardMeta[key].emptyAt = now
            return false
          }
        } catch (e) {
          console.warn(`[steps] loadLeaderboard(${key}) failed:`, e)
          this.leaderboardMeta[key] = { ...meta, triedAt: now }
          return false
        } finally {
          this._lbInFlight[key] = false
          inFlightLB.delete(key)
        }
      })()

      inFlightLB.set(key, promise)
      return promise
    },

    _applyTodayFromResponse(res) {
      if (!res || typeof res !== 'object') return false

      const hasStatus  = typeof res.TODAY_STATUS === 'string'
      const hasReason  = res.TODAY_REJECT_REASON !== undefined
      const hasSent    = res.TODAY_SENT_STEPS !== undefined
      const hasToday   = res.TODAY_STEPS !== undefined

      if (!hasStatus && !hasReason && !hasSent && !hasToday) return false

      const current = this.summary || {}
      this.summary = {
        ...current,
        ...(hasStatus ? { TODAY_STATUS: res.TODAY_STATUS } : {}),
        ...(hasReason ? { TODAY_REJECT_REASON: res.TODAY_REJECT_REASON } : {}),
        ...(hasSent   ? { TODAY_SENT_STEPS: res.TODAY_SENT_STEPS } : {}),
        ...(hasToday  ? { TODAY_STEPS: res.TODAY_STEPS } : {}),
      }
      return true
    },

    async send({ steps, images, consent }) {
      const auth = useAuthStore()
      if (!auth.idUser) {
        this.error = 'Пользователь не авторизован'
        return { ok: false, alreadySent: false, message: this.error }
      }

      this.sending = true
      this.error = null
      try {
        const base64Images = []
        for (const file of images) {
          if (!(file instanceof File)) continue

          // Защита от гигантских файлов — ещё до чтения в память
          if (file.size > 10 * 1024 * 1024) {
            throw new Error('файл слишком большой (макс. 10МБ)')
          }

          try {
            const compressed = await compressImage(file)
            base64Images.push(compressed)
          } catch (e) {
            console.error('[steps] image prepare failed:', {
              name: e?.name,
              message: e?.message,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            })
            throw new Error(e?.message || 'не удалось подготовить изображение')
          }
        }

        const res = await sendSteps({
          ID_USER: auth.idUser,
          STEPS: steps,
          IMAGES: base64Images,
          CONSENT: consent,
          LOCAL_DATETIME: localDateTime(),
        })

        const applied = this._applyTodayFromResponse(res)

        if (isSuccess(res)) {
          this.lastSubmittedAt = Date.now()
          try { localStorage.setItem(LS_LAST_SUBMIT, String(this.lastSubmittedAt)) } catch {}

          try {
            if (res.REWARD_POINTS) {
              useStatsStore().addApplesLocally(res.REWARD_POINTS)
            }
          } catch {}

          try { useMascotStore().trigger('steps') } catch { /* ignore */ }

          try {
            const todayKey = localDate()
            delete this.leaderboards[todayKey]
            delete this.leaderboardMeta[todayKey]
            delete this._probedDates[todayKey]
            localStorage.removeItem(`${LS_LB_CACHE_AT}.${todayKey}`)
          } catch {}

          if (!applied) {
            await this.loadSummary({ force: true })
          }

          return { ok: true, alreadySent: false }
        }

        if (res?.RESULT === 'ALREADY_SENT_TODAY') {
          const msg = res.MESSAGE || 'Сегодня вы уже отправляли шаги.'
          this.error = msg
          if (!applied) await this.loadSummary({ force: true })
          return { ok: false, alreadySent: true, message: msg }
        }

        const errMsg = res?.MESSAGE || 'Ошибка при отправке данных'
        this.error = errMsg
        return { ok: false, alreadySent: false, message: errMsg }
      } catch (e) {
        // Детальное логирование — по нему видно, что именно упало
        console.error('[steps] send failed:', {
          name: e?.name,
          message: e?.message,
          code: e?.code,
          stack: e?.stack,
        })

        let msg
        if (e?.name === 'OfflineError' || e?.code === 'OFFLINE') {
          msg = 'нет соединения с интернетом'
        } else if (e?.name === 'TimeoutError' || e?.code === 'TIMEOUT') {
          msg = 'превышено время ожидания. проверьте соединение и попробуйте снова'
        } else if (e?.message && e.message !== 'undefined') {
          msg = e.message
        } else {
          msg = 'не удалось отправить данные. попробуйте ещё раз'
        }
        this.error = msg
        return { ok: false, alreadySent: false, message: msg }
      } finally {
        this.sending = false
      }
    },

    reset() {
      this.error = null
    },
  },
})