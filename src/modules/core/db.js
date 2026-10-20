const DB_NAME = 'pwa-app'
const DB_VERSION = 2

let dbPromise

export function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const d = req.result
        if (!d.objectStoreNames.contains('photos'))   d.createObjectStore('photos')
        if (!d.objectStoreNames.contains('lectures')) d.createObjectStore('lectures')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

export async function store(name, mode) {
  const d = await db()
  return d.transaction(name, mode).objectStore(name)
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