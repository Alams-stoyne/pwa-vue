<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="close"
        @keydown.esc="close"
      >
        <transition name="modal-pop" appear>
          <div
            class="modal"
            role="dialog"
            aria-modal="true"
            :aria-label="ariaLabel || 'Диалог'"
          >
            <button
              type="button"
              class="modal-close"
              aria-label="Закрыть"
              @click="close"
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <div class="modal-body">
              <h3 v-if="title" class="modal-title">{{ title }}</h3>
              <div class="modal-content">
                <slot />
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
  closeOnEsc: { type: Boolean, default: true },
  lockScroll: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'close'])

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKey(e) {
  if (e.key === 'Escape' && props.closeOnEsc) close()
}

function lockBody(lock) {
  if (!props.lockScroll) return
  const b = document.body
  if (lock) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    b.style.overflow = 'hidden'
    if (scrollbar > 0) b.style.paddingRight = scrollbar + 'px'
  } else {
    b.style.overflow = ''
    b.style.paddingRight = ''
  }
}

watch(() => props.modelValue, (v) => {
  if (v) {
    window.addEventListener('keydown', onKey)
    lockBody(true)
  } else {
    window.removeEventListener('keydown', onKey)
    lockBody(false)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  lockBody(false)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 200;
}

.modal {
  position: relative;
  width: min(100%, 440px);
  max-height: min(90vh, 640px);
  background: var(--bg);
  color: var(--text);
  border-radius: var(--radius);
  box-shadow: 0 20px 60px rgba(0,0,0,.25), 0 4px 12px rgba(0,0,0,.10);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
  box-shadow: none;
  z-index: 1;
}
.modal-close:hover:not(:disabled) {
  background: #f3f3f3;
  color: var(--text);
  box-shadow: none;
}
.modal-close:active:not(:disabled) {
  transform: scale(.94);
}

.modal-body {
  padding: 22px 22px 20px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-title {
  margin: 0 32px 10px 0; /* место под крестик */
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.modal-content {
  font-size: 14px;
  line-height: 1.55;
  color: var(--text);
}
.modal-content :deep(p) { margin: 0 0 8px; }
.modal-content :deep(p:last-child) { margin-bottom: 0; }
.modal-content :deep(ul) { margin: 6px 0; padding-left: 20px; }
.modal-content :deep(li) { margin-bottom: 4px; }

/* анимации */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--t-base);
}
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

.modal-pop-enter-active,
.modal-pop-leave-active {
  transition: opacity var(--t-base), transform var(--t-base);
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: scale(.94) translateY(8px);
}
</style>