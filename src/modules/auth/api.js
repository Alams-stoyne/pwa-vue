const AUTH_URL = import.meta.env.VITE_AUTH_URL

/**
 * Регистрация по uid, привязанному к устройству.
 * Ответ сервера:
 *   { RESULT: 'OK', ID_USER }
 *   { RESULT: 'UID_LOCKED', LOCKED_UID, ID_USER } — если device_id уже привязан к другому uid
 */
export async function registerRequest({ uid, deviceId }) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UID: uid, DEVICE_ID: deviceId }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}