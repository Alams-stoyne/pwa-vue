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
        <!-- 1. Доступно — открыть + отправить click -->
        <button
          v-if="stateMap[event.id].status === 'available'"
          type="button"
          class="btn btn-primary btn-center btn-full"
          @click="handleClick(event)"
        >
          {{ event.buttonText || 'Открыть' }}
        </button>

        <!-- 2. Click отправляется -->
        <button
          v-else-if="stateMap[event.id].status === 'click_pending'"
          type="button"
          class="btn btn-secondary btn-center btn-full"
          disabled
        >
          <span class="spinner" aria-hidden="true">↻</span>
          подключение…
        </button>

        <!-- 3. Click в очереди (офлайн) -->
        <button
          v-else-if="stateMap[event.id].status === 'click_queued'"
          type="button"
          class="btn btn-secondary btn-center btn-full"
          disabled
        >
          ожидает подключения
        </button>

        <!-- 4. Click не удался — повторить -->
        <button
          v-else-if="stateMap[event.id].status === 'click_failed'"
          type="button"
          class="btn btn-primary btn-center btn-full"
          @click="handleClick(event)"
        >
          <span class="text">{{ event.buttonText || 'повторить клик' }} </span>
        </button>

        <!-- 5. Таймер идёт (клик подтверждён сервером) -->
        <a
          v-else-if="stateMap[event.id].status === 'timer'"
          :href="event.link"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-secondary btn-center btn-full"
          :title="'через ' + formatTimeLeft(stateMap[event.id].timeLeft)"
        >
          {{ event.buttonText || 'открыть' }}
        </a>

        <!-- 6. Готово к подтверждению -->
        <button
          v-else-if="stateMap[event.id].status === 'ready_to_confirm'"
          type="button"
          class="btn btn-primary btn-center btn-full"
          :disabled="stateMap[event.id].confirmPending"
          @click="handleConfirm(event)"
        >
          <template v-if="stateMap[event.id].confirmPending">
            <span class="spinner" aria-hidden="true">↻</span>
            отправка…
          </template>
          <template v-else>
            <span class="text">получить</span>
            <span class="badge" v-if="event.rewardPoints">
              +{{ event.rewardPoints }}
              <span class="apple"><AppIcon name="apple" :size="21" /></span>
            </span>
          </template>
        </button>

        <!-- 7. Confirm в очереди (офлайн) -->
        <div
          v-else-if="stateMap[event.id].status === 'confirm_queued'"
          class="btn btn-white btn-center btn-full disabled"
        >
          <span class="text">Награда будет зачислена</span>
        </div>

        <!-- 8. Выполнено -->
        <div
          v-else-if="stateMap[event.id].status === 'done'"
          class="btn btn-white btn-center btn-full disabled"
        >
          <span class="text">{{ event.rewardPoints ? 'Награда получена' : 'Посещено' }}</span>
          <span class="badge" v-if="event.rewardPoints">
            +{{ event.rewardPoints }}
            <span class="apple"><AppIcon name="apple" :size="21" /></span>
          </span>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useEventsStore } from './store'
import { useToast } from '../core/composables/useToast'
import AppIcon from '../../components/AppIcon.vue'

const events = useEventsStore()
const toast = useToast()

// Кешируем состояния всех событий — один вызов eventState на событие
const stateMap = computed(() => {
  const map = {}
  for (const ev of events.todayEvents) {
    map[ev.id] = events.eventState(ev.id)
  }
  return map
})

function formatTimeLeft(ms) {
  const totalMins = Math.ceil(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h > 0) return `${h} ч ${String(m).padStart(2, '0')} мин`
  return `${m} мин`
}

function viewClick(event) {
  console.log(event)
}

/**
 * Открывает ссылку и отправляет click.
 * window.open СИНХРОННО до await — иначе браузер заблокирует popup.
 * clickEvent — с keepalive:true, чтобы fetch не отменился при уходе с вкладки.
 */
async function handleClick(event) {
  if (event.link) {
    window.open(event.link, '_blank', 'noopener,noreferrer')
  }
  const res = await events.clickEvent(event.id)
  if (!res.success && !res.queued && res.error) {
    toast.warn(res.error)
  }
}

async function handleConfirm(event) {
  const state = stateMap.value[event.id]
  if (state.confirmPending) return

  const res = await events.confirmEvent(event.id)

  if (res.success) {
    if (res.already) {
      toast.info(res.message || 'Вы уже получили награду')
    } else if (res.queued) {
      toast.info('Награда будет зачислена при подключении к сети')
    } else if (res.rewardPoints > 0) {
      // Используем серверный текст, если есть; иначе собираем из POINTS
      toast.success(res.rewardText || `Получено: ${res.rewardPoints}`)
    } else {
      toast.success('Посещение подтверждено')
    }
  } else {
    toast.error(res.message || 'Не удалось подтвердить')
  }
}

onMounted(() => {
  events.init()
})
</script>

<style scoped>
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

/* Спиннер для «Отправка…» / «Подключение…» */
.spinner {
  display: inline-block;
  margin-right: 6px;
  font-size: 16px;
  line-height: 1;
  animation: evSpin 800ms linear infinite;
}
@keyframes evSpin { to { transform: rotate(360deg); } }

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