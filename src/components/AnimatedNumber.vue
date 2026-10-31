<template>
  <span
    :key="bumpKey"
    class="animated-number"
    :class="{ 'is-bumping': bumpKey > 0 }"
  >{{ displayText }}</span>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  value: { type: [Number, String], default: 0 },
  /**
   * 'bump'  — мгновенная замена + пульс (scale).
   * 'count' — плавный подсчёт от текущего displayValue до value.
   *           При первом рендере / restartKey — от 0.
   */
  mode: { type: String, default: 'bump' },
  /** Длительность count-анимации, мс. Для bump игнорируется. */
  duration: { type: Number, default: 900 },
  /** Кастомный форматтер. По умолчанию — toLocaleString('ru-RU'). */
  format: { type: Function, default: null },
  /**
   * Триггер принудительного рестарта анимации из нуля.
   * Каждое изменение restartKey → displayValue сбрасывается в 0
   * и запускается animateCount(0, value) заново.
   * Применяется только к mode='count'.
   */
  restartKey: { type: Number, default: 0 },
})

const displayValue = ref(0)
const bumpKey = ref(0)

let intervalId = null

const formatter = computed(() => {
  if (typeof props.format === 'function') return props.format
  return (n) => Number(n || 0).toLocaleString('ru-RU')
})

const displayText = computed(() => formatter.value(displayValue.value))

function stopAnimation() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/**
 * Плавный счётчик на setInterval.
 *
 * Почему не requestAnimationFrame:
 *   • RAF не тикает, когда DevTools в фокусе (частая причина
 *     «анимации нет» при отладке);
 *   • RAF может не тикать на некоторых мобильных сборках
 *     в фоне / при document.hidden;
 *   • setInterval(16ms) даёт ту же частоту кадров и работает
 *     везде, где работает JS.
 *
 * easeOutCubic: быстро стартует, мягко финиширует.
 */
function animateCount(from, to, durationMs) {
  stopAnimation()
  const start = performance.now()
  const delta = to - from

  if (Math.abs(delta) < 1) {
    displayValue.value = to
    return
  }

  intervalId = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / durationMs)
    const eased = 1 - Math.pow(1 - t, 3)
    displayValue.value = Math.round(from + delta * eased)
    if (t >= 1) {
      stopAnimation()
      displayValue.value = to
    }
  }, 16)
}

watch(
  () => [Number(props.value) || 0, props.restartKey],
  ([next, nextKey], [prev, prevKey] = []) => {
    if (props.mode === 'count') {
      const isFirstRender = prev === undefined
      const shouldRestart = isFirstRender || nextKey !== prevKey

      if (shouldRestart) {
        // Рестарт: 0 → next (плавно, 900 мс)
        displayValue.value = 0
        animateCount(0, next, props.duration)
        return
      }

      if (next !== prev) {
        // Плавный переход от текущего значения к новому
        animateCount(displayValue.value, next, props.duration)
      }
      return
    }

    // mode='bump'
    if (prev === undefined) {
      displayValue.value = next
      return
    }
    if (next !== prev) {
      displayValue.value = next
      bumpKey.value++
    }
  },
  { immediate: true }
)

onBeforeUnmount(stopAnimation)
</script>

<style scoped>
.animated-number {
  display: inline-block;
  will-change: transform;
  font-variant-numeric: tabular-nums;
}

.animated-number.is-bumping {
  animation: bumpPop 0.45s cubic-bezier(.34, 1.56, .64, 1);
}

@keyframes bumpPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.22); }
  100% { transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .animated-number.is-bumping { animation: none; }
}
</style>