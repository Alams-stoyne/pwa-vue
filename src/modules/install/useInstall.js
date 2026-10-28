import { ref, computed } from 'vue'
import { track } from '../analytics'
import { EVT } from '../analytics/events'

const isInstalled = ref(false)
const deferredPrompt = ref(null)
let inited = false

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

function detect() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = window.navigator.standalone === true
  // Дополнительный сигнал: если window.opener пуст и navigation.standalone
  // (работает в некоторых сборках Chrome)
  const navStandalone = window.navigation?.standalone === true
  isInstalled.value = standalone || iosStandalone || navStandalone
}

function init() {
  if (inited) return
  inited = true

  detect()

  // Основной сигнал
  const mq = window.matchMedia('(display-mode: standalone)')
  mq.addEventListener?.('change', detect)

  // Дополнительные триггеры: Chrome может не успеть применить display-mode
  // к моменту первого вызова detect() — эти события подстрахуют.
  window.addEventListener('appinstalled', () => {
    isInstalled.value = true
  })
  document.addEventListener('visibilitychange', detect)
  window.addEventListener('pageshow', detect)
  window.addEventListener('focus', detect)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    track(EVT.INSTALL_PROMPT_SHOWN, { platform: detectPlatform() })
  })

  // Три коротких перепроверки сразу после старта — на случай, если
  // display-mode переключится через кадр-другой.
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

  /** Принудительный пересчёт — на случай, если display-mode поменялся вне событий. */
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
    track(accepted ? EVT.INSTALL_ACCEPTED : EVT.INSTALL_REJECTED, {
      platform: detectPlatform(),
    })
    return accepted
  }

  return {
    isInstalled: computed(() => isInstalled.value),
    hasPrompt: computed(() => !!deferredPrompt.value),
    promptInstall,
    refresh,
  }
}