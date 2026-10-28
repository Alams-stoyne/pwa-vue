import { ref, computed } from 'vue'
import { getOrCreateDeviceId } from './deviceId'
import { track } from '../analytics'
import { EVT } from '../analytics/events'

const isInstalled = ref(false)
const deferredPrompt = ref(null)
let inited = false
let installAcceptedTracked = false
// Флаг: init() РЕАЛЬНО создал deviceId (был пустой localStorage).
// Нужен, чтобы readDeviceId() сохранил markDeviceRotated() для свежих установок,
// но НЕ триггерил его у возвращающихся пользователей.
let _deviceIdJustCreated = false

/**
 * Возвращает true ОДИН РАЗ, если init() только что создал deviceId.
 * После вызова флаг сбрасывается — предотвращает повторный markDeviceRotated()
 * при последующих readDeviceId() в той же сессии.
 */
export function consumeDeviceIdJustCreated() {
  const v = _deviceIdJustCreated
  _deviceIdJustCreated = false
  return v
}

// ── localStorage-флаги (по deviceId) ──────────────────────────
function getDeviceIdSafe() {
  try { return localStorage.getItem('app.device_id') || '' } catch { return '' }
}
function keyGateViewed() {
  const d = getDeviceIdSafe()
  return d ? `x5pwa:install_gate_viewed:${d}` : 'x5pwa:install_gate_viewed:anon'
}
function keyInstallAccepted() {
  const d = getDeviceIdSafe()
  return d ? `x5pwa:install_accepted:${d}` : 'x5pwa:install_accepted:anon'
}
function wasGateViewed() {
  try { return localStorage.getItem(keyGateViewed()) === '1' } catch { return false }
}
function wasAcceptedTracked() {
  try { return localStorage.getItem(keyInstallAccepted()) === '1' } catch { return false }
}
function markGateViewed() {
  try { localStorage.setItem(keyGateViewed(), '1') } catch {}
}
function markAcceptedTracked() {
  try { localStorage.setItem(keyInstallAccepted(), '1') } catch {}
}
// ─────────────────────────────────────────────────────────────

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function getEnvProps() {
  let ua = ''
  let vp = ''
  try { ua = String(navigator.userAgent || '').slice(0, 190) } catch {}
  try { vp = `${Math.round(window.innerWidth)}x${Math.round(window.innerHeight)}` } catch {}
  return { userAgent: ua, viewport: vp }
}

function sendInstallAccepted(via, extra = {}) {
  if (installAcceptedTracked || wasAcceptedTracked()) return
  installAcceptedTracked = true
  markAcceptedTracked()
  track(EVT.INSTALL_ACCEPTED, {
    platform: detectPlatform(),
    via,
    ...getEnvProps(),
    ...extra,
  })
}

function detect() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = window.navigator.standalone === true
  const navStandalone = window.navigation?.standalone === true
  isInstalled.value = standalone || iosStandalone || navStandalone
}

function init() {
  if (inited) return
  inited = true

  // КРИТИЧНО: создаём deviceId ДО чтения/записи флагов.
  // Но запоминаем — был ли ID до init, чтобы readDeviceId() корректно
  // отличил «свежую установку» от «возвращающегося пользователя».
  let hadBefore = false
  try { hadBefore = !!localStorage.getItem('app.device_id') } catch {}
  getOrCreateDeviceId()
  if (!hadBefore) _deviceIdJustCreated = true

  detect()

  if (isInstalled.value && wasGateViewed() && !wasAcceptedTracked()) {
    sendInstallAccepted('detected', { isStandalone: true })
  }

  const mq = window.matchMedia('(display-mode: standalone)')
  mq.addEventListener?.('change', detect)

  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
    sendInstallAccepted('appinstalled', { isStandalone: true })
  })

  document.addEventListener('visibilitychange', detect)
  window.addEventListener('pageshow', detect)
  window.addEventListener('focus', detect)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    track(EVT.INSTALL_PROMPT_SHOWN, {
      platform: detectPlatform(),
      ...getEnvProps(),
    })
  })

  let tries = 0
  const recheck = () => {
    detect()
    if (!isInstalled.value && tries++ < 6) {
      requestAnimationFrame(recheck)
    }
  }
  requestAnimationFrame(recheck)
}

export function useInstall() {
  init()

  function refresh() {
    detect()
    return isInstalled.value
  }

  async function promptInstall() {
    const e = deferredPrompt.value
    if (!e) return false
    e.prompt()
    const res = await e.userChoice
    deferredPrompt.value = null
    const accepted = res?.outcome === 'accepted'
    if (accepted) {
      sendInstallAccepted('prompt')
    } else {
      track(EVT.INSTALL_REJECTED, {
        platform: detectPlatform(),
        ...getEnvProps(),
      })
    }
    return accepted
  }

  function trackGateViewed(props = {}) {
    markGateViewed()
    track(EVT.INSTALL_GATE_VIEWED, {
      platform: detectPlatform(),
      ...getEnvProps(),
      ...props,
    })
  }

  return {
    isInstalled: computed(() => isInstalled.value),
    hasPrompt: computed(() => !!deferredPrompt.value),
    promptInstall,
    refresh,
    trackGateViewed,
  }
}