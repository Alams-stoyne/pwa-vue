<template>
  <div class="page registering-page">
    <div class="registering-card">
      <!-- ── UID_LOCKED: устройство привязано к другому uid ── -->
      <template v-if="auth.error === 'UID_LOCKED'">
        <div class="gate-icon" aria-hidden="true">🔒</div>
        <h1>UID не совпадает</h1>
        <p class="muted">
          Это устройство уже активировано под другим UID. Сменить UID нельзя.
        </p>
        <button type="button" class="btn-primary action" @click="goAccessError">
          Понятно
        </button>
      </template>

      <!-- ── UID_TAKEN: uid уже используется на другом устройстве ── -->
      <template v-else-if="auth.error === 'UID_TAKEN'">
        <div class="gate-icon" aria-hidden="true">📱</div>
        <h1>UID уже используется</h1>
        <p class="muted">
          Этот код доступа уже активирован на другом устройстве.
          Один UID — одно устройство.
        </p>
        <button type="button" class="btn-primary action" @click="goAccessError">
          Понятно
        </button>
      </template>

      <!-- ── DEVICE_ROTATED: uid занят, deviceId только что пересоздан ── -->
      <template v-else-if="auth.error === 'DEVICE_ROTATED'">
        <div class="gate-icon" aria-hidden="true">🔄</div>
        <h1>Устройство переустановлено</h1>
        <p class="muted">
          Этот код доступа уже привязан к другому устройству.
          Если вы сменили телефон — обратитесь к администратору,
          чтобы перенести доступ.
        </p>
        <button type="button" class="btn-primary action" @click="goAccessError">
          Понятно
        </button>
      </template>

      <!-- ── UID_NOT_FOUND: сервер не знает такой uid ── -->
      <template v-else-if="auth.error === 'UID_NOT_FOUND'">
        <div class="gate-icon" aria-hidden="true">❓</div>
        <h1>Код не распознан</h1>
        <p class="muted">
          Код доступа не найден на сервере. Откройте персональную ссылку
          из корпоративного канала Х5.
        </p>
        <button type="button" class="btn-primary action" @click="goAccessError">
          Понятно
        </button>
      </template>

      <!-- ── RATE_LIMITED: слишком много попыток ── -->
      <template v-else-if="auth.error === 'RATE_LIMITED'">
        <div class="gate-icon" aria-hidden="true">⏳</div>
        <h1>Слишком много попыток</h1>
        <p class="muted">{{ auth.error }}</p>
        <button
          type="button"
          class="btn-primary action"
          :disabled="auth.registering"
          @click="retry"
        >
          {{ auth.registering ? 'Пробуем снова…' : 'Повторить' }}
        </button>
      </template>

      <!-- ── Прочие ошибки (сеть, отклонение сервером) ── -->
      <template v-else-if="auth.error">
        <div class="gate-icon" aria-hidden="true">⚠️</div>
        <h1>Не удалось подключиться</h1>
        <p class="muted">{{ auth.error }}</p>
        <button
          type="button"
          class="btn-primary action"
          :disabled="auth.registering"
          @click="retry"
        >
          {{ auth.registering ? 'Пробуем снова…' : 'Повторить' }}
        </button>
      </template>

      <!-- ── Успех ── -->
      <template v-else-if="success">
        <div class="check-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
            <path d="M4 12.5l5 5L20 6"
                  stroke="currentColor" stroke-width="2.4"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Готово!</h1>
        <p class="muted">Устройство зарегистрировано на сервере</p>
        <br>
        <button type="button" class="btn btn-primary btn-center text-center m-auto" @click="proceed">
          Продолжить
        </button>
      </template>

      <!-- ── Спиннер ── -->
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
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground, clearBackground } = useAppBackground()

const auth = useAuthStore()
const profile = useProfileStore()
const quiz = useQuizStore()
const theme = useThemeStore()
const lectures = useLecturesStore()
const tasks = useTasksStore()
const habits = useHabitsStore()
const router = useRouter()

const success = ref(false)

/** Подтянуть локальное состояние после успешной регистрации. */
function reloadUserState() {
  profile.load()
  quiz.load()
  theme.load()
  lectures.reloadReadKeys()
  tasks.reloadDoneKeys()
  habits.reload()
}

async function run() {
  // Перед показом «Готово!» сбрасываем флаг подтверждения.
  // Иначе возможна ситуация, когда пользователь ранее уже нажимал
  // «Продолжить», потом снова попал на /registering — и кнопка
  // «Продолжить» перестаёт реагировать, потому что экран считается
  // уже подтверждённым. Свежая регистрация — свежий экран.
  try { localStorage.removeItem('auth.confirmed') } catch {}

  auth.error = null
  const ok = await auth.registerWithUid()
  if (!ok) {
    if (auth.error === 'UID_LOCKED') router.replace('/access-error')
    // UID_TAKEN и DEVICE_ROTATED — тоже доступ закрыт.
    // Редиректить сразу не надо: пользователь должен увидеть
    // объяснение и нажать «Понятно» сам.
    return
  }

  reloadUserState()
  success.value = true
}

/**
 * Пользователь увидел «Готово!» и нажал «Продолжить».
 * Только здесь ставится флаг isConfirmed.
 */
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

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_start.jpg' })
  auth.load()

  // Пользователь уже подтверждал экран «Готово!» — не задерживаем.
  if (auth.isConfirmed) {
    router.replace('/')
    return
  }

  // Регистрация уже пройдена (isRegistered), но «Готово!» ещё
  // не подтверждали — показываем экран подтверждения.
  if (auth.isAuthed && auth.isRegistered) {
    reloadUserState()
    success.value = true
    return
  }

  // Регистрации не было — запускаем.
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
.action {
  margin-top: 20px;
  width: 100%;
  max-width: 280px;
}
@media (prefers-reduced-motion: reduce) {
  .spinner, .check-icon { animation: none; }
}
</style>