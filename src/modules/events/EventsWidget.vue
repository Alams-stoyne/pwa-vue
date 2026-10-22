<template>
  <section v-if="events.todayEvents.length" class="events-widget">
    <article
      v-for="event in events.todayEvents"
      :key="event.id"
      class="event-card"
    >
      <div class="event-content">
        <h3 class="event-title color-text-stroke">{{ event.title }}</h3>
        <p class="event-desc muted">{{ event.description }}</p>
      </div>

      <div class="event-action">
        <button
          v-if="getState(event.id).status === 'available'"
          type="button"
          class="event-btn"
          @click="handleClick(event)"
        >
          {{ event.buttonText || 'Открыть' }}
          <span v-if="event.rewardText" class="event-reward">{{ event.rewardText }}</span>
        </button>

        <div
          v-else-if="getState(event.id).status === 'timer'"
          class="event-timer"
        >
          через {{ formatTimeLeft(getState(event.id).timeLeft) }}
        </div>

        <button
          v-else-if="getState(event.id).status === 'ready_to_confirm'"
          type="button"
          class="event-btn"
          :disabled="confirming"
          @click="handleConfirm(event)"
        >
          Подтвердить
          <span v-if="event.rewardText" class="event-reward">{{ event.rewardText }}</span>
        </button>

        <div
          v-else-if="getState(event.id).status === 'done'"
          class="event-done"
        >
          Посещено ✓
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useEventsStore } from './store'
import { useToast } from '../core/composables/useToast'

const events = useEventsStore()
const toast = useToast()
const confirming = ref(false)

const getState = (id) => events.eventState(id)

function formatTimeLeft(ms) {
  const totalMins = Math.ceil(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0) return `${h} ч ${String(m).padStart(2, '0')} мин`
  return `${m} мин`
}

function handleClick(event) {
  if (event.link) {
    window.open(event.link, '_blank', 'noopener,noreferrer')
  }
  events.clickEvent(event.id)
}

async function handleConfirm(event) {
  if (confirming.value) return
  confirming.value = true

  const res = await events.confirmEvent(event.id)
  
  if (res.success) {
    if (res.already) {
      toast.info(res.message || 'Вы уже получили награду')
    } else if (event.rewardText) {
      toast.success(`Получено: ${event.rewardText}`)
    } else {
      toast.success('Посещение подтверждено')
    }
  } else {
    toast.error(res.message || 'Не удалось подтвердить')
  }
  
  confirming.value = false
}

onMounted(() => {
  events.init()
})
</script>

<style scoped>
/* Стили остаются без изменений */
.events-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.event-card {
  background: #FFFFFF;
  border: 2px solid #D1EFEA;
  border-radius: 24px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.event-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: #015F01;
  line-height: 1.2;
}
.event-desc {
  margin: 0;
  font-size: 14px;
  color: #6b7268;
}
.event-action { width: 100%; }
.event-btn {
  width: 100%;
  height: 48px;
  border-radius: 100px;
  border: 2px solid #015F01;
  background: #D3FF4F;
  color: #015F01;
  font-family: var(--font-family);
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 3px 0 0 #015F01;
  transition: transform 0.1s, box-shadow 0.1s;
}
.event-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 0 #015F01; }
.event-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.event-reward {
  background: #FFFFFF;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #AFE6DD;
}
.event-timer {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #015F01;
}
.event-done {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #015F01;
  background: #EEF7E5;
  border: 1px solid #AFE6DD;
  border-radius: 100px;
}
</style>