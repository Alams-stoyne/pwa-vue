<template>
  <div class="page steps-page">

    <transition name="fade" appear>
      <div v-if="sent" class="success-card">
        <div class="success-emoji">✓</div>
        <h2>Шаги отправлены</h2>
        <p class="muted">Спасибо, данные отправлены на проверку.</p>
        <router-link :to="{ path: '/dayTask', query: { tab: 'steps' } }" class="btn-primary success-btn">
          К прогрессу
        </router-link>
        <button type="button" class="btn-secondary success-btn" @click="reset">
          Внести ещё раз
        </button>
      </div>

      <form v-else class="form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">Количество шагов</span>
          <input
            v-model.number="steps"
            type="number"
            inputmode="numeric"
            :min="0"
            :max="MAX_STEPS"
            step="1"
            placeholder="Например, 8500"
            class="steps-input"
          />
          <span class="field-counter muted">
            {{ formattedSteps }} / {{ MAX_STEPS.toLocaleString('ru-RU') }}
          </span>
        </label>

        <div class="field">
          <span class="field-label">Скриншоты</span>
          <ImageUploader v-model="images" :max="MAX_IMAGES" />
        </div>

        <label class="consent">
          <input type="checkbox" v-model="localConsent" />
          <span>Согласен на обработку персональных данных</span>
        </label>

        <!-- Предупреждение о необходимости глобального согласия ПД -->
        <div v-if="!canSubmitWithConsent" class="consent-warning">
          Для отправки шагов нужно согласие на обработку персональных данных.
          <router-link to="/onboarding/consent">Дать согласие</router-link>
        </div>

        <p v-if="store.error" class="error">{{ store.error }}</p>

        <div class="bottom-action">
          <button
            type="submit"
            class="btn btn-primary btn-center"
            :disabled="!canSubmit || store.sending || !canSubmitWithConsent"
          >
            {{ store.sending ? 'Отправка…' : 'Отправить' }}
          </button>          
        </div>
      </form>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import HelpIcon from '../../components/HelpIcon.vue'
import ImageUploader from '../../components/ImageUploader.vue'
import { useStepsStore } from './store'
import { useConsentStore } from '../consent/store'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()

const MAX_STEPS = 99999
const MAX_IMAGES = 3

const store = useStepsStore()
const consentStore = useConsentStore()

const steps = ref(null)
const images = ref([])
const localConsent = ref(false)
const sent = ref(false)

/**
 * Глобальное согласие ПД — без него отправка заблокирована,
 * даже если пользователь поставил локальный чекбокс в форме.
 */
const canSubmitWithConsent = computed(() => consentStore.isGranted)

const formattedSteps = computed(() => {
  const n = Number(steps.value)
  if (!Number.isFinite(n) || n < 0) return '0'
  return Math.round(n).toLocaleString('ru-RU')
})

const canSubmit = computed(() => {
  const n = Number(steps.value)
  return (
    Number.isFinite(n) &&
    n >= 0 &&
    n <= MAX_STEPS &&
    localConsent.value
  )
})

async function submit() {
  if (!canSubmit.value || store.sending) return
  if (!canSubmitWithConsent.value) {
    // Защита от обхода disabled
    return
  }
  const ok = await store.send({
    steps: Math.round(Number(steps.value)),
    images: images.value,
    consent: localConsent.value,
  })
  if (ok) sent.value = true
}

function reset() {
  steps.value = null
  images.value = []
  localConsent.value = false
  sent.value = false
  store.reset()
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.reset()
})
</script>

<style scoped>
.steps-page { padding-bottom: 32px; }

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.head h1 { margin: 0; font-size: 22px; }

.form { display: grid; gap: 18px; }

.field { display: grid; gap: 6px; }
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #21271f;
}

.steps-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 22px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  text-align: center;
  background: #fff;
  color: #21271f;
  outline: none;
  transition: border-color .15s;
  letter-spacing: 0.02em;
}
.steps-input:focus { border-color: var(--accent); }
.steps-input::-webkit-outer-spin-button,
.steps-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.steps-input { -moz-appearance: textfield; }

.field-counter {
  font-size: 12px;
  text-align: right;
}

.consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
}
.consent input { margin-top: 3px; accent-color: var(--accent); }

/* ─── Предупреждение о глобальном согласии ─── */
.consent-warning {
  padding: 12px 14px;
  border-radius: 10px;
  background: #FFF8EC;
  border: 1px solid #FBE5C6;
  font-size: 13px;
  line-height: 1.5;
  color: #21271f;
}
.consent-warning a {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.error {
  margin: 0;
  font-size: 13px;
  color: #B91D0C;
  padding: 8px 12px;
  background: #FDECEA;
  border-radius: 8px;
}

.submit-btn {
  width: 100%;
  max-width: 358px;
  margin: 0 auto;
}

/* ─── Успех ─── */
.success-card {
  display: grid;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
  background: #E6F4EA;
  border-radius: var(--radius);
  border: 1px solid #AFE6DD;
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
.success-btn {
  width: 100%;
  max-width: 240px;
  margin: 0 auto;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44px;
}

@media (max-width: 420px) {
  .head h1 { font-size: 20px; }
  .steps-input { font-size: 20px; }
}
</style>