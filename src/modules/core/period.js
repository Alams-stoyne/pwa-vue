import { ref, computed } from 'vue'
import { localDate } from './utils/date'
import { fetchWithTimeout, isOffline } from './utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const LS_PERIOD = 'period.cache'
const LS_PERIOD_AT = 'period.cacheAt'

// 15 минут: компромисс между свежестью и нагрузкой на CDN.
// Плюс отдельная проверка смены суток — сработает даже раньше TTL.
const TTL = 15 * 60 * 1000

// START/END — эффективный период (обрезан до сегодня).
// PLANNED_START/PLANNED_END — полный период марафона.
const start = ref(null)
const end = ref(null)
const plannedStart = ref(null)
const plannedEnd = ref(null)

let loaded = false
let inFlight = null
let readyResolve = null
let readyPromise = null
let fetchedForDate = null

function makeReadyPromise() {
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => { readyResolve = resolve })
  }
  return readyPromise
}

function markReady() {
  if (readyResolve) {
    readyResolve()
    readyResolve = null
  }
}

function applyPeriodData(data, forDate) {
  if (!data) return false
  // Эффективный период — для арки прогресса
  if (data.START && data.END) {
    start.value = data.START
    end.value = data.END
  }
  // Плановый период — для фильтрации материалов
  // (fallback: если сервер ещё не отдаёт PLANNED_*, берём START/END)
  plannedStart.value = data.PLANNED_START || data.START || null
  plannedEnd.value   = data.PLANNED_END   || data.END   || null

  if (plannedStart.value && plannedEnd.value) {
    fetchedForDate = forDate || localDate()
    return true
  }
  return false
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(LS_PERIOD)
    if (!raw) return false
    const data = JSON.parse(raw)
    return applyPeriodData(data, data.__fetchedFor || localDate())
  } catch { return false }
}

async function fetchPeriod({ force = false } = {}) {
  if (isOffline()) { markReady(); return false }
  if (inFlight) return inFlight

  const today = localDate()
  const cachedAt = Number(localStorage.getItem(LS_PERIOD_AT) || 0)
  const cacheFresh = Date.now() - cachedAt < TTL
  const sameDay = fetchedForDate === today
  const havePeriod = plannedStart.value && plannedEnd.value

  if (!force && cacheFresh && sameDay && havePeriod) {
    markReady()
    return true
  }

  inFlight = (async () => {
    try {
      // ?v= — обход HTTP/CDN-кеша при смене суток
      const url = `${CDN}/config/period.json?v=${Date.now()}`
      const res = await fetchWithTimeout(url, { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      if (applyPeriodData(data, today)) {
        try {
          localStorage.setItem(
            LS_PERIOD,
            JSON.stringify({ ...data, __fetchedFor: today }),
          )
          localStorage.setItem(LS_PERIOD_AT, String(Date.now()))
        } catch {}
        return true
      }
    } catch {}
    return false
  })()

  try {
    return await inFlight
  } finally {
    inFlight = null
    markReady()
  }
}

export function usePeriod() {
  if (!loaded) {
    loaded = true
    makeReadyPromise()
    loadFromCache()

    const today = localDate()
    if (plannedStart.value && plannedEnd.value && fetchedForDate === today) {
      markReady()
    }

    fetchPeriod().catch(() => { markReady() })
  }

  /**
   * Фильтрация материалов — по ПЛАНОВОМУ периоду (PLANNED_*).
   * Это гарантирует, что весь марафон (26.10–02.11) доступен,
   * даже если эффективный END ещё не обновился на сервере.
   *
   * Fail-open: если период ещё не загружен — не блокируем.
   */
  function isInPeriod(dateIso) {
    if (!plannedStart.value || !plannedEnd.value || !dateIso) return true
    return dateIso >= plannedStart.value && dateIso <= plannedEnd.value
  }

  /**
   * Фильтрация для арки прогресса — по ЭФФЕКТИВНОМУ периоду (START/END).
   * Здесь как раз нужно «сколько прошло / сколько подтверждено».
   */
  function isInEffectivePeriod(dateIso) {
    if (!start.value || !end.value || !dateIso) return true
    return dateIso >= start.value && dateIso <= end.value
  }

  function isBeforePeriod(dateIso) {
    if (!plannedStart.value || !dateIso) return false
    return dateIso < plannedStart.value
  }

  function isAfterPeriod(dateIso) {
    if (!plannedEnd.value || !dateIso) return false
    return dateIso > plannedEnd.value
  }

  const range = computed(() => {
    if (!plannedStart.value || !plannedEnd.value) return null
    return { from: plannedStart.value, to: plannedEnd.value }
  })

  const effectiveRange = computed(() => {
    if (!start.value || !end.value) return null
    return { from: start.value, to: end.value }
  })

  return {
    start: computed(() => start.value),
    end: computed(() => end.value),
    plannedStart: computed(() => plannedStart.value),
    plannedEnd: computed(() => plannedEnd.value),
    range,          // PLANNED_* — для материалов
    effectiveRange, // START/END — для арки
    isInPeriod,     // по PLANNED_*
    isInEffectivePeriod, // по START/END
    isBeforePeriod,
    isAfterPeriod,
    whenReady: () => makeReadyPromise(),
    refresh: () => fetchPeriod({ force: true }),
  }
}