<template>
  <article
    class="habit-card"
    :class="{
      'is-ready': canComplete,
      'is-done': done,
      'is-cooldown': !canComplete && !done,
    }"
  >
    <header class="hc-head">
      <div class="hc-title-wrap">
        <div class="hc-title" v-html="habit.title" />
        <!-- <div class="hc-text">{{ habit.hint }}</div> -->
        <div class="hc-text" v-html="habit.description" />
      </div>
      <div class="hc-icon" aria-hidden="true">
        <img
            v-if="habit.picture"
            :src="habit.picture"
            :alt="habit.title"
            class="hc-image"
          />
        <!-- <HabitIcon :id="habit.icon || habit.id" /> -->
      </div>
      <!-- <button
        v-if="!notificationsEnabled"
        type="button"
        class="hc-bell"
        :aria-label="`включить напоминания для «${habit.title}»`"
        @click="$emit('enable-notifications')"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v4l-1.5 3h15L18 13V9a6 6 0 0 0-6-6z"
            stroke="currentColor" stroke-width="1.6"
            stroke-linecap="round" stroke-linejoin="round"
          />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0"
                stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round"/>
        </svg>
      </button> -->
    </header>

    <div class="hc-progress" v-if="habit.timesPerDay > 1">
      <div class="hc-progress-track" role="progressbar"
           :aria-valuenow="progress.done" :aria-valuemin="0" :aria-valuemax="habit.timesPerDay">
        <span class="hc-progress-fill" :style="{ width: fillPercent + '%' }" />
        <span class="hc-progress-knob" :style="{ left: `calc(${fillPercent}% - 6px)` }" />
      </div>
      <span class="hc-progress-label">{{ progress.done }}/{{ habit.timesPerDay }}</span>
    </div>

    <button
      type="button"
      class="btn btn-primary btn-center"
      :disabled="!canComplete"
      @click="$emit('complete')"
    >
      <span class="text">
        <template v-if="done">Выполнено</template>
        <template v-else-if="canComplete">Выполнить </template>
        <template v-else>Через {{ leftText }}</template>      
      </span>
      <span class="badge" v-if="habit.rewardPoints && canComplete">+{{ habit.rewardPoints }} <AppIcon name="apple" :size="21" /></span>

    </button>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import HabitIcon from './HabitIcon.vue'
import AppIcon from '../../components/AppIcon.vue'

const props = defineProps({
  habit: { type: Object, required: true },
  progress: { type: Object, required: true },
  notificationsEnabled: { type: Boolean, default: false },
})
defineEmits(['complete', 'enable-notifications'])

const done = computed(() => props.progress.done >= props.habit.timesPerDay)
const canComplete = computed(() => props.progress.canComplete && !done.value)

const fillPercent = computed(() => {
  const total = props.habit.timesPerDay || 1
  return Math.min(100, Math.round((props.progress.done / total) * 100))
})

const leftText = computed(() => {
  const ms = props.progress.leftMs || 0
  if (ms <= 0) return '0 с'
  const sec = Math.ceil(ms / 1000)
  const min = Math.floor(sec / 60)
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h} ч ${m} мин`
  }
  if (min > 0) return `${min} мин`
  return `${sec} с`
})
</script>

<style scoped>
/* ─── Карточка ─── */
.habit-card {
  position: relative;
  display: grid;
  gap: 10px;
  border: 1px solid #afe6dd;
  border-radius: 20px;
  padding: 16px;
  background: var(--white);
  transition: transform var(--t-base), box-shadow var(--t-base), border-color var(--t-base);
}

.habit-card.is-ready {
  border-color: var(--hc-green);
  box-shadow: 0 6px 22px rgba(1, 95, 1, .12);
  animation: hcPulse 2.6s ease-in-out infinite;
}
@keyframes hcPulse {
  0%, 100% { box-shadow: 0 6px 22px rgba(1, 95, 1, .10); }
  50%      { box-shadow: 0 6px 26px rgba(1, 95, 1, .20); }
}

.habit-card.is-done { opacity: .92; }
.habit-card.is-cooldown { opacity: .96; }

/* ─── Шапка ─── */
.hc-head {
  display: grid;
  grid-template-columns: 1fr 48px;
  align-items: start;
  gap: 12px;
}

.hc-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}
.hc-image{
  width: 100%;
}
.hc-title-wrap { 
  display: grid;
  gap: 6px;
 }

.hc-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 18px;
  line-height: 87%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-dark-green);
}

.hc-text {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  /* text-transform: lowercase; */
  color: var(--txt-black-dark-green);
}

.hc-bell {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  background: #FFFFFF;
  color: #8FA69A;
  border: 1.5px dashed #8FA69A;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: color var(--t-fast), border-color var(--t-fast), background var(--t-fast), transform var(--t-fast);
}
.hc-bell:hover { color: var(--hc-green); border-color: var(--hc-green); background: #F3FBEE; }
.hc-bell:active { transform: scale(.94); }

/* ─── Прогресс ─── */
.hc-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.hc-progress-track {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--hc-track);
  overflow: visible;
}

.hc-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 4px;
  background: var(--hc-accent);
  transition: width var(--t-base);
}

.hc-progress-knob {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--hc-accent);
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 4px rgba(0,0,0,.15);
  transform: translateY(-50%);
  transition: left var(--t-base);
  pointer-events: none;
}
.habit-card.is-done .hc-progress-knob { background: var(--hc-green); }

.hc-progress-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--hc-green);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ─── Кнопка ─── */
.hc-btn {
  width: 100%;
  height: 44px;
  padding: 0 20px;
  border-radius: 22px;
  border: 1.5px solid var(--hc-green);
  background: var(--hc-accent);
  color: var(--hc-green);
  font-family: var(--font-family);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 3px 0 0 var(--hc-green);
  transition: transform var(--t-fast), box-shadow var(--t-fast), background var(--t-fast);
}
.hc-btn:hover:not(:disabled) {
  background: #C8F53F;
  transform: translateY(-1px);
  box-shadow: 0 4px 0 0 var(--hc-green);
}
.hc-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 0 var(--hc-green);
}
.hc-btn:disabled {
  background: #FFFFFF;
  color: #8FA69A;
  border-color: #C7D7CC;
  box-shadow: 0 3px 0 0 #C7D7CC;
  cursor: default;
}
.habit-card.is-done .hc-btn:disabled {
  background: #EEF7E5;
  color: var(--hc-green);
  border-color: var(--hc-green);
  box-shadow: 0 3px 0 0 var(--hc-green);
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .habit-card.is-ready { animation: none; }
  .hc-progress-fill, .hc-progress-knob { transition: none; }
}
</style>