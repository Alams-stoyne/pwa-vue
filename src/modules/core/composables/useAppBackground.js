import { ref, computed } from 'vue'

/**
 * Управление фоном приложения.
 *
 * Больше не зависит от текущего маршрута — модуль (или экран) сам
 * сообщает, какой фон показывать, через setBackground(). Когда модуль
 * размонтируется — вызывает clearBackground(), и фон возвращается
 * к значению по умолчанию.
 *
 * Формат значения, который принимает setBackground():
 *   • строка                        → трактуется как URL картинки
 *   • { url: '...' }                → картинка по URL
 *   • { background: 'linear-...' }  → произвольный CSS background (градиент, цвет)
 *   • { url, overlay }              → картинка + затемняющий слой
 */

export const DEFAULT_BACKGROUND = '/backgrounds/bg_start.jpg'

const current = ref(null)

function normalize(value) {
  if (!value) return null
  if (typeof value === 'string') return { url: value }
  if (typeof value === 'object') return { ...value }
  return null
}

export function useAppBackground() {
  /**
   * Установить фон. Передавайте строку или объект — см. комментарий выше.
   */
  function setBackground(value) {
    current.value = normalize(value)
  }

  /** Сбросить фон — вернётся значение по умолчанию. */
  function clearBackground() {
    current.value = null
  }

  /**
   * Принудительно задать дефолтный фон (например, для корня приложения).
   * Эквивалентно clearBackground(), но семантически явно.
   */
  function setDefault() {
    current.value = null
  }

  /**
   * Итоговый фон для рендера:
   *   • override из модуля, если задан;
   *   • иначе — DEFAULT_BACKGROUND (backgrounds/bg_default.jpg).
   */
  const resolved = computed(() => {
    if (current.value) return current.value
    return { url: DEFAULT_BACKGROUND }
  })

  return {
    /** Текущий override (или null). Может пригодиться для отладки. */
    override: computed(() => current.value),

    /** Готовый для отрисовки объект — всегда с url или background. */
    resolved,

    /** Константа для случаев, когда нужен прямой путь. */
    DEFAULT_BACKGROUND,

    setBackground,
    clearBackground,
    setDefault,
  }
}