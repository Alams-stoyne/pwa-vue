export function isSuccess(json) {
  if (!json) return false
  const r = json.RESULT
  return r === 'OK' || r === 'SUCCESS' || r === true || r === 1 || r === '1'
}

/**
 * Сервер ответил RESULT: 'BLOCKED' — доступ приостановлен администратором.
 * Обработчик: auth.setBlocked(MESSAGE) → показать BlockedView.
 */
export function isBlocked(json) {
  return json?.RESULT === 'BLOCKED'
}