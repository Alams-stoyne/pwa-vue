<template>
  <section class="habit-widget">
    <!-- <header class="hw-head">
      <h2 class="hw-title">Привычки на сегодня</h2>
      <span class="hw-progress muted">{{ total.done }} / {{ total.total }}</span>
    </header> -->

    <HabitCard
      v-for="h in habits.list"
      :key="h.id"
      :habit="h"
      :progress="progressFor(h.id)"
      :notifications-enabled="habits.notificationsEnabled"
      @complete="onComplete(h.id)"
      @enable-notifications="enableNotifications"
    />

    <transition name="fade">
      <button
        v-if="!habits.notificationsEnabled"
        type="button"
        class="hw-notify ghost"
        @click="enableNotifications"
      >
        🔔 Включить напоминания для всех привычек
      </button>
    </transition>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import HabitCard from './HabitCard.vue'
import { useHabitsStore } from './store'
import { useToast } from '../core/composables/useToast'

const habits = useHabitsStore()
const toast = useToast()

const total = computed(() => habits.totalProgress)

function progressFor(id) {
  return habits.progress(id) || { done: 0, total: 0, canComplete: false, leftMs: 0 }
}

async function onComplete(id) {
  const ok = await habits.complete(id)
  if (ok) toast.success('Отлично!')
}

async function enableNotifications() {
  const ok = await habits.enableNotifications()
  if (ok) toast.success('Напоминания включены')
  else toast.warn('Уведомления не разрешены')
}

onMounted(() => {
  habits.init()
})
</script>

<style scoped>
.habit-widget {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.hw-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 4px 12px;
}
.hw-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.hw-progress {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.hw-notify {
  margin-top: 6px;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>