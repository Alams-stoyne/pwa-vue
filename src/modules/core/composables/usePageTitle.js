import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const DEFAULT_TITLE = ''

/** Универсальный установщик заголовка окна. */
export function setDocumentTitle(value) {
  const next = value ? `${value} · ${DEFAULT_TITLE}` : DEFAULT_TITLE
  if (document.title !== next) document.title = next
}

/**
 * Переопределить заголовок для конкретного компонента.
 * Если передать ref/computed — заголовок будет реактивно меняться.
 * При размонтировании возвращает заголовок из route.meta.
 */
export function usePageTitle(source) {
  const route = useRoute()
  const local = ref('')

  function pick() {
    if (local.value) return setDocumentTitle(local.value)
    const meta = route.meta?.title
    if (typeof meta === 'function') return setDocumentTitle(meta(route))
    setDocumentTitle(meta || '')
  }

  const stopWatch = watch(
    () => (typeof source === 'function' ? source() : (source?.value ?? source)),
    (v) => { local.value = v || ''; pick() },
    { immediate: true }
  )

  const stopRoute = watch(() => route.fullPath, pick, { immediate: true })

  onBeforeUnmount(() => { stopWatch(); stopRoute() })
}