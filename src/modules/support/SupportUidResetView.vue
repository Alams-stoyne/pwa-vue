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
          опишите проблему с доступом — администратор поможет
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

        <div class="checkbox-group">
          <label
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
            <span class="checkbox-text">У меня проблема с установкой ярлыка</span>
          </label>

          <label
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
            <span class="checkbox-text">Я установил ярлык из стороннего браузера</span>
          </label>
        </div>

        <div v-if="reasons.length > 0" class="warning-card">
          <div class="warning-title">⚠ Внимание</div>
          <p class="warning-text">
            При выборе одного из пунктов предыдущая авторизация
            в нашем приложении на других устройствах будет деактивирована.
          </p>
        </div>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

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
    </template>

    <!-- Успех -->
    <div v-else class="success-card">
      <div class="success-icon" aria-hidden="true">✓</div>
      <h1>Обращение принято</h1>

      <p v-if="hadResetIntent" class="muted">
        Заявка №{{ ticketId }} принята.
        Сброс привязки выполнит администратор — обычно до
        {{ estimatedMinutes }} минут. Мы уведомим вас,
        когда это произойдёт.
      </p>
      <p v-else class="muted">
        Заявка №{{ ticketId }} принята.
        Администратор скоро свяжется с вами.
      </p>

      <button
        type="button"
        class="btn btn-primary btn-center"
        @click="goBack"
      >
        Понятно
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import { useSupportStore } from './store'
import { readUid } from '../install/useAccess'
import { useAppBackground } from '../core/composables/useAppBackground'

const MAX_TEXT = 1000

const route = useRoute()
const router = useRouter()
const store = useSupportStore()
const { setBackground } = useAppBackground()

const text = ref('')
const reasons = ref([])
const sent = ref(false)
const errorMessage = ref('')

const ticketId = ref(null)
const hadResetIntent = ref(false)
const estimatedMinutes = ref(60)

const uid = ref('')
const hasUid = computed(() => !!uid.value)
const canSubmit = computed(() => text.value.trim().length > 0)

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
  if (code === 'ERROR') {
    return fallback || 'Не удалось отправить. Проверьте данные и попробуйте снова.'
  }
  if (code === 'NETWORK') {
    return 'Нет соединения с интернетом. Проверьте сеть и попробуйте снова.'
  }
  return fallback || 'Ошибка отправки'
}

async function submit() {
  if (!canSubmit.value || store.sending) return
  errorMessage.value = ''

  const result = await store.createResetUidTicket({
    text: text.value,
    images: [],
    uid: uid.value,
    reasons: reasons.value,
    meta: {
      SOURCE: String(route.query.source || 'registering'),
      ORIGINAL_AUTH_ERROR: String(route.query.auth_error || '') || null,
    },
  })

  if (result.ok) {
    ticketId.value = result.ticketId
    hadResetIntent.value = reasons.value.length > 0
    estimatedMinutes.value = result.estimatedMinutes || 60
    sent.value = true
    text.value = ''
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

  // UID может быть в query (пришёл из RegisteringView) или в localStorage (обычно)
  const rawUid = String(route.query.uid || readUid() || '').trim()

  // 'неизвестно' — плейсхолдер из RegisteringView (старые версии).
  // Это не валидный UID (не hex40), сервер отклонит 400 ERROR.
  // Трактуем как пустое — покажем карточку «Нужен код доступа».
  uid.value = (rawUid && rawUid !== 'неизвестно') ? rawUid : ''

  if (route.query.text) {
    text.value = String(route.query.text)
  }
})
</script>

<style scoped>
.uid-reset-page {
  position: relative;
  display: grid;
  gap: 24px;
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
</style>