/**
 * Обёртка над Notification API.
 *
 * Работает, пока приложение открыто: при наступлении времени
 * следующей активации — показывает уведомление.
 * Для background-уведомлений нужен Web Push + сервер, вне рамок MVP.
 */

const timers = new Map()   // habitId → timeoutId

export async function ensurePermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

export function hasPermission() {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Запланировать уведомление.
 * @param {string} habitId
 * @param {string} title
 * @param {string} body
 * @param {number} delayMs — через сколько миллисекунд показать
 * @param {Function} onClick — что сделать при клике
 */
export function schedule(habitId, title, body, delayMs, onClick) {
  cancel(habitId)

  if (!hasPermission()) return
  if (delayMs <= 0) return
  if (delayMs > 24 * 60 * 60 * 1000) return   // не более суток вперёд

  const id = setTimeout(() => {
    try {
      const n = new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `habit-${habitId}`,
        renotify: true,
      })
      n.onclick = () => {
        window.focus()
        if (typeof onClick === 'function') onClick()
        n.close()
      }
    } catch { /* некоторые браузеры требуют SW-путь */ }
    timers.delete(habitId)
  }, delayMs)

  timers.set(habitId, id)
}

export function cancel(habitId) {
  const t = timers.get(habitId)
  if (t) {
    clearTimeout(t)
    timers.delete(habitId)
  }
}

export function cancelAll() {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}