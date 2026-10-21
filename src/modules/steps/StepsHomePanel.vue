<template>
  <div class="steps-home-panel">
    <p v-if="loadingSummary && !hasSummary" class="muted loading">
      Загружаем прогресс…
    </p>

    <div class="rating-text">
      <p>Каждый день загружай шаги за предыдущий день. Укажи количество и приложи скриншот из приложения-шагомера в разделе рефлексии. </p>
      <p>Период учёта: утверждённые даты. </p>
      <p>Приём до дата, время и часовой пояс.</p>
    </div>

    <!-- Прогресс-арка -->
    <section class="arc-block">
      <div class="arc-wrap">
        <svg viewBox="0 0 289 160" class="progress-arc" aria-hidden="true">
          <path
            d="M 14 145 A 130.5 130.5 0 0 1 275 145"
            fill="none" stroke="#D0E8FC" stroke-width="14" stroke-linecap="round"
          />
          <path
            d="M 14 145 A 130.5 130.5 0 0 1 275 145"
            fill="none" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"
          />
          <path
            d="M 14 145 A 130.5 130.5 0 0 1 275 145"
            fill="none" stroke="#0E5505" stroke-width="14" stroke-linecap="round"
            pathLength="100"
            :stroke-dasharray="`${progressPercent} 100`"
            class="progress-arc__fill"
          />
        </svg>

        <div class="arc-center">
          <div class="arc-value">{{ formattedTotal }}</div>
          <div v-if="goal" class="arc-goal">из {{ formattedGoal }}</div>
          <div class="arc-label">шагов</div>
        </div>
        <div class="rating">
          <div class="rating-num" v-if="rank > 0">#{{ rank }}</div>
          <div class="rating-num" v-if="totalUsers > 0">из {{ totalUsers }}</div>          
        </div>
      </div>
    </section>
    <div class="rating-text">
      <template v-if="totalUsers > 0">
        Здесь результаты участников и твоё место среди всех пользователей. Рейтинг обновляется раз в сутки и остаётся предварительным до проверки подтверждений. Итоги: [дата и ссылка]
      </template>
      <template v-else>
        Пока результатов нет. Добавь шаги за вчера и скриншот из шагомера. Рейтинг обновляется раз в сутки, твоё место появится после обновления
      </template>
    </div>

    <!-- 1. Блок отправки шагов (показывается, если еще не отправляли сегодня) -->
    <div v-if="!store.isSubmittedToday" class="steps-form d-grid g12">
      
      <!-- Поле ввода с превью картинки -->
      <div class="input-wrapper" v-if="canSubmitWithConsent">
        <input
          v-model.number="steps"
          type="number"
          inputmode="numeric"
          :min="0"
          :max="MAX_STEPS"
          step="1"
          placeholder="укажите количество шагов"
          class="steps-input"
        />
        
        <!-- Превью загруженного изображения -->
        <div v-if="imagePreview" class="image-preview">
          <img :src="imagePreview" alt="Скриншот" />
          <button type="button" class="remove-img" @click="removeImage">✕</button>
        </div>
      </div>

      <label class="consent" v-if="canSubmitWithConsent">
        <input type="checkbox" v-model="localConsent" />
        <span>согласен на обработку персональных данных</span>
      </label>

      <!-- Скрытый инпут для выбора файла -->
      <input 
        v-if="canSubmitWithConsent"
        type="file" 
        ref="fileInput" 
        accept="image/*" 
        class="hidden-input" 
        @change="onFileChange" 
      />

      <div class="bottom-action d-grid g12">
        <ConsentBanner v-if="!canSubmitWithConsent" :class="'relative'" text="Для отправки шагов нужно согласие на обработку персональных данных." />
        
        <router-link to="/steps/rules" class="btn btn-secondary btn-center">правила</router-link>
        
        <!-- Кнопка загрузки / отправки -->
        <button 
          v-if="!imagePreview && canSubmitWithConsent" 
          type="button" 
          class="btn btn-primary btn-center upload-btn" 
          :disabled="!canSubmitWithConsent"
          @click="triggerFileInput"
        >
          загрузить изображение
        </button>
        
        <button 
          v-else-if="canSubmitWithConsent" 
          type="button" 
          class="btn btn-primary btn-center" 
          :disabled="!canSubmit || store.sending || !canSubmitWithConsent"
          @click="submit"
        >
          {{ store.sending ? 'Отправка…' : 'отправить' }}
        </button>
      </div>
    </div>

    <!-- 2. Данные отправлены, но ЕЩЁ НЕ ПОДТВЕРЖДЕНЫ -->
    <div v-else-if="!store.isConfirmedToday" class="success-card mt-16 pending-card">
      <div class="success-emoji pending-emoji">⏳</div>
      <h2>Данные на проверке</h2>
      <p class="muted">Шаги отправлены и ожидают подтверждения модератором.</p>
      <p class="timer-text">
        Следующая отправка через: <strong>{{ timeLeft }}</strong>
      </p>
      <button type="button" class="btn btn-secondary btn-center" @click="store.loadSummary">
        Обновить статус
      </button>
    </div>

    <!-- 3. Данные ПОДТВЕРЖДЕНЫ -->
    <div v-else class="success-card mt-16">
      <div class="success-emoji">✓</div>
      <h2>Шаги подтверждены</h2>
      <p class="muted">Спасибо, данные подтверждены сервером.</p>
      <p class="timer-text">
        Следующая отправка через: <strong>{{ timeLeft }}</strong>
      </p>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useStepsStore } from './store'
import { useConsentStore } from '../consent/store'
import ConsentBanner from '../consent/ConsentBanner.vue'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const store = useStepsStore()
const consentStore = useConsentStore()
const toast = useToast()

const MAX_STEPS = 99999

// Состояние формы
const steps = ref(null)
const localConsent = ref(false)
const fileInput = ref(null)
const imagePreview = ref(null)
const selectedFile = ref(null)

// Состояние таймера
const timeLeft = ref('')
let timerInterval = null
let summaryInterval = null // <-- Таймер для опроса сервера

const canSubmitWithConsent = computed(() => consentStore.isGranted)

const canSubmit = computed(() => {
  const n = Number(steps.value)
  return (
    Number.isFinite(n) &&
    n > 0 &&
    n <= MAX_STEPS &&
    localConsent.value &&
    selectedFile.value !== null
  )
})

const progressPercent = computed(() => {
  const p = store.progressPercent
  return Math.max(0, Math.min(100, Number(p) || 0))
})

const hasSummary = computed(() => store.hasSummary)
const loadingSummary = computed(() => store.loadingSummary)
const goal = computed(() => store.goal)
const rank = computed(() => store.rank)
const totalUsers = computed(() => store.totalUsers)
const todaySteps = computed(() => store.todaySteps)
const topPercent = computed(() => Number(store.summary?.TOP_PERCENT) || 0)

const formattedTotal = computed(() => formatNumber(store.totalSteps))
const formattedGoal = computed(() => formatNumber(goal.value))
const formattedToday = computed(() => formatNumber(todaySteps.value))

function formatNumber(n) {
  const v = Number(n) || 0
  return v.toLocaleString('ru-RU')
}

// ─── Таймер до следующего дня ───
function updateTimer() {
  const now = new Date()
  // Вычисляем время до следующей полуночи
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const diffMs = tomorrow - now

  if (diffMs <= 0) {
    timeLeft.value = '00:00:00'
    return
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

  const pad = (n) => String(n).padStart(2, '0')
  timeLeft.value = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// ─── Логика загрузки файла ───
function triggerFileInput() {
  if (!canSubmitWithConsent.value) return
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Базовая валидация размера (например, до 5 МБ)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Файл слишком большой (макс. 5МБ)')
    return
  }

  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  
  // Сбрасываем input, чтобы можно было выбрать тот же файл снова
  event.target.value = ''
}

function removeImage() {
  selectedFile.value = null
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = null
  }
}

// ─── Отправка ───
async function submit() {
  if (!canSubmit.value || store.sending) return
  if (!canSubmitWithConsent.value) return

  const ok = await store.send({
    steps: Math.round(Number(steps.value)),
    images: [selectedFile.value],
    consent: localConsent.value,
  })
  
  if (ok) {
    // store.send() сам вызовет loadSummary() для проверки подтверждения
  } else if (store.error) {
    toast.error(store.error)
  }
}

onMounted(() => {
  setBackground({ url: 'backgrounds/bg_frame.jpg' })
  
  // 1. Первичная загрузка
  store.loadSummary()
  
  // 2. Таймер до конца дня
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
  
  // 3. Опрос сервера каждые 60 секунд (чтобы узнать о подтверждении)
  summaryInterval = setInterval(() => {
    // Опрашиваем только если уже что-то отправлено (незачем спамить сервер, если формы нет)
    if (store.isSubmittedToday) {
      store.loadSummary()
    }
  }, 60000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (summaryInterval) clearInterval(summaryInterval)
  removeImage()
})
</script>

<style scoped>
.steps-home-panel { padding-bottom: 74px; }

.loading { padding: 16px 0; text-align: center; font-size: 14px; }

/* ─── Прогресс-арка ─── */
.arc-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.arc-wrap {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.progress-arc {
  width: 100%;
  height: auto;
  display: block;
}
.progress-arc__fill {
  transition: stroke-dasharray 700ms cubic-bezier(.2,.7,.2,1);
}

.arc-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -35%);
  text-align: center;
  width: 100%;
  pointer-events: none;
}

.arc-value {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0E5505;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.arc-goal {
  font-size: 15px;
  color: #6b7268;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.arc-label {
  font-size: 13px;
  color: #015f01;
  margin-top: 4px;
  font-weight: 600;
  text-transform: lowercase;
}

/* ─── Рейтинг ─── */
.rating-num {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #015f01;
  font-variant-numeric: tabular-nums;
  min-width: 60px;
}

.rating-text {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  text-transform: lowercase;
  color: var(--black);
}
.rating-text p{
  margin-bottom: 8px;
}

/* ─── Форма ─── */
.steps-form {
  margin-top: 24px;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.steps-input {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  padding: 20px 24px;
  outline: none;
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 20px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-transform: lowercase;
  color: var(--black);
  text-align: center;
}
.steps-input::placeholder {
  color: #a3a69a;
  text-align: left;
}
/* Убираем стрелки у number */
.steps-input::-webkit-outer-spin-button,
.steps-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.steps-input { -moz-appearance: textfield; }

.image-preview {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  overflow: hidden;
}

.remove-img {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #FFF;
  color: #000;
  border: 1px solid #000;
  font-size: 10px;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
}

.consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  margin-bottom: 8px;
}
.consent input { 
  margin-top: 2px; 
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
}

.hidden-input {
  display: none;
}

/* Успех, таймер и статусы */
.success-card {
  display: grid;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
  background: #E6F4EA;
  border-radius: var(--radius);
  border: 1px solid #AFE6DD;
  margin-top: 24px;
}
.success-emoji {
  width: 56px; height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 28px;
  display: grid;
  place-items: center;
}
.success-card h2 { margin: 0; font-size: 20px; }
.success-card p { margin: 0 0 8px; font-size: 14px; }

.timer-text {
  font-size: 14px;
  margin-top: 8px;
  color: #21271f;
}

.timer-text strong {
  font-family: ui-monospace, monospace;
  font-size: 16px;
  color: #015f01;
}

/* Карточка на проверке */
.pending-card {
  background: #FFF8EC;
  border-color: #FBE5C6;
}
.pending-emoji {
  background: #F5A623;
}
</style>