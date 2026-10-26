// src/core/period.js
import { ref, computed } from 'vue'
import { fetchWithTimeout, isOffline } from './utils/network'

const CDN = import.meta.env.VITE_CDN_URL
const LS_PERIOD = 'period.cache'
const LS_PERIOD_AT = 'period.cacheAt'
const TTL = 60 * 60 * 1000 // 1 час

const start = ref(null) // 'YYYY-MM-DD'
const end = ref(null)   // 'YYYY-MM-DD'
let loaded = false
let inFlight = null

function loadFromCache() {
  try {
    const raw = localStorage.getItem(LS_PERIOD)
    if (!raw) return false
    const data = JSON.parse(raw)
    if (data?.START && data?.END) {
      start.value = data.START
      end.value = data.END
      return true
    }
  } catch {}
  return false
}

async function fetchPeriod({ force = false } = {}) {
  if (isOffline()) return false
  if (inFlight) return inFlight

  const cachedAt = Number(localStorage.getItem(LS_PERIOD_AT) || 0)
  if (!force && Date.now() - cachedAt < TTL) return true

  inFlight = (async () => {
    try {
      const res = await fetchWithTimeout(`${CDN}/config/period.json`, { cache: 'no-store' })
      if (!res.ok) return false
      const data = await res.json()
      if (data?.START && data?.END) {
        start.value = data.START
        end.value = data.END
        localStorage.setItem(LS_PERIOD, JSON.stringify(data))
        localStorage.setItem(LS_PERIOD_AT, String(Date.now()))
        return true
      }
    } catch {}
    return false
  })()

  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}

export function usePeriod() {
  if (!loaded) {
    loaded = true
    loadFromCache()
    fetchPeriod().catch(() => {})
  }

  function isInPeriod(dateIso) {
    if (!start.value || !end.value || !dateIso) return false
    return dateIso >= start.value && dateIso <= end.value
  }

  function isBeforePeriod(dateIso) {
    if (!start.value || !dateIso) return false
    return dateIso < start.value
  }

  function isAfterPeriod(dateIso) {
    if (!end.value || !dateIso) return false
    return dateIso > end.value
  }

  const range = computed(() => {
    if (!start.value || !end.value) return null
    return { from: start.value, to: end.value }
  })

  return {
    start: computed(() => start.value),
    end: computed(() => end.value),
    range,
    isInPeriod,
    isBeforePeriod,
    isAfterPeriod,
    refresh: () => fetchPeriod({ force: true }),
  }
}