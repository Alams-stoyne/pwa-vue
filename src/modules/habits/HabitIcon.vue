<template>
  <!-- Вода — капля -->
  <svg v-if="id === 'water'" viewBox="0 0 36 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7FD6F2"/>
        <stop offset="100%" stop-color="#2E9DCC"/>
      </linearGradient>
    </defs>
    <path
      d="M18 2C18 2 4 20 4 33c0 7.7 6.3 14 14 14s14-6.3 14-14C32 20 18 2 18 2z"
      :fill="`url(#${gradId})`"
    />
    <ellipse cx="13" cy="30" rx="3" ry="5" fill="#FFFFFF" opacity=".45"
             transform="rotate(-18 13 30)"/>
  </svg>

  <!-- Разминка — фигурка в движении -->
  <svg v-else-if="id === 'workout'" viewBox="0 0 36 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="18" cy="9" r="5" fill="#015F01"/>
    <path d="M18 15 L12 26 L12 44 M18 15 L24 26 L24 44 M10 22 L26 22"
          stroke="#015F01" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>

  <!-- Глаза — глаз с ресницами -->
  <svg v-else viewBox="0 0 36 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="18" cy="28" rx="14" ry="9" fill="#FFFFFF" stroke="#015F01" stroke-width="2"/>
    <circle cx="18" cy="28" r="5.5" fill="#015F01"/>
    <circle cx="16" cy="26" r="1.6" fill="#FFFFFF"/>
    <path d="M4 28 L1 26 M32 28 L35 26 M12 18 L10 15 M24 18 L26 15"
          stroke="#015F01" stroke-width="2" stroke-linecap="round"/>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  id: { type: String, required: true },
})

// Уникальный id для градиента — чтобы не конфликтовал при нескольких карточках
const gradId = computed(() => `hc-water-grad-${Math.random().toString(36).slice(2, 8)}`)
</script>

<style scoped>
svg {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 48px;
  max-height: 56px;
}
</style>