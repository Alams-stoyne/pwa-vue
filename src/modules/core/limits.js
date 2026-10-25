/**
 * Лимиты дневных наград.
 *
 * Источники:
 *   • GET {CDN}/config/limits_rules.json — только { LIMITS: { type: { limit } } }
 *   • POST {API}/auth → поле LIMITS_USED (при инициализации сессии)
 *   • POST {API}/config/limits → свежие { USED: {...} } (по visibilitychange)
 *
 * Локальное обновление:
 *   • REWARD_POINTS > 0           → recordReward(type, points)   → used += 1
 *   • REWARD_LIMIT_REACHED: true  → recordLimitReached(type, info) → used = max(limit, count)
 *
 * Все ключи нормализуются к нижнему регистру — клиент устойчив к тому, что
 * сервер может отдать "LECTURE_THEME" (UPPER) или "lecture_theme" (lower).
 */
import { ref, computed } from 'vue'
import { localDate, localDateTime } from './utils/date'
import { fetchWithTimeout, isOffline } from './utils/network'
import { isSuccess } from './utils/response'

const CDN = import.meta.env.VITE_CDN_URL
const API = import.meta.env.VITE_API_URL

const LS_RULES    = 'limits.rules'
const LS_RULES_AT = 'limits.rulesAt'
const LS_USED     = 'limits.used'

const RULES_TTL           = 60 * 60 * 1000  // 1 час
const USED_REFRESH_MIN_MS = 5 * 60 * 1000   // 5 минут
const TICK_MS             = 60 * 1000       // 1 минута

/** Канонический список типов лимитов. */
const TYPES = ['lecture_theme', 'lecture_general', 'charging', 'task']

const limits     = ref({})
const loadedDate = ref(null)

let lastUsedRefreshAt = 0
let inited            = false
let watcherStarted    = false
let _tickId           = null

// ── helpers ────────────────────────────────────────────────────

function canonicalKey(k) {
  if (!k) return null
  const lower = String(k).toLowerCase()
  return TYPES.includes(lower) ? lower : null
}

/**
 * Маппинг bucket лекции → тип награды.
 *   lecture-general   → lecture_general
 *   lecture-charging  → charging
 *   lecture-<themeId> → lecture_theme
 */
function bucketToRewardType(bucket) {
  if (!bucket) return null
  if (bucket === 'lecture-general')  return 'lecture_general'
  if (bucket === 'lecture-charging') return 'charging'
  if (String(bucket).startsWith('lecture-')) return 'lecture_theme'
  return null
}

/**
 * Восстановить bucket из dbKey вида `${bucket}:${date}:${id}`.
 * Нужно для старых элементов офлайн-очереди, где _rewardType не сохранён.
 */
function bucketFromDbKey(dbKey) {
  if (!dbKey) return null
  const m = String(dbKey).match(/^(lecture-[^:]+):/)
  return m ? m[1] : null
}

function ensureType(type) {
  if (!TYPES.includes(type)) return
  if (!limits.value[type]) limits.value[type] = { limit: 0, used: 0 }
}

function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function persist() {
  const used = {}
  for (const t of TYPES) { ensureType(t); used[t] = limits.value[t].used || 0 }
  writeLS(LS_USED, { date: loadedDate.value || localDate(), used })
}

function loadUsedFromLS() {
  const cached = readLS(LS_USED, null)
  const today = localDate()

  if (!cached || cached.date !== today) {
    for (const t of TYPES) { ensureType(t); limits.value[t].used = 0 }
    loadedDate.value = today
    return
  }
  loadedDate.value = cached.date
  for (const t of TYPES) {
    ensureType(t)
    limits.value[t].used = Number(cached.used?.[t]) || 0
  }
}

// ── rules (CDN) ───────────────────────────────────────────────

function loadRulesFromCache() {
  const cached = readLS(LS_RULES, null)
  if (!cached?.LIMITS) return
  for (const [k, v] of Object.entries(cached.LIMITS)) {
    const type = canonicalKey(k)
    if (!type) continue
    ensureType(type)
    limits.value[type].limit = Number(v?.limit) || 0
  }
}

async function fetchRules() {
  if (isOffline()) return false
  try {
    const res = await fetchWithTimeout(`${CDN}/config/limits_rules.json`, { cache: 'no-store' })
    if (!res.ok) return false
    const data = await res.json()
    if (!data?.LIMITS) return false

    for (const [k, v] of Object.entries(data.LIMITS)) {
      const type = canonicalKey(k)
      if (!type) continue
      ensureType(type)
      limits.value[type].limit = Number(v?.limit) || 0
    }
    writeLS(LS_RULES, data)
    try { localStorage.setItem(LS_RULES_AT, String(Date.now())) } catch {}
    return true
  } catch { return false }
}

async function loadRules({ force = false } = {}) {
  loadRulesFromCache()
  const at = Number(localStorage.getItem(LS_RULES_AT) || 0)
  if (!force && Date.now() - at < RULES_TTL) return true
  return fetchRules()
}

// ── внешние источники ─────────────────────────────────────────

function applyAuthLimits(limitsUsed) {
  if (!limitsUsed || typeof limitsUsed !== 'object') return
  const serverDate = limitsUsed.LOCAL_DATE || null

  if (serverDate && serverDate !== loadedDate.value) {
    for (const t of TYPES) { ensureType(t); limits.value[t].used = 0 }
    loadedDate.value = serverDate
  }
  for (const [k, v] of Object.entries(limitsUsed)) {
    if (k === 'LOCAL_DATE') continue
    const type = canonicalKey(k)
    if (!type) continue
    ensureType(type)
    limits.value[type].used = Number(v) || 0
  }
  persist()
}

function applyConfigLimits(data) {
  if (!data || typeof data !== 'object') return false

  if (data.LOCAL_DATE && data.LOCAL_DATE !== loadedDate.value) {
    for (const t of TYPES) { ensureType(t); limits.value[t].used = 0 }
    loadedDate.value = data.LOCAL_DATE
  }

  if (data.LIMITS && typeof data.LIMITS === 'object') {
    for (const [k, v] of Object.entries(data.LIMITS)) {
      const type = canonicalKey(k)
      if (!type) continue
      ensureType(type)
      if (v && typeof v === 'object') {
        if (v.limit != null) limits.value[type].limit = Number(v.limit) || 0
        if (v.used  != null) limits.value[type].used  = Number(v.used)  || 0
      }
    }
    persist()
    return true
  }

  if (data.USED && typeof data.USED === 'object') {
    for (const [k, v] of Object.entries(data.USED)) {
      const type = canonicalKey(k)
      if (!type) continue
      ensureType(type)
      limits.value[type].used = Number(v) || 0
    }
    persist()
    return true
  }

  return false
}

// ── запись действий ──────────────────────────────────────────

function recordReward(type, points) {
  const pts = Number(points) || 0
  if (pts <= 0) return
  const t = canonicalKey(type)
  if (!t) return
  ensureType(t)
  limits.value[t].used = (limits.value[t].used || 0) + 1
  persist()
}

function recordLimitReached(type, info) {
  const t = canonicalKey(type)
  if (!t) return
  ensureType(t)
  const limit = Number(info?.limit) || limits.value[t].limit || 0
  const count = Number(info?.count) || 0
  limits.value[t].used = Math.max(limit, count, limits.value[t].used || 0)
  persist()
}

/**
 * Универсальный разбор ответа сервера с информацией о награде.
 * Учитывает REWARD_TYPE (если есть), иначе fallbackType.
 * Возвращает нормализованный объект для возврата из markRead/complete.
 *
 * @param {object} res — ответ сервера
 * @param {string} fallbackType — bucketToRewardType(bucket) или 'task'
 * @returns {{ rewardPoints:number, limitReached:boolean, limitInfo:object|null, rewardType:string|null }}
 */
function handleRewardResponse(res, fallbackType) {
  const rewardType =
    canonicalKey(res?.REWARD_TYPE) ||
    canonicalKey(fallbackType) ||
    null
  const points       = Number(res?.REWARD_POINTS) || 0
  const limitReached = res?.REWARD_LIMIT_REACHED === true
  const limitInfo    = res?.REWARD_LIMIT_INFO || null

  if (points > 0 && rewardType)    recordReward(rewardType, points)
  if (limitReached && rewardType)  recordLimitReached(rewardType, limitInfo)

  return { rewardPoints: points, limitReached, limitInfo, rewardType }
}

// ── getters ──────────────────────────────────────────────────

function isLimitReached(type) {
  const t = canonicalKey(type)
  if (!t) return false
  ensureType(t)
  const { limit, used } = limits.value[t]
  if (!limit || limit <= 0) return false
  return (used || 0) >= limit
}

function getLimit(type) {
  const t = canonicalKey(type)
  if (!t) return { limit: 0, used: 0, reached: false, remaining: null }
  ensureType(t)
  const { limit, used } = limits.value[t]
  const reached = limit > 0 && (used || 0) >= limit
  return {
    limit: limit || 0,
    used:  used  || 0,
    reached,
    remaining: limit > 0 ? Math.max(0, limit - (used || 0)) : null,
  }
}

// ── фоновое обновление ───────────────────────────────────────

async function refreshUsed({ force = false } = {}) {
  if (isOffline()) return false
  const now = Date.now()
  if (!force && now - lastUsedRefreshAt < USED_REFRESH_MIN_MS) return false
  lastUsedRefreshAt = now

  try {
    const { useAuthStore } = await import('../auth/store')
    const auth = useAuthStore()
    if (!auth?.idUser) return false

    const res = await fetchWithTimeout(`${API}/config/limits`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID_USER: auth.idUser,
        LOCAL_DATETIME: localDateTime(),
      }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (!isSuccess(data)) return false
    return applyConfigLimits(data)
  } catch { return false }
}

// ── суточный ролловер ────────────────────────────────────────

function ensureToday() {
  const today = localDate()
  if (loadedDate.value === today) return false
  for (const t of TYPES) { ensureType(t); limits.value[t].used = 0 }
  loadedDate.value = today
  persist()
  return true
}

// ── lifecycle ────────────────────────────────────────────────

function init() {
  if (inited) return
  inited = true
  loadUsedFromLS()
  if (!loadedDate.value) loadedDate.value = localDate()
  loadRules().catch(() => {})
}

function startDayWatcher() {
  if (watcherStarted) return
  watcherStarted = true

  _tickId = setInterval(() => {
    if (ensureToday()) refreshUsed({ force: true }).catch(() => {})
  }, TICK_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (ensureToday()) refreshUsed({ force: true }).catch(() => {})
    else refreshUsed().catch(() => {})
  })
}

const asMap = computed(() => {
  const out = {}
  for (const t of TYPES) out[t] = getLimit(t)
  return out
})

// ── публичный API ────────────────────────────────────────────

export function useLimits() {
  init()
  return {
    limits,
    loadedDate,
    TYPES,
    asMap,

    loadRules,
    refreshUsed,
    ensureToday,
    startDayWatcher,
    applyAuthLimits,
    applyConfigLimits,
    recordReward,
    recordLimitReached,
    handleRewardResponse,

    getLimit,
    isLimitReached,
    bucketToRewardType,
  }
}

// Экспорт хелперов для использования вне компонентов (например, в flushQueue).
export { handleRewardResponse, bucketToRewardType, bucketFromDbKey }