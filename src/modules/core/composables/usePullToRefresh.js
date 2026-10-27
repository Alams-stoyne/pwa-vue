/**
 * Pull-to-refresh для скроллируемого контейнера.
 *
 * Использование:
 *   const elRef = ref(null)
 *   const { pullOffset, isPulling, isRefreshing, isReady, pullText, handlers }
 *     = usePullToRefresh(elRef, async () => {
 *         await Promise.all([store.fetchPersonal({ force: true }), store.fetchGlobal({ force: true })])
 *       })
 *
 * В шаблоне:
 *   <div ref="elRef" v-bind="handlers" :style="{ transform: `translateY(${pullOffset}px)` }">
 *
 * Принцип:
 *   • touchstart при scrollTop === 0 → начало pull
 *   • touchmove вниз → смещение с сопротивлением (damping)
 *   • touchend при pullOffset >= threshold → onRefresh()
 *   • во время onRefresh — фиксированный offset (показываем спиннер)
 */
import { computed, ref } from 'vue'

export function usePullToRefresh(elRef, onRefresh, options = {}) {
  const {
    threshold = 70,        // порог срабатывания (px)
    maxPull = 100,         // максимальное растяжение (px)
    damping = 0.5,         // коэффициент сопротивления (0.5 = на 1px пальца 0.5px контента)
    refreshOffset = 50,    // высота индикатора при обновлении (px)
  } = options

  const pullDistance = ref(0)
  const isPulling = ref(false)
  const isRefreshing = ref(false)

  let startY = 0
  let active = false

  function reset() {
    pullDistance.value = 0
    isPulling.value = false
  }

  function onTouchStart(e) {
    if (isRefreshing.value) return
    const el = elRef.value
    if (!el) return
    if (el.scrollTop > 0) return
    if (e.touches.length !== 1) return

    startY = e.touches[0].clientY
    active = true
    isPulling.value = true
  }

  function onTouchMove(e) {
    if (!active || isRefreshing.value) return
    const el = elRef.value
    if (!el) return

    // Если пользователь проскроллил — pull отменяется
    if (el.scrollTop > 0) {
      active = false
      reset()
      return
    }

    const delta = e.touches[0].clientY - startY
    if (delta <= 0) {
      pullDistance.value = 0
      return
    }

    const resisted = Math.min(maxPull, delta * damping)
    pullDistance.value = resisted

    // Блокируем встроенный bounce, пока тянем
    if (resisted > 0 && e.cancelable) {
      e.preventDefault()
    }
  }

  async function onTouchEnd() {
    if (!active) return
    active = false
    isPulling.value = false

    const shouldRefresh = pullDistance.value >= threshold && !isRefreshing.value

    if (shouldRefresh) {
      isRefreshing.value = true
      try {
        await onRefresh()
      } catch (e) {
        console.warn('[pull-to-refresh] failed:', e)
      } finally {
        isRefreshing.value = false
        pullDistance.value = 0
      }
    } else {
      pullDistance.value = 0
    }
  }

  // Итоговое смещение контента:
  //   • при pull — pullDistance
  //   • при refresh — фиксированная высота (место под спиннер)
  const pullOffset = computed(() => {
    if (isRefreshing.value) return refreshOffset
    return pullDistance.value
  })

  const isReady = computed(() => pullDistance.value >= threshold)

  const pullText = computed(() => {
    if (isRefreshing.value) return 'обновляем…'
    if (isReady.value) return 'отпустите'
    return 'потяните'
  })

  return {
    pullDistance,
    isPulling,
    isRefreshing,
    isReady,
    pullOffset,
    pullText,
    refreshOffset,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  }
}