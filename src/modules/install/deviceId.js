const LS_DEVICE = 'app.device_id'
const LS_DEVICE_CREATED = 'app.device_id_created'
const LS_DEVICE_ROTATED = 'app.device_id_rotated'

/** Разовый UUID на это устройство + браузер + профиль. */
export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(LS_DEVICE)
    if (!id) {
      id = (crypto.randomUUID?.() || fallbackUuid())
      localStorage.setItem(LS_DEVICE, id)
      // Момент первого создания — по нему сервер сможет отличать
      // «устройство с историей» от «устройство только что завелось».
      localStorage.setItem(LS_DEVICE_CREATED, String(Date.now()))
    }
    return id
  } catch {
    return fallbackUuid()
  }
}

/**
 * Когда deviceId был создан впервые.
 * Возвращает timestamp в миллисекундах либо 0, если данных нет.
 */
export function getDeviceIdCreatedAt() {
  try {
    const v = Number(localStorage.getItem(LS_DEVICE_CREATED))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

/**
 * Отметить, что deviceId был «пересоздан» — например, пользователь
 * очистил хранилище и приложение сгенерировало новый ID.
 * Сервер использует это как сигнал повышенного риска:
 * uid уже привязан к другому deviceId, а устройство выглядит свежим.
 */
export function markDeviceRotated() {
  try {
    localStorage.setItem(LS_DEVICE_ROTATED, String(Date.now()))
  } catch {}
}

/**
 * Когда deviceId последний раз пересоздавался.
 * Возвращает timestamp в миллисекундах либо 0, если ротации не было.
 */
export function getDeviceRotatedAt() {
  try {
    const v = Number(localStorage.getItem(LS_DEVICE_ROTATED))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

function fallbackUuid() {
  // RFC4122 v4 на случай отсутствия crypto.randomUUID
  const r = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  return (
    `${r()}${r()}${r()}${r()}-${r()}${r()}-4${r().slice(1)}-` +
    `${((Math.random() * 4) | 8).toString(16)}${r().slice(1)}-${r()}${r()}${r()}${r()}${r()}${r()}`
  )
}