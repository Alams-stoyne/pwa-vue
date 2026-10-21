import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL 

export async function fetchConsentStatus({ ID_USER }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/consent/status`, {
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

export async function saveConsent({ ID_USER, GRANTED, LOCAL_DATETIME }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/consent/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, GRANTED, LOCAL_DATETIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}