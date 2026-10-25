import { tzOffsetMin } from '../core/utils/date'

const AUTH_URL = import.meta.env.VITE_AUTH_URL

export async function registerRequest({ uid, deviceId }) {
  console.log('[auth api] Preparing request. AUTH_URL =', AUTH_URL)

  if (!AUTH_URL) {
    throw new Error('VITE_AUTH_URL не задан в .env')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    console.log('[auth api] Sending fetch to', AUTH_URL)
    const res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        UID: uid,
        DEVICE_ID: deviceId,
        // Сервер определяет LOCAL_DATE по этому смещению.
        // МСК → +180, Новосибирск → +420 и т.д.
        TZ_OFFSET_MIN: tzOffsetMin(),
      }),
      signal: controller.signal,
    })
    console.log('[auth api] Response status:', res.status)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Таймаут соединения с сервером (15 сек)')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}