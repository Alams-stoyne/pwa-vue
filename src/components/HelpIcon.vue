<template>
  <span class="help-wrap">
    <button
      type="button"
      class="help-btn"
      :aria-label="label"
      @click="open = true"
    >
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path
          d="M7.8 7.5c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2c0 1.6-2.2 1.7-2.2 3.2"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
        />
        <circle cx="10" cy="14.4" r="1" fill="currentColor"/>
      </svg>
    </button>

    <AppModal
      v-model="open"
      :title="title || label"
      :aria-label="label"
    >
      <slot />
    </AppModal>
  </span>
</template>

<script setup>
import { ref } from 'vue'
import AppModal from './AppModal.vue'

const props = defineProps({
  label: { type: String, default: 'Справка' },
  title: { type: String, default: '' },
})

const open = ref(false)
</script>

<style scoped>
.help-wrap {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.help-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
  box-shadow: none;
}
.help-btn:hover:not(:disabled) {
  background: var(--accent-soft);
  color: var(--accent);
  box-shadow: none;
}
.help-btn:active:not(:disabled) {
  transform: scale(.94);
}
</style>