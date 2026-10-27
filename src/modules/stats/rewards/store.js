import { defineStore } from 'pinia'
import { isSuccess, isBlocked } from '../../core/utils/response'
import { useAuthStore } from '../../auth/store'
import { useStatsStore } from '../store'
import { fetchApplesHistory } from './api'

const LS_CACHE = 'rewards.history'
const LS_CACHE_AT = 'rewards.historyAt'
const TTL = 5 * 60 * 1000
const MAX_PAGES = 20

const LECTURE_TYPES = new Set(['lecture', 'lecture_theme', 'lecture_general', 'charging'])

function readCache(userId) {
  try {
    const raw = localStorage.getItem(LS_CACHE)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (cached?.userId !== userId) return null
    return cached.data
  } catch { return null }
}
function writeCache(userId, data) {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify({ userId, data }))
    localStorage.setItem(LS_CACHE_AT, String(Date.now()))
  } catch {}
}
function readCacheAt() {
  try { return Number(localStorage.getItem(LS_CACHE_AT) || 0) } catch { return 0 }
}
function clearCache() {
  try {
    localStorage.removeItem(LS_CACHE)
    localStorage.removeItem(LS_CACHE_AT)
  } catch {}
}

/**
 * Сумма яблок по rewarded-записям.
 * Используется для сверки с серверным счётчиком из статистики.
 */
function sumRewardedPoints(items) {
  return (items || [])
    .filter((it) => it && it.STATUS === 'rewarded')
    .reduce((sum, it) => sum + (Number(it.POINTS) || 0), 0)
}

/**
 * BUCKET с сервера — без префикса (energy / general / charging / ...).
 * В IDB ключ лекции = `lecture-{bucket}:{date}:{id}`. Добавляем префикс.
 */
function bucketToDbBucket(bucket) {
  if (!bucket) return null
  const b = String(bucket)
  if (b.startsWith('lecture-')) return b
  return `lecture-${b}`
}

function parseActionId(actionId) {
  if (!actionId || typeof actionId !== 'string') {
    return { date: null, elementId: null, typePrefix: null }
  }

  const parts = actionId.split(':')

  if (parts.length === 1) {
    const one = parts[0]
    if (/^\d{4}-\d{2}-\d{2}$/.test(one)) return { date: one, elementId: null, typePrefix: null }
    return { date: null, elementId: one, typePrefix: null }
  }

  const last = parts[parts.length - 1]
  const date = /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : null

  if (parts.length === 2) {
    return { date, elementId: parts[0], typePrefix: null }
  }

  if (date) {
    const middle = parts.slice(0, -1)
    const first = middle[0]
    if (/^(lecture|task|habit|charging)/i.test(first)) {
      return {
        date,
        typePrefix: first.toLowerCase(),
        elementId: middle.slice(1).join(':') || null,
      }
    }
    return { date, elementId: middle.join(':'), typePrefix: null }
  }

  return { date: null, elementId: actionId, typePrefix: null }
}

function bucketFromTypePrefix(prefix) {
  if (!prefix) return null
  if (prefix === 'lecture_charging') return 'charging'
  if (prefix === 'lecture_general') return 'general'
  const m = prefix.match(/^lecture_(.+)$/)
  if (m) return m[1]
  return null
}

function refineTypeByActionId(item) {
  if (!item?.ACTION_ID) return item
  const parsed = parseActionId(item.ACTION_ID)
  if (!parsed.typePrefix) return item

  let refined = null
  if (parsed.typePrefix === 'lecture_charging') refined = 'charging'
  else if (parsed.typePrefix === 'lecture_general') refined = 'lecture_general'
  else if (/^lecture_/.test(parsed.typePrefix)) refined = 'lecture_theme'
  else if (parsed.typePrefix === 'task') refined = 'task'
  else if (parsed.typePrefix === 'habit') refined = 'habit'

  if (!refined) return item
  if (item.TYPE === refined) return item
  if (item.TYPE === 'lecture' && /^lecture/.test(refined)) {
    return { ...item, TYPE: refined }
  }
  return item
}

function dedupeByActionId(items) {
  const byKey = new Map()
  const withoutKey = []

  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    if (!it.ACTION_ID) { withoutKey.push(it); continue }

    const key = `${it.ACTION_ID}|${it.TYPE || ''}`
    const existing = byKey.get(key)
    if (!existing) { byKey.set(key, it); continue }

    if (existing.STATUS === 'rewarded' && it.STATUS !== 'rewarded') continue
    if (it.STATUS === 'rewarded' && existing.STATUS !== 'rewarded') {
      byKey.set(key, it); continue
    }
    const te = existing.CREATED_AT ? new Date(existing.CREATED_AT).getTime() : 0
    const tn = it.CREATED_AT ? new Date(it.CREATED_AT).getTime() : 0
    if (tn > te) byKey.set(key, it)
  }

  return [...byKey.values(), ...withoutKey]
}

function normalizeItems(items) {
  const cleaned = []
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    cleaned.push(refineTypeByActionId(it))
  }
  const deduped = dedupeByActionId(cleaned)
  return deduped.sort((a, b) => {
    const ta = a.CREATED_AT ? new Date(a.CREATED_AT).getTime() : 0
    const tb = b.CREATED_AT ? new Date(b.CREATED_AT).getTime() : 0
    return tb - ta
  })
}

async function enrichItems(items) {
  const hasLectures = items.some((it) => LECTURE_TYPES.has(it.TYPE))
  if (!hasLectures) return items

  let byDbKey = null
  let byTitleDate = null

  try {
    const { idbAllLectures } = await import('../../lectures/db')
    const all = await idbAllLectures()
    byDbKey = new Map()
    byTitleDate = new Map()
    for (const l of all) {
      if (!l.dbKey) continue
      byDbKey.set(l.dbKey, l)
      if (l.title && l.publishedDate) {
        byTitleDate.set(
          `${l.publishedDate}|${String(l.title).toLowerCase().trim()}`,
          l,
        )
      }
    }
  } catch (e) {
    console.warn('[rewards] failed to read lectures from IDB:', e)
    return items
  }

  return items.map((it) => {
    if (!LECTURE_TYPES.has(it.TYPE)) return it

    let l = null
    const date = it.DATE
    const sourceId = it.SOURCE_ID || null
    const dbBucket = bucketToDbBucket(it.BUCKET)

    if (sourceId && dbBucket && date && byDbKey) {
      l = byDbKey.get(`${dbBucket}:${date}:${sourceId}`)
    }

    if (!l && it.TITLE && date && byTitleDate) {
      l = byTitleDate.get(`${date}|${String(it.TITLE).toLowerCase().trim()}`)
    }

    if (!l) return it

    return {
      ...it,
      _lecture: {
        dbKey: l.dbKey,
        bucket: l.bucket,
        cover: l.cover || '',
        coverKey: l.coverKey || '',
        title: l.title,
      },
    }
  })
}

export const useRewardsStore = defineStore('rewards', {
  state: () => ({
    items: [],
    total: 0,
    loading: false,
    error: null,
    lastLoadedAt: 0,
    loadedUserId: null,
    partial: false,
    // ▼ Для диагностики последней сверки с серверным счётчиком ▼
    lastSyncCheck: null,
  }),

  getters: {
    earned: (s) => s.items.filter((it) => it.STATUS === 'rewarded'),
    pending: (s) => s.items.filter((it) => it.STATUS !== 'rewarded'),
    totalEarned: (s) =>
      s.items
        .filter((it) => it.STATUS === 'rewarded')
        .reduce((sum, it) => sum + (Number(it.POINTS) || 0), 0),
    pendingCount: (s) =>
      s.items.filter((it) => it.STATUS !== 'rewarded').length,
    hasData: (s) => s.items.length > 0,
  },

  actions: {
    async load({ force = false } = {}) {
      const auth = useAuthStore()
      if (!auth.idUser) return false
      if (this.loading) return false

      if (this.loadedUserId && this.loadedUserId !== auth.idUser) {
        this.clear()
      }

      // ── Кеш ──
      if (!force) {
        const cached = readCache(auth.idUser)
        const cachedAt = readCacheAt()
        if (cached && Date.now() - cachedAt < TTL) {
          const rawItems = Array.isArray(cached.ITEMS) ? cached.ITEMS : []
          const cachedSum = sumRewardedPoints(rawItems)

          // ▼ Сверка с серверным счётчиком из /stats/personal ▼
          // Сравниваем с personal.APPLES (без pendingApples), потому что
          // pendingApples — оптимистичные локальные начисления, которых
          // в /apples/history на сервере ещё нет. Сравнение с store.apples
          // давало бы ложные срабатывания при каждом новом действии.
          const stats = useStatsStore()
          const serverApples = stats.personal?.APPLES
          const canCompare = typeof serverApples === 'number'
          const mismatch = canCompare && serverApples !== cachedSum

          this.lastSyncCheck = {
            at: Date.now(),
            cachedSum,
            serverApples: canCompare ? serverApples : null,
            mismatch,
            source: canCompare ? 'cache-checked' : 'cache-no-compare',
          }

          if (!mismatch) {
            // Кеш валиден — используем без запроса
            this.items = await enrichItems(rawItems)
            this.total = rawItems.length
            this.partial = !!cached.PARTIAL
            this.loadedUserId = auth.idUser
            this.lastLoadedAt = cachedAt
            this.error = null
            return true
          }

          // Расхождение — форсим загрузку с сервера
          console.log('[rewards] сумма яблок не совпадает со статистикой, перезапрашиваем:', {
            cached: cachedSum,
            server: serverApples,
          })
          // Падаем в общую ветку загрузки с сервера
        }
      }

      this.loading = true
      this.error = null
      this.partial = false

      try {
        const first = await fetchApplesHistory({ ID_USER: auth.idUser, PAGE: 1 })

        if (isBlocked(first)) {
          auth.setBlocked(first.MESSAGE)
          return false
        }

        if (!isSuccess(first)) {
          this.error = first?.MESSAGE || 'Не удалось загрузить историю начислений'
          return false
        }

        const collected = Array.isArray(first.ITEMS) ? [...first.ITEMS] : []
        const totalPages = Math.min(Number(first.PAGES) || 1, MAX_PAGES)

        if (totalPages > 1) {
          for (let page = 2; page <= totalPages; page++) {
            try {
              const res = await fetchApplesHistory({ ID_USER: auth.idUser, PAGE: page })
              if (isSuccess(res) && Array.isArray(res.ITEMS)) {
                collected.push(...res.ITEMS)
              } else {
                this.partial = true
                console.warn(`[rewards] page ${page} failed:`, res?.MESSAGE)
              }
            } catch (e) {
              this.partial = true
              console.warn(`[rewards] page ${page} error:`, e?.message)
            }
          }
        }

        const clean = normalizeItems(collected)

        writeCache(auth.idUser, {
          ITEMS: clean,
          TOTAL: clean.length,
          PARTIAL: this.partial,
        })

        this.items = await enrichItems(clean)
        this.total = clean.length
        this.loadedUserId = auth.idUser
        this.lastLoadedAt = Date.now()

        return true
      } catch (e) {
        this.error = e.message || 'Ошибка загрузки'
        return false
      } finally {
        this.loading = false
      }
    },

    clear() {
      this.items = []
      this.total = 0
      this.partial = false
      this.loadedUserId = null
      this.lastLoadedAt = 0
      this.error = null
      this.lastSyncCheck = null
      clearCache()
    },

    invalidateCache() {
      clearCache()
      this.lastLoadedAt = 0
    },
  },
})