<template>
  <div class="reflection-panel">
    <div v-if="store.checking" class="muted loading">
      Проверяем статус…
    </div>

    <transition name="fade" appear>
      <div v-if="!store.checking && store.sentToday" class="already-card">
        <div class="already-emoji">✓</div>
        <h2>Рефлексия уже отправлена</h2>
        <p class="muted">
          Вы уже поделились мыслями сегодня. Возвращайтесь завтра.
        </p>
        <p v-if="lastSentText" class="muted small">Отправлено: {{ lastSentText }}</p>
      </div>

      <form
        v-else-if="!store.checking"
        class="form"
        @submit.prevent="submit"
      >
        <label class="field">
          <span class="field-label">{{ store.todayTitle || 'Ваши мысли' }}</span>
          <textarea
            v-model="store.text"
            :maxlength="MAX_TEXT"
            rows="10"
            placeholder="Поделитесь своими мыслями…"
          />
          <span class="field-counter muted">{{ store.text.length }} / {{ MAX_TEXT }}</span>
        </label>

        <p v-if="store.error" class="error">{{ store.error }}</p>

        <button
          type="submit"
          class="btn btn-primary btn-center"
          :disabled="!store.canSubmit"
        >
          <span class="text">{{ store.sending ? 'Отправка…' : 'Отправить' }}</span>
          <span class="badge">+5 <AppIcon name="apple" :size="21" /></span>
        </button>
      </form>
    </transition>
    
    <Mascot ref="mascot" 
      :body-src="`/maskot/body_relax.png`" 
      bubble-text="Привет! Я Зефирчик. Рад тебя видеть на Неделе здоровья и безопасности Х5!"
      :typewriter-speed="40"
      emotion="blush"
      @bubble-complete="onBubbleDone"
    />  

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useReflectionStore } from './store'
import AppIcon from '../../components/AppIcon.vue'
import Mascot from '../../components/Mascot.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const MAX_TEXT = 750

const store = useReflectionStore()

const lastSentText = computed(() => {
  if (!store.lastSentAt) return ''
  const d = new Date(store.lastSentAt)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

async function submit() {
  await store.send()
}

onMounted(() => {
  setBackground({ url: 'backgrounds/bg_frame.jpg' })
  if (typeof store.loadStatus === 'function') store.loadStatus()
  if (typeof store.loadTitles === 'function') store.loadTitles()
})
</script>

<style scoped>
.reflection-panel { padding-bottom: 16px; }

.loading { padding: 24px 0; text-align: center; font-size: 14px; }

.form { display: grid; gap: 18px; }

.field { display: grid; gap: 8px; }

.field-label {
  font-size: 15px;
  font-weight: 700;
  color: #015f01;
  letter-spacing: -0.01em;
  line-height: 1.3;
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
  resize: vertical;
  min-height: 200px;
  transition: border-color .15s;
}
.field textarea:focus { border-color: var(--accent); }

.field-counter {
  font-size: 12px;
  text-align: right;
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

/* ─── Уже отправлено ─── */
.already-card {
  display: grid;
  gap: 14px;
  padding: 32px 24px;
  text-align: center;
  background: #E6F4EA;
  border-radius: var(--radius);
  border: 1px solid #AFE6DD;
}
.already-emoji {
  width: 56px; height: 56px;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 28px;
  display: grid;
  place-items: center;
}
.already-card h2 { margin: 0; font-size: 20px; }
.already-card p { margin: 0; font-size: 14px; }
.already-card .small { font-size: 12px; margin-top: 4px; }
</style>