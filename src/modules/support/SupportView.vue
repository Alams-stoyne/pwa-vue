<template>
  <div class="page support-page">
    <transition name="fade" appear>
      <form v-if="!sent" class="form" @submit.prevent="submit">

        <label class="field">
          <textarea
            v-model="text"
            :maxlength="MAX_TEXT"
            rows="12"
            placeholder="опишите проблему подробнее…"
          />
          <span class="field-counter muted">{{ text.length }} / {{ MAX_TEXT }}</span>
        </label>
        <ImageUploader v-model="images" :max="MAX_IMAGES" />
        
        <!-- Ссылка на историю обращений (только для авторизованных) -->
        <div class="tickets-link-wrapper" v-if="isAuthed">
          <router-link to="/support/tickets" class="btn-badge">
            Мои обращения
          </router-link>
        </div>

        <div
          class="consent-card"
          :class="{ selected: consent }"
          role="checkbox"
          :aria-checked="consent"
          tabindex="0"
          @click="toggleConsent"
          @keydown.space.prevent="toggleConsent"
          @keydown.enter.prevent="toggleConsent"
          v-if="!consentGlob.isGranted"
        >
          <span class="consent-check" aria-hidden="true">
            <AppIcon name="check" :size="16" />
          </span>
          <span class="consent-text">
            согласен на обработку персональных данных
          </span>
        </div>

        <p v-if="store.error" class="error">{{ store.error }}</p>

        <div class="bottom-action">
          <button
            type="submit"
            class="btn btn-primary btn-center"
            :disabled="!canSubmit || store.sending"
          >
            {{ store.sending ? 'Отправка…' : 'Отправить' }}
          </button>
        </div>
      </form>

      <div v-else class="bottom-action">
        <button
          class="btn btn-primary btn-center"
          @click="goBack"
        >
          Вернуться
        </button>
      </div>
    </transition>

    <Mascot
      ref="mascot"
      body-src="/maskot/body_support.png"
      bubble-text="Вам нужна помощь?"
      :typewriter-speed="40"
      @bubble-complete="onBubbleDone"
      class="mascot_support"
      :class="sent ? 'sent' : ''"
      @click="goBack()"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConsentStore } from '../consent/store'
import Mascot from '../../components/Mascot.vue'
import AppIcon from '../../components/AppIcon.vue'
import ImageUploader from '../../components/ImageUploader.vue'
import { useSupportStore } from './store'
import { useAuthStore } from '../auth/store'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()
const consentGlob = useConsentStore()

const MAX_TEXT = 1000
const MAX_IMAGES = 5

const store = useSupportStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const isAuthed = computed(() => auth.isAuthed)

const text = ref('')
const images = ref([])
const consent = ref(consentGlob.isGranted)
const sent = ref(false)

const canSubmit = computed(() =>
  text.value.trim().length > 0 && consent.value
)

function toggleConsent() {
  consent.value = !consent.value
}

async function submit() {
  if (!canSubmit.value || store.sending) return
  mascot.value?.showBubble('');
  mascot.value.showArrows()
  
  let ok = false

  if (isAuthed.value) {
    ok = await store.send({
      text: text.value,
      subject: 'Обращение в поддержку',
      images: images.value,
      consent: consent.value,
    })
  } else {
    ok = await store.createGuestTicket({
      text: text.value,
      images: images.value,
      uid: route.query.uid ? String(route.query.uid) : undefined,
      authError: route.query.auth_error ? String(route.query.auth_error) : undefined,
    })
  }

  if (ok) {
    sent.value = true
    text.value = ''
    images.value = []
    consent.value = false
    setTimeout(() => {
      mascot.value?.showBubble('администратор скоро свяжется с вами');
    }, 1500)
  }
}

function goBack() {
  router.back()
}

function onBubbleDone() {
  if(sent.value){
    mascot.value?.showCheck()
  }
}

const mascot = ref(null)

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.reset()
  
  if (route.query.text) {
    text.value = String(route.query.text)
  }
})
</script>

<style scoped>
/* Ваши стили остаются без изменений */
.support-page {
  position: relative;
}

.mascot_support {
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 1;
  transition: all 500ms linear;
}
.mascot_support.sent{
  bottom: 50%;
  transform: translateY(50%);
}

.form {
  display: grid;
  gap: 18px;
  position: relative;
  z-index: 5;
}

.tickets-link-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-bottom: -8px;
}
.tickets-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.2s;
}
.tickets-link:hover {
  opacity: 0.7;
}

.field {
  display: grid;
  gap: 6px;
  position: relative;
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #21271f;
}

.field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
  color: #21271f;
  outline: none;
  min-height: 160px;
  resize: none;
  transition: border-color .15s;
}
.field textarea:focus { border-color: var(--accent); }

.field-counter {
  font-size: 12px;
  position: absolute;
  bottom: 6px;
  right: 6px;
}

.consent-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 16px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  outline: none;
  transition: transform var(--t-fast), border-color var(--t-fast), box-shadow var(--t-fast), background var(--t-fast);
}
.consent-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-1);
}
.consent-card:focus-visible {
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.consent-card.selected {
  border-color: #015f01;
  box-shadow: 0 0 0 1px var(--accent-soft);
}

.consent-check {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #d1efea;
  color: #fff;
  display: grid;
  place-items: center;
  transition: background var(--t-base), color var(--t-base);
}
.consent-card.selected .consent-check {
  background: #015f01;
  color: #D3FF4F;
}

.consent-text {
  font-family: var(--font-family);
  font-size: 14.5px;
  line-height: 1.35;
  color: #21271f;
  font-weight: 500;
  transition: color var(--t-fast);
}
.consent-card.selected .consent-text {
  color: #015f01;
  font-weight: 600;
}

.error {
  margin: 0;
  font-size: 13px;
  color: #B91D0C;
  padding: 8px 12px;
  background: #FDECEA;
  border-radius: 8px;
}

@media (max-width: 420px) {
  .consent-text { font-size: 14px; }
}
</style>