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