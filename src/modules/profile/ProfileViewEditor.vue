<template>
  <div class="page profile-page">
    <header class="head">
      <h1>Профиль</h1>
      <transition name="fade" mode="out-in">
        <span :key="status.key" class="status" :class="status.cls">
          <span class="status-dot" />
          {{ status.text }}
        </span>
      </transition>
    </header>

    <form @submit.prevent="onSave" :class="{ 'is-disabled': !canEdit }">
      <label>Никнейм
        <input
          v-model.trim="store.nickname"
          type="text"
          maxlength="32"
          placeholder="ivan_x5"
          :disabled="!canEdit"
        />
      </label>

      <label>Место работы
        <select v-model="store.workplace" class="select" :disabled="!canEdit">
          <option value="" disabled>Выберите из списка…</option>
          <option
            v-for="w in workplaces"
            :key="w.value"
            :value="w.value"
          >{{ w.label }}</option>
        </select>
      </label>

      <Mascot ref="mascot" 
        :body-src="`/maskot/body_sport.png`" 
        bubble-text="Привет! Я Зефирчик. Рад тебя видеть на Неделе здоровья и безопасности Х5!"
        :typewriter-speed="40"
        @bubble-complete="onBubbleDone"
      />  

      <div class="bottom-action">
        <button type="submit" :disabled="store.isSyncing || !canEdit" class="btn btn-primary btn-center">
          {{ store.isSyncing ? 'Отправка…' : 'Сохранить' }}
        </button>
        <button
          v-if="store.isError && canEdit"
          type="button"
          class="ghost"
          :disabled="store.isSyncing"
          @click="store.retry()"
        >
          Повторить отправку
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useProfileStore } from './store.js'
import { WORKPLACES } from './workplaces.js'
import { useConsentStore } from '../consent/store.js'
import { useToast } from '../core/composables/useToast.js'
import { useAppBackground } from '../core/composables/useAppBackground.js'

import Mascot from '../../components/Mascot.vue'


const store = useProfileStore()
const consent = useConsentStore()
const toast = useToast()
const { setBackground } = useAppBackground()

const workplaces = WORKPLACES

const canEdit = computed(() => consent.isGranted)

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.load()
})

const status = computed(() => {
  switch (store.syncState) {
    case 'syncing': return { key: 's', cls: 'is-syncing', text: 'Сохранение…' }
    case 'pending': return { key: 'p', cls: 'is-pending', text: 'Ожидает сети' }
    case 'error':   return { key: 'e', cls: 'is-error',   text: 'Ошибка отправки' }
    default:        return { key: 'i', cls: 'is-ok',      text: 'Сохранено' }
  }
})

watch(() => store.syncState, (n, o) => {
  if (o !== 'syncing') return
  if (n === 'idle')    toast.success('Профиль сохранён')
  if (n === 'pending') toast.warn('Нет сети — сохранено локально, отправим позже')
  if (n === 'error')   toast.error('Не удалось отправить. Нажмите «Повторить».')
})

async function onSave() {
  if (!canEdit.value) {
    toast.warn('Нужно согласие на обработку персональных данных')
    return
  }
  await store.save()
}
</script>

<style scoped>
.profile-page {
  padding-bottom: 32px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.head h1 { margin: 0; }

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  transition: background var(--t-base), color var(--t-base);
}
.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.is-ok      { color: #2e7d32; background: rgba(46,125,50,.10); }
.is-syncing { color: var(--accent); background: var(--accent-soft); }
.is-syncing .status-dot { animation: pulse 1s ease-in-out infinite; }
.is-pending { color: #8a6d00; background: rgba(255,193,7,.14); }
.is-error   { color: var(--danger); background: rgba(178,27,0,.10); }

form {
  display: grid;
  gap: 16px;
}
form.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #21271f;
}

input,
.select {
  width: 100%;
  padding: 12px 40px 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-family);
  font-size: 15px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}

input:focus,
.select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

input:disabled,
.select:disabled {
  background: #f3f3f3;
  color: #8a8a8a;
  cursor: not-allowed;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.actions button { flex: 1; min-width: 160px; }

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
}
</style>