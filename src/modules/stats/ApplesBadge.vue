<template>
  <component 
    :is="to ? 'router-link' : 'div'"
    :to="to"
    class="btn-badge rating-badge"
    :class="{ 'is-clickable': to }"
  >
    <span class="text">{{ formattedApples }}</span>
    <span class="apple"><AppIcon name="apple" :size="iconSize" /></span>  
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useStatsStore } from './store'
import { useConsentStore } from '../consent/store'
import AppIcon from '../../components/AppIcon.vue'

const props = defineProps({
  to: { type: [String, Object], default: null },
  iconSize: { type: [Number, String], default: 21 }
})

const store = useStatsStore()
const consent = useConsentStore()

// Без согласия на обработку ПД — всегда 0.
// С согласием — сервер + локальные pending.
const formattedApples = computed(() => {
  if (!consent.isGranted) return '0'
  return Number(store.apples || 0).toLocaleString('ru-RU')
})
</script>

<style scoped>
.btn-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 100px;
  background: #fff;
  border: 1.5px solid #21271f;
  color: #21271f;
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-badge {
  color: transparent;
}
.btn-badge.is-clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.rating-badge .text {
  /* font-variant-numeric: tabular-nums; */
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 87%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}
</style>