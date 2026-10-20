export class OfflineError extends Error {
  constructor() { super('OFFLINE'); this.name = 'OfflineError'; this.code = 'OFFLINE' }
}
export class TimeoutError extends Error {
  constructor() { super('TIMEOUT'); this.name = 'TimeoutError'; this.code = 'TIMEOUT' }
}

export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export async function fetchWithTimeout(input, { timeout = 8000, ...init } = {}) {
  if (isOffline()) throw new OfflineError()

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)

  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal })
    return res
  } catch (e) {
    if (e.name === 'AbortError') throw new TimeoutError()
    if (e instanceof TypeError) throw new OfflineError()
    throw e
  } finally {
    clearTimeout(t)
  }
}