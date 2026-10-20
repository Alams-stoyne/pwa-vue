import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  function show(message, { type = 'info', duration = 4500 } = {}) {
    if (!message) return null
    const id = nextId++
    toasts.value.push({ id, message, type })
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }
  function dismiss(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  function clear() { toasts.value = [] }
  return {
    toasts, show, dismiss, clear,
    success: (m, o) => show(m, { type: 'success', ...o }),
    error:   (m, o) => show(m, { type: 'error',   ...o }),
    info:    (m, o) => show(m, { type: 'info',    ...o }),
    warn:    (m, o) => show(m, { type: 'warn',    ...o }),
  }
}