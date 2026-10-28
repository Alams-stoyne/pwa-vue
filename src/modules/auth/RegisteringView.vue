<template>
  <div class="page registering-page">
    <div class="registering-card">
      <template v-if="auth.error === 'UID_LOCKED'">
        <div class="gate-icon" aria-hidden="true">🔒</div>
        <h1>UID не совпадает</h1>
        <p class="muted">Это устройство уже активировано под другим UID. Сменить UID нельзя.</p>
        <button type="button" class="btn btn-primary btn-center mt-12" @click="goToSupport('UID_LOCKED')">
          Восстановить доступ
        </button>
        <button type="button" class="btn btn-secondary btn-center mt-8" @click="goAccessError">
          Понятно
        </button>
      </template>

      <template v-else-if="auth.error === 'UID_TAKEN'">
        <div class="gate-icon" aria-hidden="true">📱</div>
        <h1>Этот профиль уже используется</h1>
        <p class="muted">
          Этот код доступа уже активирован на другом устройстве.
          Если вы сменили телефон — восстановите доступ через администратора.
        </p>
        <button type="button" class="btn btn-primary btn-center mt-12" @click="goToSupport('UID_TAKEN')">
          Восстановить доступ
        </button>
        <button type="button" class="btn btn-secondary btn-center mt-8" @click="goAccessError">
          Понятно
        </button>
      </template>

      <template v-else-if="auth.error === 'DEVICE_ROTATED'">
        <div class="gate-icon" aria-hidden="true">🔄</div>
        <h1>Устройство переустановлено</h1>
        <p class="muted">
          Этот код доступа уже привязан к другому устройству.
          Если вы сменили телефон — восстановите доступ через администратора.
        </p>
        <button type="button" class="btn btn-primary btn-center mt-12" @click="goToSupport('DEVICE_ROTATED')">
          Восстановить доступ
        </button>
        <button type="button" class="btn btn-secondary btn-center mt-8" @click="goAccessError">
          Понятно
        </button>
      </template>

      <template v-else-if="auth.error === 'UID_NOT_FOUND'">
        <div class="gate-icon" aria-hidden="true">❓</div>
        <h1>Код не распознан</h1>
        <p class="muted">Код доступа не найден на сервере. Откройте персональную ссылку из корпоративного канала Х5.</p>
        <button type="button" class="btn btn-primary btn-center mt-12" @click="goToSupport('UID_NOT_FOUND')">
          Восстановить доступ
        </button>
        <button type="button" class="btn btn-secondary btn-center mt-8" @click="goAccessError">
          Понятно
        </button>
      </template>

      <template v-else-if="auth.error === 'RATE_LIMITED'">
        <div class="gate-icon" aria-hidden="true">⏳</div>
        <h1>Слишком много попыток</h1>
        <p class="muted">{{ auth.error }}</p>
        <button type="button" class="btn btn-primary btn-center mt-12" :disabled="auth.registering" @click="retry">
          {{ auth.registering ? 'Пробуем снова…' : 'Повторить' }}
        </button>
      </template>

      <template v-else-if="auth.error">
        <div class="gate-icon" aria-hidden="true">⚠️</div>
        <h1>Не удалось подключиться</h1>
        <p class="muted">{{ auth.error }}</p>
        <button type="button" class="btn btn-primary btn-center mt-12" :disabled="auth.registering" @click="retry">
          {{ auth.registering ? 'Пробуем снова…' : 'Повторить' }}
        </button>
      </template>

      <template v-else-if="success">
        <div class="check-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
            <path d="M4 12.5l5 5L20 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Готово!</h1>
        <p class="muted">устройство зарегистрировано на сервере</p>
        <br>
        <button type="button" class="btn btn-primary btn-center text-center m-auto" @click="proceed">
          Продолжить
        </button>
      </template>

      <template v-else>
        <div class="spinner" aria-hidden="true" />
        <h1>Подключаемся…</h1>
        <p class="muted">Регистрируем устройство на сервере</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './store'
import { useProfileStore } from '../profile/store'
import { useQuizStore } from '../quiz/store'
import { useThemeStore } from '../theme/store'
import { useLecturesStore } from '../lectures/store'
import { useTasksStore } from '../tasks/store'
import { useHabitsStore } from '../habits/store'
import { useConsentStore } from '../consent/store'
import { useAppBackground } from '../core/composables/useAppBackground'
import { readUid, readDeviceId } from '../install/useAccess'

const { setBackground } = useAppBackground()

const auth = useAuthStore()
const profile = useProfileStore()
const quiz = useQuizStore()
const theme = useThemeStore()
const lectures = useLecturesStore()
const tasks = useTasksStore()
const habits = useHabitsStore()
const consent = useConsentStore()
const router = useRouter()

const success = ref(false)

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
}

function reloadLocalState() {
  profile.load()
  quiz.load()
  theme.load()
  lectures.reloadReadKeys()
  tasks.reloadDoneKeys()
  habits.reload()
  consent.reload()
}

async function hydrateFromServer() {
  if (!auth.idUser) return

  if (!consent.isAnswered) {
    try { await withTimeout(consent.loadStatus(), 3000) } catch (e) {
      console.warn('[register] consent fetch failed:', e)
    }
  }

  if (!habits.selectedHabitId) {
    try { await withTimeout(habits.loadSelection(), 3000) } catch (e) {
      console.warn('[register] habit selection fetch failed:', e)
    }
  }

  console.log('[register] hydration result', {
    consentAnswered: consent.isAnswered,
    consentGranted: consent.isGranted,
    selectedHabitId: habits.selectedHabitId,
    localStorageHabit: localStorage.getItem('habits.selectedHabitId'),
  })
}

async function run() {
  console.log('[RegisteringView] run() started')
  try { localStorage.removeItem('auth.confirmed') } catch {}

  auth.error = null
  const ok = await auth.registerWithUid()
  console.log('[RegisteringView] registerWithUid returned:', ok, 'auth.error:', auth.error)

  if (!ok) {
    if (auth.error === 'UID_LOCKED') router.replace('/access-error')
    
    // Если ошибки нет, но и успеха нет — значит, регистрация уже идет в фоне
    if (!auth.error) {
      console.warn('[RegisteringView] Registration is already in progress...')
      // Ждем немного и проверяем снова (рекурсивно, но с задержкой)
      setTimeout(() => {
        if (auth.isAuthed && auth.isRegistered) {
          reloadLocalState().then(() => {
            hydrateFromServer().then(() => { success.value = true })
          })
        } else if (!auth.registering && !auth.error) {
          // Если регистрация завершилась без ошибки и без успеха — странная ситуация
          auth.error = 'Неизвестная ошибка. Попробуйте еще раз.'
        }
      }, 2000)
    }
    return
  }

  reloadLocalState()
  await hydrateFromServer()

  success.value = true
}

function proceed() {
  auth.confirmRegistration()
  router.replace('/')
}

function retry() {
  success.value = false
  run()
}

function goAccessError() {
  router.replace('/access-error')
}

function goToSupport(errorType) {
  const deviceId = readDeviceId() || 'неизвестно'
  const newUid = readUid() || 'неизвестно'
  const currentUid = auth.boundUid || 'неизвестно'

  let errorText = ''

  if (errorType === 'UID_LOCKED') {
    errorText = `Проблема: Это устройство уже активировано под другим UID.
ID-устройства: ${deviceId}
Новый UID: ${newUid}
Текущий UID: ${currentUid}
===
Уважаемый пользователь просим вас ниже описать причину попытки авторизации по другой ссылке с измененным UID:`
  } else if (errorType === 'UID_TAKEN') {
    errorText = `Проблема: UID уже активирован на другом устройстве.
ID-устройства: ${deviceId}
Текущий UID: ${currentUid}
===
Уважаемый пользователь просим вас ниже описать причину попытки авторизации на другом устройстве:`
  } else if (errorType === 'DEVICE_ROTATED') {
    errorText = `Проблема: Устройство переустановлено.
ID-устройства: ${deviceId}
Текущий UID: ${currentUid}
===
Уважаемый пользователь просим вас ниже описать причину смены устройства:`
  } else if (errorType === 'UID_NOT_FOUND') {
    errorText = `Проблема: Код доступа (UID) не найден на сервере.
ID-устройства: ${deviceId}
Текущий UID: ${newUid}
===
Уважаемый пользователь просим вас ниже описать, откуда вы взяли ссылку/UID:`
  }

  router.push({
    path: '/support',
    query: { text: errorText, auth_error: errorType, uid: newUid },
  })
}

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_start.jpg' })
  auth.load()

  if (auth.isConfirmed) {
    router.replace('/')
    return
  }

  if (auth.isAuthed && auth.isRegistered) {
    reloadLocalState()
    await hydrateFromServer()
    success.value = true
    return
  }

  run()
})
</script>

<style scoped>
.registering-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 20px;
}
.registering-card {
  width: min(100%, 360px);
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px 24px;
  box-shadow: var(--shadow-1);
  animation: riseIn var(--t-slow) both;
}
.spinner {
  width: 44px; height: 44px;
  border: 4px solid var(--accent-soft);
  border-top-color: var(--accent);
  border-radius: 50%;
  margin: 0 auto 18px;
  animation: spin 900ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.check-icon {
  width: 60px; height: 60px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  animation: popIn 420ms cubic-bezier(.2,.7,.2,1) both;
}
@keyframes popIn {
  0%   { transform: scale(.4); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
.gate-icon { font-size: 46px; line-height: 1; margin-bottom: 14px; }
.registering-card h1 { font-size: 20px; margin: 0 0 6px; }
.registering-card p { margin: 0; font-size: 14px; line-height: 1.5; }
.mt-12 { margin-top: 20px; width: 100%; }
.mt-8 { margin-top: 8px; width: 100%; }
@media (prefers-reduced-motion: reduce) {
  .spinner, .check-icon { animation: none; }
}
</style>