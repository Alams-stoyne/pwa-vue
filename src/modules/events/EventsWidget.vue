<template>
  <section v-if="events.todayEvents.length" class="events-widget">
    <article
      v-for="event in events.todayEvents"
      :key="event.id"
      class="event-card"
    >
      <div class="event-content">
        <div class="event-title" @click="viewClick(event)">{{ event.title }}</div>
        <div class="event-desc muted">{{ event.description }}</div>
      </div>

      <div class="event-action">
        <!-- 1. Доступно -->
        <button
          v-if="getState(event.id).status === 'available'"
          type="button"
          class="btn btn-primary btn-center btn-full"
          @click="handleClick(event)"
        >
          {{ event.buttonText || 'Открыть' }}
        </button>

        <!-- 2. Таймер -->
        <a
          :href="event.link"
          target="_blank" rel="noopener noreferrer"
          v-else-if="getState(event.id).status === 'timer'"
          class="btn btn-secondary btn-center btn-full"
          :title="'через' + formatTimeLeft(getState(event.id).timeLeft)"
        >
          {{ event.buttonText || 'Открыть' }}
        </a>

        <!-- 3. Готово к подтверждению -->
        <button
          v-else-if="getState(event.id).status === 'ready_to_confirm'"
          type="button"
          class="btn btn-primary btn-center btn-full"
          :disabled="confirming"
          @click="handleConfirm(event)"
        >
          <span class="text">Получить</span>
          <span class="badge" v-if="event.rewardPoints">+{{ event.rewardPoints }} <AppIcon name="apple" :size="21" /></span>
        </button>

        <!-- 4. Выполнено -->
        <div
          v-else-if="getState(event.id).status === 'done'"
          class="btn btn-white btn-center btn-full disabled"
        >
          <span class="text">{{ event.rewardPoints ? 'Награда получена' : 'Посещено' }}</span>
          <span class="badge" v-if="event.rewardPoints">+{{ event.rewardPoints }} <AppIcon name="apple" :size="21" /></span>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useEventsStore } from './store'
import { useToast } from '../core/composables/useToast'
import AppIcon from '../../components/AppIcon.vue'

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

function viewClick(event) {
  console.log(event);
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
    } else if (event.rewardPoints) {
      toast.success(`Получено: ${event.rewardPoints}`)
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
/* Стили оставлены без изменений */
.events-widget {
  display: grid;
  gap: 16px;
}
.event-card {
  position: relative;
  display: grid;
  gap: 16px;
  border: 1px solid #afe6dd;
  border-radius: 20px;
  padding: 16px;
  background: var(--white);
  transition: transform var(--t-base), box-shadow var(--t-base), border-color var(--t-base);
}
.event-content{
  font-family: var(--font-family);
  text-transform: lowercase;  
  display: grid;
  gap: 8px;
}
.event-title {
  font-weight: 700;
  font-size: 18px;
  line-height: 87%;
  text-wrap: balance;
  color: var(--txt-dark-green);
}
.event-desc {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  color: var(--txt-black-dark-green);
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
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 120%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-dark-green);
}
</style>