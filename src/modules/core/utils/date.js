const pad = (n) => String(n).padStart(2, '0')

/**
 * Локальная дата в формате YYYY-MM-DD.
 * @param {Date} [d=new Date()]
 */
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Локальная дата-время в формате "YYYY-MM-DD HH:MM:SS".
 * Формат не меняем — на нём завязаны серверные эндпоинты (/lecture/read, /task/complete,
 * /habit/complete, /stats/personal, /today и т.д.).
 */
export function localDateTime(d = new Date()) {
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * Смещение локального времени от UTC в минутах.
 * Восточнее Гринвича — положительное (МСК → +180).
 *
 * В JS getTimezoneOffset() возвращает обратный знак
 * (МСК → -180), поэтому инвертируем.
 *
 * Используется как TZ_OFFSET_MIN при запросах к серверу
 * (/auth, /lecture/read, /task/complete, /habit/complete, /stats/personal).
 *
 * @param {Date} [d=new Date()]
 * @returns {number} например 180 для Europe/Moscow
 */
export function tzOffsetMin(d = new Date()) {
  return -d.getTimezoneOffset()
}

/**
 * Локальное дата-время в ISO 8601 с явным offset:
 *   "2026-10-25T12:00:00+03:00"
 *
 * Пригодится, если сервер/CDN начнёт принимать ISO-даты вместо
 * "YYYY-MM-DD HH:MM:SS". Сейчас не используется, но оставляем —
 * полезно для диагностики и логов.
 *
 * @param {Date} [d=new Date()]
 */
export function localIso(d = new Date()) {
  const offset = tzOffsetMin(d)
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hh = pad(Math.floor(abs / 60))
  const mm = pad(abs % 60)
  return `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mm}`
}