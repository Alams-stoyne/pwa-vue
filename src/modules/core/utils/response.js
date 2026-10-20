export function isSuccess(json) {
  if (!json) return false
  const r = json.RESULT
  return r === 'OK' || r === 'SUCCESS' || r === true || r === 1 || r === '1'
}