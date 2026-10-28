import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL

// --- Авторизованные пользователи ---
export async function sendSupportTicket({ ID_USER, SUBJECT, TEXT, IMAGES }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/create`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER: ID_USER || null, SUBJECT, TEXT, IMAGES }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function sendSupportMessage({ ID_USER, TICKET_ID, TEXT, IMAGES }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, TICKET_ID, TEXT, IMAGES }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function fetchSupportTickets({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/list`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function fetchSupportTicket({ ID_USER, TICKET_ID }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/get`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, TICKET_ID }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

// --- Гостевые обращения (неавторизованные) ---

export async function createGuestTicket({ DEVICE_ID, TEXT, UID, AUTH_ERROR, SUBJECT, IMAGES, META }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/create_guest`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DEVICE_ID, TEXT, UID, AUTH_ERROR, SUBJECT, IMAGES, META }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function fetchGuestTicket({ DEVICE_ID, TICKET_ID }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/guest_get`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DEVICE_ID, TICKET_ID }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

export async function sendGuestMessage({ DEVICE_ID, TICKET_ID, TEXT, IMAGES }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/guest_message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DEVICE_ID, TICKET_ID, TEXT, IMAGES }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}

// --- Запрос на сброс привязки UID ↔ DEVICE_ID ---
//
// Контракт (согласован с бэком):
//   POST /support/ticket/create_reset_uid
//   Request:  { DEVICE_ID, UID, RESET_REASONS[], TEXT, IMAGES[], META }
//   Success:  { RESULT: 'OK', TICKET_ID, RESET_STATUS, ESTIMATED_WAIT_MINUTES }
//   Errors:
//     400 ERROR                — нет DEVICE_ID/UID, UID не hex40
//     400 RESET_NOT_APPLICABLE — пары UID↔DEVICE_ID нет в БД
//     400 UID_BLOCKED          — UID заблокирован
//     429 WAIT_BEFORE_RESET    — UID активен; RETRY_AFTER_SEC в теле
//     429 RATE_LIMITED         — > 1 reset-запроса в час с DEVICE_ID
//
// ВАЖНО: здесь мы НЕ бросаем на !res.ok — тело читается всегда,
// чтобы поймать RESULT/REASON/RETRY_AFTER_SEC для отображения
// пользователю. Сетевые/таймаутные ошибки пробрасываются из
// fetchWithTimeout.
export async function createResetUidTicket({ DEVICE_ID, UID, RESET_REASONS, TEXT, IMAGES, META }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support/ticket/create_reset_uid`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ DEVICE_ID, UID, RESET_REASONS, TEXT, IMAGES, META }),
  })

  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}