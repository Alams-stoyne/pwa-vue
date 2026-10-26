<template>
  <div class="back-block">
    <button
      type="button"
      class="back-button"
      :aria-label="label"
      :disabled="disabled"
      @click="onClick"
    >
      <svg
        class="back-icon"
        width="42"
        height="42"
        viewBox="0 0 41 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="21" cy="22" r="20" fill="#21271F"/>
        <circle cx="20" cy="20" r="19" fill="white" stroke="#21271F" stroke-width="2"/>
        <path d="M19.3368 12.3372C19.7029 11.9711 20.2963 11.9712 20.6625 12.3372C21.0286 12.7033 21.0286 13.2967 20.6625 13.6628L15.2631 19.0623H27.0001C27.5177 19.0624 27.9375 19.4822 27.9376 19.9998C27.9376 20.5174 27.5178 20.9371 27.0001 20.9373H15.2631L20.6625 26.3374C21.0286 26.7035 21.0286 27.297 20.6625 27.6631C20.2963 28.029 19.7028 28.0291 19.3368 27.6631L12.337 20.6626C11.971 20.2965 11.971 19.703 12.337 19.3369L19.3368 12.3372Z" fill="#21271F"/>
      </svg>
    </button>
    <h1 class="back-title" v-if="viewTitle">{{ viewTitle }}</h1>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useModalRegistry } from '../modules/core/composables/useModalRegistry'

const props = defineProps({
  to: { type: [String, Object], default: null },
  label: { type: String, default: 'Назад' },
  title: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  custom: { type: Boolean, default: false },
})
const emit = defineEmits(['click'])

const route = useRoute()
const router = useRouter()
const { closeTop } = useModalRegistry()

const target = computed(() => {
  if (props.to) return props.to
  const metaBackTo = route.meta?.backTo
  if (typeof metaBackTo === 'function') return metaBackTo(route)
  return metaBackTo || null
})

/**
 * Заголовок, который показывается рядом с кнопкой «Назад».
 *   • route.meta.title может быть строкой или функцией от текущего маршрута;
 *   • выводится только если у маршрута viewBackTitle === true;
 *   • если задан prop title — приоритет у него (независимо от meta).
 */
const viewTitle = computed(() => {
  if (props.title) return props.title
  if (route.meta?.viewBackTitle !== true) return ''
  const t = route.meta?.title
  if (typeof t === 'function') return t(route) || ''
  return t || ''
})

function onClick(e) {
  emit('click', e)
  if (props.disabled) return

  if (closeTop()) return
  if (props.custom) return

  if (target.value) router.replace(target.value)
  else router.back()
}
</script>

<style scoped>
.back-block {
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 16px;
  z-index: 61;
}
.back-button {
  position: relative;
  width: 42px;
  height: 42px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--t-fast), box-shadow var(--t-fast), opacity var(--t-base);
}

.back-button:disabled { opacity: 0; pointer-events: none; }

.back-button:hover:not(:disabled) {
  background: transparent;
  box-shadow: none;
  transform: translateY(-1px);
}
.back-button:hover:not(:disabled) .back-icon {
  box-shadow: 0 4px 14px rgba(33, 39, 31, .18);
}
.back-button:active:not(:disabled) {
  transform: scale(.95);
  background: transparent;
}

.back-icon {
  display: block;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  transition: box-shadow var(--t-base);
}
.back-title {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 28px;
  line-height: 100%;
  letter-spacing: -0.02em;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
  padding: 0;
  margin: 9px 0;
}
</style>