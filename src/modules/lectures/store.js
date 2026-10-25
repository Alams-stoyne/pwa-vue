import { defineStore } from 'pinia'
import {
  fetchGeneralLectures, fetchThemeLectures, fetchChargingLectures,
  sendLectureRead, fetchReads,
} from './api'
import {
  persistLecture,
  idbLecturesByBucket,
  idbAllLectures,
  getLecture,
  deleteLecturesByBucketDate,
  cleanupLectures,
} from './db'
import { idbAllKeys, idbPut } from '../core/db'
import { localDate, localDateTime } from '../core/utils/date'
import { isSuccess } from '../core/utils/response'
import { useAuthStore } from '../auth/store'
import { useThemeStore } from '../theme/store'
import { useStatsStore } from '../stats/store'
import { useHomeStore } from '../home/store'
import { useLimits, bucketToRewardType, bucketFromDbKey } from '../core/limits'
import { themesComputed } from '../theme/themes'
import { isOffline } from '../core/utils/network'

const LS_READ = 'lectures.readKeys'
const LS_QUEUE = 'lectures.readQueue'
const LS_LAST_TIME = 'lectures.lastSyncAt'
const LS_ARCHIVE_TIME = 'lectures.lastArchiveSyncAt'
const LS_LAST_READS_SYNC = 'lectures.lastReadsSyncAt'

const HOUR = 60 * 60 * 1000

let _timer = null
let _netWatched = false

function readKeysFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_READ) || '[]') } catch { return [] }
}
function queueFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || '[]') } catch { return [] }
}

export const useLecturesStore = defineStore('lectures', {
  state: () => ({
    generalList: [],
    themeList: [],
    chargingList: [],
    archiveList: [],

    readKeys: readKeysFromLS(),
    loading: false,
    refreshing: false,
    syncing: false,
    syncingReads: false,
    syncingPhotos: false,
    error: null,

    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    loadedTheme: null,
    loadedDate: null,

    lastSyncAt: Number(localStorage.getItem(LS_LAST_TIME) || 0),
    lastArchiveSyncAt: Number(localStorage.getItem(LS_ARCHIVE_TIME) || 0),
    lastReadsSyncAt: Number(localStorage.getItem(LS_LAST_READS_SYNC) || 0),
  }),

  getters: {
    isRead: (s) => (dbKey) => s.readKeys.includes(dbKey),
    totalUnread: (s) =>
      [...s.generalList, ...s.themeList, ...s.chargingList]
        .filter((l) => !s.readKeys.includes(l.dbKey)).length,
  },

  actions: {
    reloadReadKeys() {
      this.readKeys = readKeysFromLS()
    },

    init() {
      this._watchNet()
      this._startTimer()
      this.loadAll()
      this.syncFromServer()
      setTimeout(() => this.syncMissingPhotos(), 4000)
    },

    initNetworkWatcher() {
      this.init()
    },

    async onThemeChanged() {
      this.loadedTheme = null
      this.themeList = []
      await this.loadAll()
      this.syncArchive({ force: true }).catch(() => {})
    },

    _watchNet() {
      if (_netWatched) return
      _netWatched = true
      window.addEventListener('online', () => {
        this.online = true
        this.flushReadQueue()
        this.loadAll({ force: true })
        this.syncFromServer({ force: true })
        this.syncMissingPhotos()
      })
      window.addEventListener('offline', () => { this.online = false })
    },

    _startTimer() {
      if (_timer) return
      _timer = setInterval(() => {
        this.loadAll()
        this.syncFromServer()
        this.syncMissingPhotos()
      }, HOUR)
    },

    async loadAll({ force = false } = {}) {
      const theme = useThemeStore()
      const themeId = theme.selected
      if (!themeId) return

      const today = localDate()
      const hourPassed = Date.now() - this.lastSyncAt >= HOUR
      const sameTheme = this.loadedTheme === themeId
      const sameDate = this.loadedDate === today
      const hasData =
        this.generalList.length + this.themeList.length + this.chargingList.length > 0

      if (!force && !hourPassed && sameTheme && sameDate && hasData) {
        this.error = null
        return
      }

      const [gC, tC, chC] = await Promise.all([
        idbLecturesByBucket('lecture-general',    { onlyDate: today }),
        idbLecturesByBucket(`lecture-${themeId}`, { onlyDate: today }),
        idbLecturesByBucket('lecture-charging',   { onlyDate: today }),
      ])
      this.generalList = gC
      this.themeList = tC
      this.chargingList = chC
      this.loadedTheme = themeId
      this.loadedDate = today

      const total = gC.length + tC.length + chC.length

      if (isOffline()) {
        this.online = false
        this.loading = false
        this.refreshing = false
        this.error = total ? null : 'OFFLINE_EMPTY'
        return
      }

      this.online = true
      this.loading = total === 0
      this.refreshing = total > 0
      this.error = null

      const jobs = [
        { bucket: 'lecture-general',    fetcher: () => fetchGeneralLectures(today) },
        { bucket: `lecture-${themeId}`, fetcher: () => fetchThemeLectures(themeId, today) },
        { bucket: 'lecture-charging',   fetcher: () => fetchChargingLectures(today) },
      ]

      let anySuccess = false
      await Promise.all(jobs.map(async ({ bucket, fetcher }) => {
        try {
          const items = await fetcher()
          await cleanupLectures(bucket, today, items)
          for (const it of items) await persistLecture(bucket, it, today)
          anySuccess = true
        } catch (err) {
          if (err?.message?.includes('404')) {
            await deleteLecturesByBucketDate(bucket, today)
            anySuccess = true
          }
        }
      }))

      if (anySuccess) {
        this.lastSyncAt = Date.now()
        try { localStorage.setItem(LS_LAST_TIME, String(this.lastSyncAt)) } catch {}
      }

      const [g, t, ch] = await Promise.all([
        idbLecturesByBucket('lecture-general',    { onlyDate: today }),
        idbLecturesByBucket(`lecture-${themeId}`, { onlyDate: today }),
        idbLecturesByBucket('lecture-charging',   { onlyDate: today }),
      ])
      this.generalList = g
      this.themeList = t
      this.chargingList = ch

      this.loading = false
      this.refreshing = false
    },

    async refresh() {
      return this.loadAll({ force: true })
    },

    async syncArchive({ days = 7, themeId, allThemes = false, force = false } = {}) {
      if (isOffline()) return { added: 0, days: 0, skipped: true, error: 'OFFLINE' }
      if (this.syncing) return { added: 0, days: 0, skipped: true, error: 'IN_PROGRESS' }

      const theme = useThemeStore()
      const tid = themeId || theme.selected
      if (!tid && !allThemes) return { added: 0, days: 0, skipped: true, error: 'NO_THEME' }

      const hourPassed = Date.now() - this.lastArchiveSyncAt >= HOUR
      if (!force && !hourPassed) return { added: 0, days: 0, skipped: true, error: null }

      const themeIds = allThemes ? themesComputed.value.map((t) => t.id) : [tid]

      this.syncing = true
      let added = 0
      let daysOk = 0

      try {
        for (let i = 1; i <= days; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const date = localDate(d)

          const jobs = [
            { bucket: 'lecture-general',  fetcher: () => fetchGeneralLectures(date) },
            { bucket: 'lecture-charging', fetcher: () => fetchChargingLectures(date) },
          ]

          for (const id of themeIds) {
            jobs.push({
              bucket: `lecture-${id}`,
              fetcher: () => fetchThemeLectures(id, date),
            })
          }

          let dayOk = false
          await Promise.all(jobs.map(async ({ bucket, fetcher }) => {
            try {
              const items = await fetcher()
              await cleanupLectures(bucket, date, items)
              for (const it of items) await persistLecture(bucket, it, date)
              added += items.length
              dayOk = true
            } catch (err) {
              if (err?.message?.includes('404')) {
                await deleteLecturesByBucketDate(bucket, date)
                dayOk = true
              }
            }
          }))
          if (dayOk) daysOk++
        }

        this.lastArchiveSyncAt = Date.now()
        try { localStorage.setItem(LS_ARCHIVE_TIME, String(this.lastArchiveSyncAt)) } catch {}

        await this.loadArchive()

        return { added, days: daysOk, skipped: false, error: null }
      } catch (e) {
        return { added, days: daysOk, skipped: false, error: e.message || 'ERROR' }
      } finally {
        this.syncing = false
      }
    },

    async loadArchive() {
      this.archiveList = await idbAllLectures()
      return this.archiveList
    },

    async syncMissingPhotos() {
      if (isOffline()) return { added: 0, missing: 0, error: 'OFFLINE' }
      if (this.syncingPhotos) return { added: 0, missing: 0, error: 'IN_PROGRESS' }

      this.syncingPhotos = true
      try {
        const all = await idbAllLectures()
        const expected = []
        for (const l of all) {
          for (const p of l.photos || []) {
            if (p?.key && p?.url) expected.push({ key: p.key, url: p.url })
          }
          if (l.coverKey && l.cover) {
            expected.push({ key: l.coverKey, url: l.cover })
          }
        }
        if (!expected.length) return { added: 0, missing: 0, error: null }

        const present = new Set(await idbAllKeys('photos'))
        const missing = expected.filter((e) => !present.has(e.key))
        if (!missing.length) return { added: 0, missing: 0, error: null }

        let added = 0
        for (const m of missing) {
          try {
            const r = await fetch(m.url)
            if (!r.ok) continue
            await idbPut('photos', m.key, await r.blob())
            added++
          } catch { /* skip */ }
        }
        return { added, missing: missing.length, error: null }
      } catch (e) {
        return { added: 0, missing: 0, error: e.message || 'ERROR' }
      } finally {
        this.syncingPhotos = false
      }
    },

    async syncFromServer({ force = false } = {}) {
      if (isOffline()) return { merged: false, error: 'OFFLINE' }
      if (this.syncingReads) return { merged: false, error: 'IN_PROGRESS' }

      const auth = useAuthStore()
      if (!auth.idUser) return { merged: false, error: 'NO_USER' }

      const hourPassed = Date.now() - this.lastReadsSyncAt >= HOUR
      if (!force && !hourPassed) return { merged: false, error: null }

      this.syncingReads = true
      try {
        const res = await fetchReads({ ID_USER: auth.idUser })
        if (!isSuccess(res) || !Array.isArray(res.READS)) {
          return { merged: false, error: 'BAD_RESPONSE' }
        }
        const merged = new Set([...this.readKeys, ...res.READS])
        const before = this.readKeys.length
        this.readKeys = [...merged]
        localStorage.setItem(LS_READ, JSON.stringify(this.readKeys))

        this.lastReadsSyncAt = Date.now()
        try { localStorage.setItem(LS_LAST_READS_SYNC, String(this.lastReadsSyncAt)) } catch {}

        const added = this.readKeys.length - before
        return { merged: true, added, error: null }
      } catch (e) {
        return { merged: false, error: e.message || 'ERROR' }
      } finally {
        this.syncingReads = false
      }
    },

    async getLectureByKey(dbKey) {
      return getLecture(dbKey)
    },

    /**
     * Отметить лекцию прочитанной.
     *
     * @returns {{
     *   done: boolean,                 // действие засчитано
     *   reason?: string,               // причина отказа (ALREADY_READ | NOT_TODAY | NO_LECTURE)
     *   rewardPoints?: number,         // сколько яблок реально начислено (0 если нет)
     *   limitReached?: boolean,        // сервер сообщил REWARD_LIMIT_REACHED
     *   limitInfo?: object|null,       // { type?, limit, count }
     *   rewardType?: string|null,      // lecture_theme | lecture_general | charging
     *   queued?: boolean,              // true если ушло в офлайн-очередь
     * }}
     */
    async markRead(lecture) {
      if (!lecture) return { done: false, reason: 'NO_LECTURE' }
      const { dbKey, publishedDate, bucket } = lecture
      if (this.readKeys.includes(dbKey)) return { done: false, reason: 'ALREADY_READ' }
      if (publishedDate !== localDate()) return { done: false, reason: 'NOT_TODAY' }

      this.readKeys.push(dbKey)
      localStorage.setItem(LS_READ, JSON.stringify(this.readKeys))

      const rewardType = bucketToRewardType(bucket)
      const themeKey = String(bucket || '').replace(/^lecture-/, '') || 'general'
      try { useStatsStore().bumpLecturesRead(themeKey) } catch { /* ignore */ }

      const auth = useAuthStore()
      const payload = {
        ID_USER: auth.idUser,
        ID_LECTURE: dbKey,
        LOCAL_DATETIME: localDateTime(),
      }

      if (isOffline()) {
        const q = queueFromLS()
        q.push({ ...payload, _rewardType: rewardType })
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return {
          done: true, rewardPoints: 0, limitReached: false,
          limitInfo: null, rewardType, queued: true,
        }
      }

      try {
        const res = await sendLectureRead(payload)
        if (!isSuccess(res)) throw new Error('not ok')

        const outcome = useLimits().handleRewardResponse(res, rewardType)
        if (outcome.rewardPoints > 0) {
          try { useStatsStore().addApplesLocally(outcome.rewardPoints) } catch { /* ignore */ }
        }
        try { useHomeStore().refreshToday() } catch { /* ignore */ }

        return { done: true, ...outcome, queued: false }
      } catch {
        const q = queueFromLS()
        q.push({ ...payload, _rewardType: rewardType })
        localStorage.setItem(LS_QUEUE, JSON.stringify(q))
        try { useHomeStore().refreshToday() } catch { /* ignore */ }
        return {
          done: true, rewardPoints: 0, limitReached: false,
          limitInfo: null, rewardType, queued: true,
        }
      }
    },

    async flushReadQueue() {
      if (isOffline()) return
      const q = queueFromLS()
      if (!q.length) return
      const remain = []
      const limits = useLimits()
      for (const p of q) {
        // Отделяем клиентское поле _rewardType, чтобы не отправлять его на сервер.
        const { _rewardType, ...cleanPayload } = p
        // Fallback для старых записей очереди без _rewardType.
        const fallbackType = _rewardType || bucketToRewardType(bucketFromDbKey(cleanPayload.ID_LECTURE))
        try {
          const res = await sendLectureRead(cleanPayload)
          if (!isSuccess(res)) {
            remain.push(p)
          } else {
            const outcome = limits.handleRewardResponse(res, fallbackType)
            if (outcome.rewardPoints > 0) {
              try { useStatsStore().addApplesLocally(outcome.rewardPoints) } catch { /* ignore */ }
            }
          }
        } catch { remain.push(p) }
      }
      localStorage.setItem(LS_QUEUE, JSON.stringify(remain))
    },
  },
})