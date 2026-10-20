/**
 * Запрет pinch-zoom и двойного-тап-зума на iOS Safari.
 * Вызывается один раз в main.js.
 */
export function installNoZoomGuards() {
  if (typeof window === 'undefined') return

  // 1. Запрет жест-мультитача (pinch zoom)
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) e.preventDefault()
    },
    { passive: false }
  )

  // 2. Запрет двойного тапа (iOS Safari зум)
  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) e.preventDefault()
      lastTouchEnd = now
    },
    { passive: false }
  )

  // 3. Запрет Ctrl/Cmd + колесо мыши (десктопный браузер)
  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault()
    },
    { passive: false }
  )

  // 4. Запрет Ctrl/Cmd + «+», «-», «0»
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
      e.preventDefault()
    }
  })

  // 5. Запрет «жеста масштабирования» через Safari жесты (трекинг двух пальцев)
  document.addEventListener(
    'gesturestart',
    (e) => e.preventDefault(),
    { passive: false }
  )
  document.addEventListener(
    'gesturechange',
    (e) => e.preventDefault(),
    { passive: false }
  )
  document.addEventListener(
    'gestureend',
    (e) => e.preventDefault(),
    { passive: false }
  )
}