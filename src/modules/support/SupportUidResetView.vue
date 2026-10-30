<template>
  <div class="page uid-reset-page">

    <!-- Случай: нет UID (пришёл с /install без ссылки с uid) -->
    <div v-if="!hasUid" class="blocked-card">
      <div class="blocked-icon" aria-hidden="true">🔗</div>
      <h1>Нужен код доступа</h1>
      <p class="muted">
        Откройте приложение по персональной ссылке
        из корпоративного канала Х5, чтобы мы могли
        связать вас с профилем.
      </p>
      <button
        type="button"
        class="btn btn-primary btn-center"
        @click="goBack"
      >
        Понятно
      </button>
    </div>

    <!-- Форма обращения -->
    <template v-else-if="!sent">
      <header class="head text-center">
        <h1 class="title color-text-stroke">написать администратору</h1>
        <p class="subtitle">
          {{ errorText || 'опишите проблему — администратор поможет' }}
        </p>
      </header>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <textarea
            v-model="text"
            :maxlength="MAX_TEXT"
            rows="8"
            placeholder="опишите проблему подробнее…"
          />
          <span class="field-counter muted">{{ text.length }} / {{ MAX_TEXT }}</span>
        </label>

        <!-- Прикрепление файлов (до MAX_IMAGES) -->
        <ImageUploader v-model="images" :max="MAX_IMAGES" />

        <div class="checkbox-group">
          <label
            v-if="showShortcutReason"
            class="checkbox-card"
            :class="{ selected: reasons.includes('shortcut') }"
          >
            <input
              type="checkbox"
              class="checkbox-input"
              :checked="reasons.includes('shortcut')"
              @change="toggleReason('shortcut')"
            />
            <span class="checkbox-mark" aria-hidden="true">
              <AppIcon name="check" :size="14" />
            </span>
            <span class="checkbox-text">у меня проблема с установкой ярлыка</span>
          </label>

          <label
            v-if="showThirdPartyReason"
            class="checkbox-card"
            :class="{ selected: reasons.includes('third_party_browser') }"
          >
            <input
              type="checkbox"
              class="checkbox-input"
              :checked="reasons.includes('third_party_browser')"
              @change="toggleReason('third_party_browser')"
            />
            <span class="checkbox-mark" aria-hidden="true">
              <AppIcon name="check" :size="14" />
            </span>
            <span class="checkbox-text">я переустановил и запустил с нового ярлыка</span>
          </label>
        </div>

        <div v-if="showWarning" class="warning-card">
          <div class="warning-title">⚠ внимание</div>
          <p class="warning-text">
            При отправке данного обращения, предыдущая авторизация на других устройствах будет деактивирована.
          </p>
        </div>

        <!-- Согласие на обработку ПД — если глобально не дано -->
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

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <div class="bottom-action">
          <button
            type="submit"
            class="btn btn-primary btn-center"
            :disabled="!canSubmit || store.sending"
          >
            {{ store.sending ? 'отправка…' : 'отправить' }}
          </button>
        </div>
      </form>
    </template>

    <!-- Успех -->
    <div v-else class="success-card">
      <div class="success-icon" aria-hidden="true">✓</div>
      <h1>обращение принято</h1>
      <p v-if="hadResetIntent" class="muted">
        Заявка №{{ ticketId }} принята. Заявки обрабатываются в период с 10:00 до 18:00 по МСК. Если ваше обращение зарегистрированно в рамках 10:00 - 17:00, просьба вернуться к повторной авторизации через 90 минут после обращения; в противном случае просим вернуться вас к повторной регистрации на следующий день после 12:00 по МСК.
      </p>
      <p v-else class="muted">
        Заявка №{{ ticketId }} принята. Заявки обрабатываются в период с 10:00 до 18:00 по МСК.
      </p>
      <button
        type="button"
        class="btn btn-primary btn-center"
        @click="goBack"
      >
        понятно
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import ImageUploader from '../../components/ImageUploader.vue'
import { useSupportStore } from './store'
import { useAccess } from '../install/useAccess'
import { useInstall } from '../install/useInstall'
import { useConsentStore } from '../consent/store'
import { useAppBackground } from '../core/composables/useAppBackground'

const MAX_TEXT = 1000
const MAX_IMAGES = 5

const route = useRoute()
const router = useRouter()
const store = useSupportStore()
const { setBackground } = useAppBackground()

// isInstalled = запущено в standalone (через ярлык / PWA)
const { isInstalled } = useInstall()
const { hasUid: hasUidAccess } = useAccess()

// Глобальное согласие ПД — как в SupportView
const consentGlob = useConsentStore()

const text = ref('')
const images = ref([])
const consent = ref(consentGlob.isGranted)
const reasons = ref([])
const sent = ref(false)
const errorMessage = ref('')

// ▼ Текст-пояснение над формой. Приходит из RegisteringView через
//   ?errorText=... — НЕ в textarea, пользователь должен сам написать текст.
const errorText = ref('')

const ticketId = ref(null)
const hadResetIntent = ref(false)
const estimatedMinutes = ref(60)

const uid = ref('')
const hasUid = computed(() => !!uid.value)

// Кнопка «Отправить» — только при наличии текста и согласии ПД
const canSubmit = computed(
  () => text.value.trim().length > 0 && consent.value
)

// ── Видимость чекбоксов по способу запуска ─────────────────────
const showShortcutReason = computed(() => !isInstalled.value)
const showThirdPartyReason = computed(() => isInstalled.value)

// Фильтруем выбранные причины по видимым чекбоксам — на случай, если
// пользователь выбрал, а потом способ запуска изменился.
const effectiveReasons = computed(() =>
  reasons.value.filter((r) => {
    if (r === 'shortcut') return showShortcutReason.value
    if (r === 'third_party_browser') return showThirdPartyReason.value
    return true
  })
)

// Предупреждение — ТОЛЬКО для «из стороннего браузера».
const showWarning = computed(
  () => showThirdPartyReason.value && reasons.value.includes('third_party_browser')
)

function toggleConsent() {
  consent.value = !consent.value
}

function toggleReason(key) {
  const idx = reasons.value.indexOf(key)
  if (idx === -1) reasons.value.push(key)
  else reasons.value.splice(idx, 1)
}

function mapError(code, fallback, retryAfterSec) {
  if (code === 'RESET_NOT_APPLICABLE') {
    return 'Не удалось подтвердить, что это ваше устройство. ' +
           'Возможно, профиль уже привязан к другому устройству. ' +
           'Попробуйте войти заново.'
  }
  if (code === 'UID_BLOCKED') {
    return 'Доступ к этому профилю заблокирован администратором. ' +
           'Обратитесь в поддержку по телефону.'
  }
  if (code === 'WAIT_BEFORE_RESET') {
    const sec = Number(retryAfterSec) || 60
    const min = Math.ceil(sec / 60)
    return `Профиль сейчас активен на другом устройстве. ` +
           `Попробуйте запросить сброс через ${min} мин.`
  }
  if (code === 'RATE_LIMITED') {
    return 'Слишком много запросов. Попробуйте снова через час.'
  }
  if (code === 'NETWORK') {
    // code: 'NETWORK' ставится в store.js для ЛЮБОЙ ошибки в catch —
    // включая локальные (например, «фото больше 3 МБ»). Если fallback.message
    // осмысленный (не OFFLINE/TIMEOUT/HTTP xxx) — возвращаем его как есть.
    const msg = String(fallback || '').trim()
    if (msg && msg !== 'OFFLINE' && msg !== 'TIMEOUT' && !/^HTTP\s+\d+/i.test(msg)) {
      return msg
    }
    return 'Нет соединения с интернетом. Проверьте сеть и попробуйте снова.'
  }
  if (code === 'ERROR') {
    return fallback || 'Не удалось отправить. Проверьте данные и попробуйте снова.'
  }
  return fallback || 'Ошибка отправки'
}

async function submit() {
  if (!canSubmit.value || store.sending) return
  errorMessage.value = ''

  const visibleReasons = effectiveReasons.value.slice()

  const result = await store.createResetUidTicket({
    text: text.value,
    images: images.value,
    uid: uid.value,
    reasons: visibleReasons,
    meta: {
      SOURCE: String(route.query.source || 'registering'),
      ORIGINAL_AUTH_ERROR: String(route.query.auth_error || '') || null,
      IS_STANDALONE: isInstalled.value,
      CONSENT_GRANTED: consent.value,
    },
  })

  if (result.ok) {
    ticketId.value = result.ticketId
    hadResetIntent.value = visibleReasons.length > 0
    estimatedMinutes.value = result.estimatedMinutes || 60
    sent.value = true
    text.value = ''
    images.value = []
    consent.value = false
    reasons.value = []
    return
  }

  errorMessage.value = mapError(result.error, result.message, result.retryAfterSec)
}

function goBack() {
  router.back()
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.reset()

  // UID может быть в query (пришёл из RegisteringView) или в localStorage
  const rawUid = String(route.query.uid || (hasUidAccess.value ? '' : '') || '').trim() ||
                 (() => {
                   try { return String(localStorage.getItem('auth.uid') || '') } catch { return '' }
                 })()

  uid.value = (rawUid && rawUid !== 'неизвестно') ? rawUid : ''

  // ▼ errorText — в subtitle над формой, НЕ в textarea.
  errorText.value = String(route.query.errorText || '').trim()
})
</script>

<style scoped>
.uid-reset-page {
  position: relative;
  display: grid;
  gap: 24px;
  align-items: start;
  align-content: start;
}

.head {
  display: grid;
  gap: 8px;
}
.head .title {
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
  text-transform: lowercase;
}
.head .subtitle {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  color: var(--txt-black-dark-green);
  text-wrap: balance;
}

.form {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 6px;
  position: relative;
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

/* ── Чекбоксы ── */
.checkbox-group {
  display: grid;
  gap: 10px;
}
.checkbox-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color var(--t-fast), box-shadow var(--t-fast), background var(--t-fast);
}
.checkbox-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-1);
}
.checkbox-card.selected {
  border-color: #015f01;
  box-shadow: 0 0 0 1px var(--accent-soft);
}
.checkbox-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.checkbox-mark {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #d1efea;
  color: transparent;
  display: grid;
  place-items: center;
  transition: background var(--t-base), color var(--t-base);
}
.checkbox-card.selected .checkbox-mark {
  background: #015f01;
  color: #D3FF4F;
}
.checkbox-text {
  font-family: var(--font-family);
  font-size: 14.5px;
  line-height: 1.35;
  color: #21271f;
  font-weight: 500;
}
.checkbox-card.selected .checkbox-text {
  color: #015f01;
  font-weight: 600;
}

/* ── Warning card ── */
.warning-card {
  padding: 14px 16px;
  background: #FFF8EC;
  border: 1px solid #FBE5C6;
  border-radius: var(--radius);
}
.warning-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 14px;
  color: #7a4b00;
  margin-bottom: 6px;
}
.warning-text {
  margin: 0;
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 13.5px;
  line-height: 1.4;
  color: #7a4b00;
  text-wrap: balance;
}

/* ── Согласие на ПД (как в SupportView) ── */
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

/* ── Blocked (нет UID) ── */
.blocked-card {
  display: grid;
  gap: 14px;
  justify-items: center;
  text-align: center;
  padding: 32px 20px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.blocked-icon {
  font-size: 48px;
  line-height: 1;
}
.blocked-card h1 {
  font-size: 22px;
  margin: 0;
}
.blocked-card .muted {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

/* ── Success ── */
.success-card {
  display: grid;
  gap: 14px;
  justify-items: center;
  text-align: center;
  padding: 32px 20px;
  background: #E6F4EA;
  border: 1px solid #AFE6DD;
  border-radius: var(--radius);
}
.success-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 28px;
  display: grid;
  place-items: center;
}
.success-card h1 {
  font-size: 20px;
  margin: 0;
}
.success-card .muted {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  max-width: 480px;
}
.success-card .btn {
  max-width: 320px;
  width: 100%;
}

.error {
  margin: 0;
  font-size: 13px;
  color: #B91D0C;
  padding: 10px 14px;
  background: #FDECEA;
  border-radius: 10px;
  border: 1px solid #FCD9D6;
  line-height: 1.4;
}

@media (max-width: 420px) {
  .consent-text { font-size: 14px; }
}
</style>