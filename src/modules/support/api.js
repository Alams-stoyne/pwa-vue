import { fetchWithTimeout, isOffline, OfflineError } from '../core/utils/network'

const API = import.meta.env.VITE_API_URL

export async function sendSupportTicket({ ID_USER, TEXT, IMAGES, CONSENT }) {
  if (isOffline()) throw new OfflineError()

  const res = await fetchWithTimeout(`${API}/support`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, TEXT, IMAGES, CONSENT }),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error('Некорректный ответ сервера') }
}