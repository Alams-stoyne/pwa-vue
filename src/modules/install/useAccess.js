import { ref, computed } from 'vue'
import { useInstall, consumeDeviceIdJustCreated } from './useInstall'
import {
  getOrCreateDeviceId,
  getDeviceIdCreatedAt,
  getDeviceRotatedAt,
  markDeviceRotated,
} from './deviceId'

const LS_UID = 'auth.uid'
const LS_UID_BOUND = 'auth.uid_bound'
const COOKIE_UID = 'auth_uid'

function readCookie(name) {
  if (typeof document === 'undefined') return ''
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
    return m ? decodeURIComponent(m[1]) : ''
  } catch { return '' }
}

function writeCookie(name, value, days = 365) {
  if (typeof document === 'undefined') return
  try {
    const maxAge = days * 24 * 60 * 60
    document.cookie =
      `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`
  } catch {}
}

function persistUid(uid) {
  if (!uid) return
  try { localStorage.setItem(LS_UID, uid) } catch {}
  try { localStorage.setItem(LS_UID_BOUND, uid) } catch {}
  writeCookie(COOKIE_UID, uid)
}

function readUidFromUrl() {
  if (typeof window === 'undefined') return ''
  try {
    return new URL(window.location.href).searchParams.get('uid') || ''
  } catch { return '' }
}

function readBoundFromStorage() {
  try {
    const ls = localStorage.getItem(LS_UID_BOUND)
    if (ls) return ls
  } catch {}
  const c = readCookie(COOKIE_UID)
  if (c) return c
  return ''
}

function evaluate() {
  const fromUrl = readUidFromUrl()
  const bound = readBoundFromStorage()

  if (fromUrl && bound && fromUrl !== bound) {
    return {
      granted: false,
      reason: 'uid-mismatch',
      uid: fromUrl,
      boundUid: bound,
    }
  }

  if (fromUrl) {
    persistUid(fromUrl)
    return {
      granted: true,
      reason: bound ? 'matches' : 'first-time',
      uid: fromUrl,
      boundUid: bound || fromUrl,
    }
  }

  if (bound) {
    return {
      granted: true,
      reason: 'bound',
      uid: bound,
      boundUid: bound,
    }
  }

  return { granted: false, reason: 'no-uid', uid: '', boundUid: '' }
}

const _state = ref(evaluate())

export function readUid() {
  return _state.value.uid || ''
}

export function readBoundUid() {
  return readBoundFromStorage()
}

export function readDeviceId() {
  let hadBefore = false
  try { hadBefore = !!localStorage.getItem('app.device_id') } catch {}
  const id = getOrCreateDeviceId()

  // treatAsFirst = true, когда:
  //   • hadBefore = false — ID создан прямо сейчас (оригинальное поведение)
  //   • consumeDeviceIdJustCreated() = true — init() создал ID в этой сессии
  //     (свежая установка). Флаг сбрасывается после первого readDeviceId(),
  //     чтобы последующие вызовы в этой же сессии не триггерили rotation.
  //
  // Для ВОЗВРАЩАЮЩЕГОСЯ пользователя: hadBefore = true, флаг init = false →
  // markDeviceRotated() НЕ вызывается. Это правильно: rotation — сигнал
  // «устройство выглядит свежим», а не «пользователь открыл приложение».
  const justCreated = consumeDeviceIdJustCreated()
  const treatAsFirst = !hadBefore || justCreated

  if (treatAsFirst) {
    const created = getDeviceIdCreatedAt()
    if (created > 0) {
      markDeviceRotated()
    }
  }
  return id
}

export function readDeviceIdCreatedAt() {
  return getDeviceIdCreatedAt()
}

export function readDeviceRotatedAt() {
  return getDeviceRotatedAt()
}

export function setUidManually(rawUid) {
  const uid = String(rawUid || '').trim()
  if (!uid) return false

  const bound = readBoundFromStorage()
  if (bound && bound !== uid) return false

  persistUid(uid)
  _state.value = {
    granted: true,
    reason: bound ? 'matches' : 'first-time',
    uid,
    boundUid: uid,
  }
  return true
}

export function refreshFromUrl() {
  const fromUrl = readUidFromUrl()
  if (!fromUrl) return false

  const bound = readBoundFromStorage()
  if (bound && bound !== fromUrl) return false

  persistUid(fromUrl)
  _state.value = {
    granted: true,
    reason: bound ? 'matches' : 'first-time',
    uid: fromUrl,
    boundUid: bound || fromUrl,
  }
  return true
}

export function useAccess() {
  const { isInstalled } = useInstall()

  if (!_state.value.uid) refreshFromUrl()

  return {
    isGranted: computed(() => isInstalled.value || _state.value.granted),
    hasUidInUrl: computed(() => !!readUidFromUrl()),
    hasUid: computed(() => !!_state.value.uid),
    hasBoundUid: computed(() => !!readBoundFromStorage()),
    uidMismatch: computed(() => _state.value.reason === 'uid-mismatch'),
    uidReason: computed(() => _state.value.reason),
    uidFromUrl: computed(() => readUidFromUrl()),
    uidBound: computed(() => _state.value.boundUid || readBoundFromStorage()),
  }
}