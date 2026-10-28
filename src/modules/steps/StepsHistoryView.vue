<template>
  <div class="page steps-history-page">

    <header class="head">
      <p v-if="deadlineLabel" class="head-sub muted">шаги принимаются до {{ deadlineLabel }}</p>
    </header>

    <!-- Внутренний скролл — карточки не наезжают на кнопку -->
    <div class="history-scroll">

      <div v-if="store.loadingHistory && !store.hasHistory" class="state muted">
        загружаем историю…
      </div>

      <div v-else-if="store.historyError && !store.hasHistory" class="state error">
        {{ store.historyError }}
        <button type="button" class="btn btn-secondary btn-center mt-12" @click="reload">
          повторить
        </button>
      </div>

      <div v-else-if="!store.hasHistory" class="state muted">
        история пока пуста
      </div>

      <div v-else class="days-list">
        <article
          v-for="day in store.days"
          :key="day.DATE"
          class="day-card"
          :class="`is-${day.STATUS}`"
        >
          <div class="day-head">
            <div class="day-date">{{ formatDay(day.DATE) }}</div>
            <div class="day-status">
              <span class="day-status-icon" aria-hidden="true">{{ statusIcon(day.STATUS) }}</span>
              <span class="day-status-label">{{ statusLabel(day.STATUS) }}</span>
            </div>
          </div>

          <div v-if="day.STEPS != null" class="day-steps">
            {{ formatNum(day.STEPS) }} шагов
          </div>

          <div v-if="day.STATUS === 'rejected' && day.REJECT_REASON" class="day-reject">
            {{ day.REJECT_REASON }}
          </div>

          <div v-if="day.STATUS === 'approved' && day.REWARD_POINTS > 0" class="day-reward">
            +{{ day.REWARD_POINTS }} <span class="apple"><AppIcon name="apple" :size="16" /></span>
          </div>

          <div v-if="canLoadDay(day)" class="day-actions">
            <button
              type="button"
              class="btn btn-primary btn-center btn-small"
              @click="openUpload(day)"
            >
              {{ day.STATUS === 'rejected' ? 'загрузить заново' : 'загрузить' }}
            </button>
          </div>
        </article>
      </div>
    </div>
    <!-- Модалка загрузки -->
    <AppModal
      v-model="modalOpen"
      :title="currentDay ? `Шаги за ${formatDay(currentDay.DATE)}` : 'Загрузка шагов'"
    >
      <div v-if="currentDay" class="upload-form d-grid g12">
        <p v-if="!canSubmitWithConsent" class="upload-warning">
          Для отправки шагов нужно согласие на обработку персональных данных.
          <router-link to="/onboarding/consent" @click="modalOpen = false">дать согласие</router-link>
        </p>

        <template v-else>
          <label class="field">
            <span class="field-label">количество шагов</span>

            <div class="input-wrapper">
              <input
                v-model.number="uploadSteps"
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

            <span class="field-counter muted">
              {{ formattedUploadSteps }} / {{ formatNum(MAX_STEPS) }}
            </span>
          </label>

          <input
            type="file"
            ref="fileInput"
            accept="image/*"
            class="hidden-input"
            @change="onFileChange"
          />

          <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>

          <button
            v-if="!imagePreview"
            type="button"
            class="btn btn-primary btn-center"
            @click="triggerFileInput"
          >
            загрузить изображение
          </button>

          <button
            v-else
            type="button"
            class="btn btn-primary btn-center"
            :disabled="!canUpload || store.sending"
            @click="submitUpload"
          >
            {{ store.sending ? 'Отправка…' : 'Отправить' }}
          </button>
        </template>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStepsStore } from './store'
import { useConsentStore } from '../consent/store'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'
import AppIcon from '../../components/AppIcon.vue'
import AppModal from '../../components/AppModal.vue'
import StepsLeaderboardWidget from './StepsLeaderboardWidget.vue'

const MAX_STEPS = 50000

const store = useStepsStore()
const consentStore = useConsentStore()
const toast = useToast()
const { setBackground } = useAppBackground()

const modalOpen = ref(false)
const currentDay = ref(null)

const uploadSteps = ref(null)
const uploadError = ref('')
const selectedFile = ref(null)
const imagePreview = ref(null)
const fileInput = ref(null)

const canSubmitWithConsent = computed(() => consentStore.isGranted)

const canUpload = computed(() => {
  const n = Number(uploadSteps.value)
  return (
    Number.isFinite(n) &&
    n >= 0 &&
    n <= MAX_STEPS &&
    selectedFile.value !== null &&
    canSubmitWithConsent.value
  )
})

const formattedUploadSteps = computed(() => {
  const n = Number(uploadSteps.value)
  if (!Number.isFinite(n) || n < 0) return '0'
  return Math.round(n).toLocaleString('ru-RU')
})

const deadlineLabel = computed(() => {
  const iso = store.historyPeriod?.DEADLINE
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const months = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря']
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())} МСК`
})

const MONTHS_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function formatDay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || ''
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_FULL[m - 1]}`
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('ru-RU')
}

function statusIcon(status) {
  if (status === 'approved') return '✓'
  if (status === 'pending') return '⏳'
  if (status === 'rejected') return '✕'
  if (status === 'expired') return '⏱'
  if (status === 'future') return '·'
  return '—'
}

function statusLabel(status) {
  if (status === 'approved') return 'подтверждено'
  if (status === 'pending') return 'на проверке'
  if (status === 'rejected') return 'отклонено'
  if (status === 'expired') return 'время истекло'
  if (status === 'future') return 'ещё не прошёл'
  return 'не отправлено'
}

function canLoadDay(day) {
  if (!day) return false
  return day.STATUS === 'not_sent' || day.STATUS === 'rejected'
}

function openUpload(day) {
  currentDay.value = day
  uploadSteps.value = null
  uploadError.value = ''
  selectedFile.value = null
  removeImage()
  modalOpen.value = true
}

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

async function submitUpload() {
  if (!canUpload.value || store.sending || !currentDay.value) return
  uploadError.value = ''

  const result = await store.send({
    steps: Math.round(Number(uploadSteps.value)),
    images: [selectedFile.value],
    consent: canSubmitWithConsent.value,
    stepDate: currentDay.value.DATE,
  })

  if (result.ok) {
    toast.success('шаги отправлены на проверку')
    modalOpen.value = false
    await Promise.all([
      store.loadHistory({ force: true }),
      store.loadSummary({ force: true }),
    ])
    return
  }

  if (result.alreadySent) {
    toast.info(result.message || 'за этот день шаги уже отправлены')
    modalOpen.value = false
    await store.loadHistory({ force: true })
    return
  }

  uploadError.value = result.message || 'не удалось отправить'
}

async function reload() {
  await store.loadHistory({ force: true })
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  store.loadHistory().catch(() => {})
}

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  await store.loadHistory()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  removeImage()
})
</script>

<style scoped>
/* ── Страница: header + scroll внутри ── */
.steps-history-page {
  position: relative;

  /* Явно переопределяем padding-top — страховка от «grid съел padding». */
  padding-top: var(--top-zone, 74px);
  padding-bottom: 20px;

  height: 100vh;
  height: 100dvh;
  overflow: hidden;             /* сама страница не скроллится */

  display: grid;
  grid-template-rows: auto 1fr; /* head = auto, history-scroll = остаток */
  gap: 16px;
}

.head {
  display: grid;
  gap: 8px;
  flex-shrink: 0;
}
.head-title {
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 32px;
  line-height: 96%;
  text-transform: lowercase;
  margin: 0;
}
.head-sub {
  margin: 0;
  font-family: var(--font-family);
  font-size: 13px;
  line-height: 1.4;
  text-transform: lowercase;
}

/* ── Внутренний скролл: карточки не выходят под кнопку ── */
.history-scroll {
  position: relative;
  min-height: 0;                /* критично для 1fr + overflow */
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  gap: 12px;
  align-content: start;
  padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
  scrollbar-width: none;
}
.history-scroll::-webkit-scrollbar { display: none; }

.state {
  padding: 24px 16px;
  text-align: center;
  font-size: 14px;
}
.state.error {
  color: #B91D0C;
}
.mt-12 { margin-top: 12px; }

/* ── Список дней ── */
.days-list {
  display: grid;
  gap: 12px;
}

.day-card {
  position: relative;
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff;
  border: 1.5px solid var(--border);
  font-family: var(--font-family);
}
.day-card.is-approved {
  border-color: #c3eb91;
  background: var(--green-light);
}
.day-card.is-pending {
  border-color: var(--orange-light);
  background: #fef8ec;
}
.day-card.is-rejected {
  border-color: #FCD9D6;
  background: #FFF1F0;
}
.day-card.is-expired,
.day-card.is-future {
  opacity: 0.65;
}

.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.day-date {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 16px;
  line-height: 120%;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
}

.day-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--txt-black-dark-green);
}
.day-status-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
}
.is-approved .day-status-icon { background: var(--accent); color: #D3FF4F; }
.is-pending  .day-status-icon { background: var(--txt-brand-limon); color: #21271f; }
.is-rejected .day-status-icon { background: #B91D0C; color: #fff; }
.is-expired  .day-status-icon { background: #C7D7CC; color: #fff; }
.is-future   .day-status-icon { background: #E8E8E8; color: #8a8a8a; }
.is-not_sent .day-status-icon { background: #E8E8E8; color: #8a8a8a; }

.day-steps {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 15px;
  line-height: 120%;
  color: var(--txt-dark-green);
}

.day-reject {
  font-family: var(--font-family);
  font-size: 13px;
  line-height: 1.4;
  color: #7a1710;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
}

.day-reward {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-family);
  font-size: 13px;
  font-weight: 600;
  color: var(--txt-dark-green);
}
.day-reward .apple svg { color: transparent; }

.day-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}
.btn-small {
  padding: 10px 24px 12px;
  font-size: 16px;
  box-shadow: 0 3px 0 0 var(--txt-green-dsrk);
}

/* ── Модалка ── */
.upload-form {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}
.field-label {
  font-family: var(--font-family);
  font-size: 13px;
  font-weight: 500;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
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
  background: #fff;
  border: 1px solid var(--border);
  transition: border-color .15s;
}
.steps-input:focus { border-color: var(--accent); }
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

.field-counter {
  font-size: 12px;
  text-align: right;
}

.hidden-input { display: none; }

.upload-warning {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: #FFF8EC;
  border: 1px solid #FBE5C6;
  font-size: 13px;
  line-height: 1.5;
  color: #21271f;
}
.upload-warning a {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
}

.upload-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: #FDECEA;
  border: 1px solid #FCD9D6;
  font-size: 13px;
  color: #B91D0C;
  line-height: 1.4;
}
</style>