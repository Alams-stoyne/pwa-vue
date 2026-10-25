<template>
  <div class="steps-home-panel">
    <p v-if="loadingSummary && !hasSummary" class="muted loading">
      загружаем прогресс…
    </p>
    <div class="rating-block">
      <div class="rating-text">
        <p>Каждый день загружай шаги за предыдущий день.<br> Укажи количество и приложи скриншот из приложения-шагомера в разделе рефлексии. </p>
        <p v-if="periodText">Учитываем шаги {{ periodText }}.</p>
        <p v-else>Учитываем шаги с 26 октября по 1 ноября.</p>
        <p v-if="daysLeftText" class="days-left">{{ daysLeftText }}</p>
        <p>Крайний срок загрузки: 2 ноября, 12:00 МСК.</p>
      </div>
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
            <div v-if="totalDays > 0" class="arc-days">
              {{ confirmedDays }} из {{ totalDays }} дн.
            </div>
          </div>
          <div class="rating color-text-stroke" v-if="rank > 0">№ {{ formattedRank }}</div>
        </div>
      </section>
      <div class="rating-text">
        <template v-if="totalUsers > 0">
          <div class="rating-title">твой путь в шагах</div>
          <p>Здесь результаты участников и твоё место среди всех пользователей. Рейтинг обновляется раз в сутки и остаётся предварительным до проверки подтверждений. Итоги марафона шагов будут опубликованы в Сфере 3 ноября.</p>
        </template>
        <template v-else>
          Пока результатов нет. Добавь шаги за вчера и скриншот из шагомера. Рейтинг обновляется раз в сутки, твоё место появится после обновления.
        </template>
      </div>
    </div>
    <!-- 1. Блок отправки шагов -->
    <div v-if="!store.isSubmittedToday" class="steps-form d-grid g12">
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
        <div v-if="imagePreview" class="image-preview">
          <img :src="imagePreview" alt="Скриншот" />
          <button type="button" class="remove-img" @click="removeImage">✕</button>
        </div>
      </div>

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
    <!-- 2. Отправлено, ждёт подтверждения -->
    <div v-else-if="!store.isConfirmedToday" class="result-card pending">
      <div class="ico">
        <AppIcon name="fading-clock" :size="24" />
      </div>
      <div class="info">
        <div class="result-text text-center">данные на проверке</div>
        <div class="timer-text">следующая отправка через: <span>{{ timeLeft }}</span></div>
      </div>
      <div class="bottom-action d-grid g12">
        <router-link to="/steps/rules" class="btn btn-secondary btn-center">правила</router-link>
        <button type="button" class="btn btn-primary btn-center" @click="refreshStatus">Обновить статус</button>
      </div>
    </div>
    <!-- 3. Подтверждено -->
    <div v-else class="result-card success">
      <div class="ico">
        <AppIcon name="check" :size="24" />
      </div>
      <div class="info">
        <div class="result-text text-center">шаги подтверждены</div>
        <div class="timer-text">следующая отправка через: <span>{{ timeLeft }}</span></div>
      </div>
      <div class="bottom-action">
        <router-link to="/steps/rules" class="btn btn-secondary btn-center">правила</router-link>
      </div>
    </div>

    <StepsLeaderboardWidget />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStepsStore } from './store'
import { useConsentStore } from '../consent/store'
import ConsentBanner from '../consent/ConsentBanner.vue'
import { useToast } from '../core/composables/useToast'
import AppIcon from '../../components/AppIcon.vue'
import StepsLeaderboardWidget from './StepsLeaderboardWidget.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const store = useStepsStore()
const consentStore = useConsentStore()
const toast = useToast()

const MAX_STEPS = 30000

const steps = ref(null)
const fileInput = ref(null)
const imagePreview = ref(null)
const selectedFile = ref(null)

const timeLeft = ref('')
let timerInterval = null
let summaryInterval = null

const canSubmitWithConsent = computed(() => consentStore.isGranted)
const localConsent = computed(() => consentStore.isGranted)

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

const confirmedDays = computed(() => store.confirmedDays)
const totalDays = computed(() => store.totalDays)

const hasSummary = computed(() => store.hasSummary)
const loadingSummary = computed(() => store.loadingSummary)
const rank = computed(() => store.rank)
const totalUsers = computed(() => store.totalUsers)

const formattedTotal = computed(() => formatNumber(store.totalSteps))
const formattedRank = computed(() => formatNumber(store.rank))

// ── Период (PLANNED_*) ───────────────────────────────────────
const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function formatPeriodText(fromIso, toIso) {
  if (!fromIso || !toIso) return ''
  const dFrom = new Date(fromIso)
  const dTo = new Date(toIso)
  if (!Number.isFinite(dFrom.getTime()) || !Number.isFinite(dTo.getTime())) return ''

  const dayFrom = dFrom.getDate()
  const dayTo = dTo.getDate()
  const monFrom = dFrom.getMonth()
  const monTo = dTo.getMonth()
  const yearFrom = dFrom.getFullYear()
  const yearTo = dTo.getFullYear()

  if (yearFrom !== yearTo) {
    return `с ${dayFrom} ${MONTHS_RU[monFrom]} ${yearFrom} по ${dayTo} ${MONTHS_RU[monTo]} ${yearTo}`
  }
  if (monFrom === monTo) {
    return `с ${dayFrom} по ${dayTo} ${MONTHS_RU[monTo]}`
  }
  return `с ${dayFrom} ${MONTHS_RU[monFrom]} по ${dayTo} ${MONTHS_RU[monTo]}`
}

const periodText = computed(() => {
  const p = store.plannedPeriod
  if (!p) return ''
  return formatPeriodText(p.FROM, p.TO)
})

const daysLeftText = computed(() => {
  const n = store.daysLeft
  if (n == null) return ''
  if (n <= 0) return 'Челлендж завершён.'
  if (n === 1) return 'Остался 1 день.'
  if (n >= 2 && n <= 4) return `Осталось ${n} дня.`
  return `Осталось ${n} дней.`
})

function formatNumber(n) {
  const v = Number(n) || 0
  return v.toLocaleString('ru-RU')
}

// ─── Таймер до следующего дня ───
function updateTimer() {
  const now = new Date()
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

// ─── Загрузка файла ───
function triggerFileInput() {
  if (!canSubmitWithConsent.value) return
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.error('файл слишком большой (макс. 5МБ)')
    return
  }
  selectedFile.value = file
  imagePreview.value = URL.createObjectURL(file)
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
    // store.send() сам вызвал loadSummary({force: true})
  } else if (store.error) {
    // error уже в store.error
  }
}

function refreshStatus() {
  store.loadSummary({ force: true })
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  if (store.isSubmittedToday && !store.isConfirmedToday) {
    store.loadSummary({ force: true })
  }
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })

  store.loadSummary()

  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)

  summaryInterval = setInterval(() => {
    if (store.isSubmittedToday && !store.isConfirmedToday) {
      store.loadSummary({ force: true })
    }
  }, 3 * 60 * 1000)

  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (summaryInterval) clearInterval(summaryInterval)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  removeImage()
})
</script>

<style scoped>
.steps-home-panel {
  padding-bottom: 74px;
  overflow: hidden;
  max-height: calc(100dvh - 235px);
  overflow-y: auto;
  display: grid;
  gap: 32px;
  scrollbar-width: none;
}
.steps-home-panel::-webkit-scrollbar { display: none; }

.loading { padding: 16px 0; text-align: center; font-size: 14px; }

/* ─── Прогресс-арка ─── */
.arc-block {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 34px;
  line-height: 150%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-dark-green);
}

.arc-days {
  margin-top: 2px;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 13px;
  line-height: 120%;
  color: var(--txt-black-dark-green);
  opacity: .85;
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
.rating-block {
  position: relative;
  display: grid;
}
.rating {
  position: absolute;
  bottom: 32px;
  text-align: center;
  width: 100%;
  font-size: 28px;
  line-height: 150%;
  text-transform: lowercase;
  text-wrap: balance;
}

.rating-text {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  color: var(--black);
}
.rating-text p{ margin-bottom: 8px; }
.rating-text .days-left {
  color: var(--txt-dark-green);
  font-weight: 500;
  text-transform: lowercase;  
}
.rating-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 20px;
  line-height: 87%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}

/* ─── Форма ─── */
.steps-form { margin-top: 24px; }

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

.hidden-input { display: none; }

.result-card {
  position: relative;
  display: grid;
  justify-content: center;
  justify-items: center;
  border-radius: 14px;
  padding: 16px;
  gap: 16px;
}

.result-card .ico {
  width: 36px;
  display: flex;
  position: relative;
  height: 36px;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  border-radius: 100%;
}
.result-card .info {
  position: relative;
  display: grid;
  gap: 4px;
}

.result-card.success{
  border: 1px solid #c3eb91;
  background: var(--green-light);
}
.result-card.success .ico{
  background: var(--txt-dark-green);
  color: var(--txt-brand-limon);
}
.result-card.pending{
  background: #fef8ec;
  border: 1px solid var(--orange-light);
}
.result-card.pending .ico{
  background: var(--txt-brand-limon);
}

.result-text {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  line-height: 120%;
  text-align: center;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
}
.timer-text {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  text-align: center;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
}
.timer-text span {
  font-weight: 500;
  color: var(--txt-dark-green);
}
</style>