const API = import.meta.env.VITE_API_URL

export async function sendProfile({
  ID_USER, FIO, NICKNAME, WORKPLACE, LOCAL_DATETIME,
}) {
  const res = await fetch(`${API}/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ID_USER, FIO, NICKNAME, WORKPLACE, LOCAL_DATETIME }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}