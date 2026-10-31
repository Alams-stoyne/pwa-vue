const DB_NAME = 'pwa-app'
const DB_VERSION = 2

let dbPromise = null

/**
 * Открыть соединение с IDB.
 *
 * ВАЖНО (iOS PWA): Safari закрывает IDB-соединение в любой момент —
 * при уходе в фон, memory pressure, переключении между приложениями.
 * Если это произойдёт, а мы держим старый dbPromise — ВСЕ последующие
 * transaction() упадут с «The database connection is closing».
 *
 * Поэтому:
 *   • onclose / onversionchange — помечаем соединение __closed и
 *     сбрасываем dbPromise в null;
 *   • db() — при __closed пересоздаёт соединение;
 *   • store() — при InvalidStateError (гонка между db() и transaction())
 *     пересоздаёт и пробует ещё раз.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    let req
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (e) {
      reject(e)
      return
    }

    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('photos'))   d.createObjectStore('photos')
      if (!d.objectStoreNames.contains('lectures')) d.createObjectStore('lectures')
    }

    req.onsuccess = () => {
      const d = req.result

      // Браузер закрыл соединение (iOS background / memory pressure)
      d.onclose = () => {
        console.warn('[db] connection closed by browser')
        d.__closed = true
        dbPromise = null
      }

      // Другой таб делает upgrade — отпускаем соединение, чтобы он не был
      // заблокирован. После этого следующий вызов db() пересоздаст.
      d.onversionchange = () => {
        console.warn('[db] versionchange — releasing connection')
        d.__closed = true
        dbPromise = null
        try { d.close() } catch {}
      }

      resolve(d)
    }

    req.onerror = () => {
      // Сбрасываем — следующий вызов попробует открыть заново
      dbPromise = null
      reject(req.error)
    }

    req.onblocked = () => {
      // Другой таб держит соединение и не даёт открыть. Не блокируемся
      // навсегда — просто логируем, onsuccess придёт, когда освободится.
      console.warn('[db] open blocked by another tab')
    }
  })
}

export function db() {
  if (!dbPromise) {
    dbPromise = openDB()
  }
  return dbPromise.then((d) => {
    // Соединение закрылось между resolve и использованием — пересоздаём.
    if (d.__closed) {
      dbPromise = null
      return db()
    }
    return d
  })
}

function isClosingError(e) {
  if (!e) return false
  if (e.name === 'InvalidStateError') return true
  return /connection is closing/i.test(String(e.message || ''))
}

export async function store(name, mode) {
  let d = await db()
  try {
    return d.transaction(name, mode).objectStore(name)
  } catch (e) {
    // Гонка: db() вернул открытое соединение, а transaction() уже
    // упал — браузер закрыл между двумя микротасками. Пересоздаём
    // и пробуем ещё раз. Если и второй упадёт — пробросим наверх.
    if (!isClosingError(e)) throw e
    console.warn('[db] transaction failed due to closing connection — reopening')
    dbPromise = null
    d = await db()
    return d.transaction(name, mode).objectStore(name)
  }
}

export function idbPut(storeName, key, value) {
  return store(storeName, 'readwrite').then(
    (s) => new Promise((res, rej) => {
      const r = s.put(value, key)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
  )
}

export function idbGet(storeName, key) {
  return store(storeName, 'readonly').then(
    (s) => new Promise((res, rej) => {
      const r = s.get(key)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
  )
}

export function idbAll(storeName) {
  return store(storeName, 'readonly').then(
    (s) => new Promise((res, rej) => {
      const r = s.getAll()
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
  )
}

/** Список всех ключей в хранилище — нужен для проверки missing photos. */
export function idbAllKeys(storeName) {
  return store(storeName, 'readonly').then(
    (s) => new Promise((res, rej) => {
      const r = s.getAllKeys()
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
  )
}

/**
 * Удаление записи по ключу.
 * Используется для очистки лекций и фото, которых больше нет на сервере.
 */
export function idbDelete(storeName, key) {
  return store(storeName, 'readwrite').then(
    (s) => new Promise((res, rej) => {
      const r = s.delete(key)
      r.onsuccess = () => res()
      r.onerror = () => rej(r.error)
    })
  )
}