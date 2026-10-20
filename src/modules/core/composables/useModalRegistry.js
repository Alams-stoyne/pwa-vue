import { ref, computed } from 'vue'

// Реактивная ссылка на функцию закрытия верхнего модала.
// Используется как в BackButton (closeTop), так и в App.vue (hasOpen).
const topClose = ref(null)

export function useModalRegistry() {
  function register(fn) { topClose.value = fn }
  function unregister() { topClose.value = null }

  /** Вернёт true, если что-то закрылось. */
  function closeTop() {
    if (typeof topClose.value === 'function') {
      topClose.value()
      return true
    }
    return false
  }

  return {
    register,
    unregister,
    closeTop,
    /**
     * Реактивный флаг «есть ли открытый модал».
     * Используется в App.vue, чтобы показать кнопку «Назад» поверх
     * оверлея, даже если у маршрута meta.back === false.
     */
    hasOpen: computed(() => !!topClose.value),
  }
}