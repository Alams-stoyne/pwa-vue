<template>
  <div class="reflection-panel">
    <div v-if="store.checking" class="muted loading">
      Проверяем статус…
    </div>

    <transition name="fade" appear>
    <div class="reflection-body">      
      <!-- <div v-if="!store.checking && store.sentToday" class="already-card">
        <div class="already-emoji">✓</div>
        <h2>Рефлексия уже отправлена</h2>
        <p class="muted">
          Вы уже поделились мыслями сегодня. Возвращайтесь завтра.
        </p>
        <p v-if="lastSentText" class="muted small">Отправлено: {{ lastSentText }}</p>
      </div> -->
      <form
        v-if="!store.checking && !store.sentToday"
        class="form"
        @submit.prevent="submit"
      >
        <label class="field">
          <span class="field-label" @click="viewClick(store)">{{ store.todayTitle || 'Ваши мысли' }}</span>
          <textarea
            v-model="store.text"
            :maxlength="MAX_TEXT"
            rows="10"
            :placeholder="store.todayDescription || 'Поделитесь своими мыслями...'"
          />
          <span class="field-counter muted">{{ store.text.length }} / {{ MAX_TEXT }}</span>
        </label>

        <p v-if="store.error" class="error">{{ store.error }}</p>
        <div class="bottom-action d-grid g12">
          <ConsentBanner v-if="!canSubmitWithConsent" :class="'relative'" text="Для отправки рефлексии нужно согласие на обработку персональных данных." />

          <button
            type="submit"
            class="btn btn-primary btn-center"
            :disabled="!store.canSubmit || !canSubmitWithConsent"
          >
            <span class="text">{{ store.sending ? 'Отправка…' : 'Отправить' }}</span>
            <span class="badge" v-if="store.todayRewardPoints">+{{ store.todayRewardPoints }} <AppIcon name="apple" :size="21" /></span>
          </button>  
        </div>
      </form>
    </div>
    </transition>
    
    <Mascot ref="mascot" 
      :body-src="`/maskot/body_relax.png`" 
      :bubble-text="store.sentToday ? store.todayAfterTextCloud : store.todayOpenTextCloud"
      :typewriter-speed="40"
      :class="store.sentToday ? 'sent' : '' "
      emotion="laughing"
      @bubble-complete="onBubbleDone"
    />  

  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useReflectionStore } from './store'
import AppIcon from '../../components/AppIcon.vue'
import { useConsentStore } from '../consent/store'
import ConsentBanner from '../consent/ConsentBanner.vue'
import Mascot from '../../components/Mascot.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()
const consentStore = useConsentStore()
const canSubmitWithConsent = computed(() => consentStore.isGranted)

const MAX_TEXT = 750

const store = useReflectionStore()

// Переменная для хранения ID таймера обновления заголовков
let titlesTimer = null

const lastSentText = computed(() => {
  if (!store.lastSentAt) return ''
  const d = new Date(store.lastSentAt)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

async function submit() {
  if (!canSubmitWithConsent.value) return
  await store.send()
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  if (typeof store.loadStatus === 'function') store.loadStatus()
  if (typeof store.loadTitles === 'function') store.loadTitles()

  // Каждые 15 минут проверяем, не изменился ли файл с заголовками на CDN
  titlesTimer = setInterval(() => {
    if (typeof store.loadTitles === 'function') {
      store.loadTitles({ force: true }).catch(() => {})
    }
  }, 15 * 60 * 1000)
})

onUnmounted(() => {
  if (titlesTimer) clearInterval(titlesTimer)
})

function viewClick(event) {
  console.log(event);
}
</script>

<style scoped>

.reflection-panel { 
  position: relative;
}
.reflection-body{
  position: relative;
  z-index: 1;
}
.reflection-panel .maskot{
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 0;
}

.loading { padding: 24px 0; text-align: center; font-size: 14px; }

.form { display: grid; gap: 18px; }

.field { display: grid; gap: 8px; }

.field-label {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 16px;
  line-height: 100%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}

/* Новый стиль для описания */
.field-description {
  font-size: 13px;
  line-height: 1.4;
  color: #6b7268;
  margin: 0 0 4px;
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
  resize: none;
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