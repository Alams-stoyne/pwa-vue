<template>
  <div class="page support-detail-page">
    <div v-if="store.loadingTicket && !store.currentTicket" class="loading">Загрузка…</div>
    
    <div v-else-if="!store.currentTicket" class="empty">
      <p>{{ store.error || 'Обращение не найдено' }}</p>
      <button class="btn btn-secondary mt-16" @click="$router.back()">Назад</button>
    </div>

    <div v-else class="ticket-layout">
      
      <!-- Лента сообщений -->
      <div class="ticket-thread">
        <div 
          v-for="(msg, idx) in messages" 
          :key="idx" 
          class="message" 
          :class="msg.SENDER === 'admin' ? 'admin-message' : 'user-message'"
        >
          <div class="message-meta">
            <span>{{ msg.SENDER === 'admin' ? 'поддержка' : 'вы' }}</span> 
            <span>{{ formatDate(msg.CREATED_AT) }}</span>
          </div>
          <div class="message-body">
            <p>{{ msg.TEXT }}</p>
            <div v-if="msg.IMAGES?.length" class="message-images">
              <img 
                v-for="(img, i) in msg.IMAGES" 
                :key="i" 
                :src="getImageUrl(img)" 
                alt="вложение" 
                @click="openImage(getImageUrl(img))"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Форма ответа (скрываем, если тикет закрыт) -->
      <div v-if="store.currentTicket.STATUS !== 'closed'" class="reply-section">
        <h3 class="reply-title">ответить</h3>
        
        <div class="reply-form">
          <textarea 
            v-model="replyText" 
            placeholder="напишите сообщение..." 
            rows="3"
            :maxlength="MAX_REPLY_TEXT"
          ></textarea>
          
          <div class="reply-attachments">
            <ImageUploader v-model="replyImages" :max="3" />
          </div>

          <p v-if="store.error" class="error-text">{{ store.error }}</p>

          <button 
            type="button" 
            class="btn btn-primary btn-center" 
            :disabled="!canReply || store.replying"
            @click="sendReply"
          >
            {{ store.replying ? 'Отправка…' : 'Отправить' }}
          </button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSupportStore } from './store'
import ImageUploader from '../../components/ImageUploader.vue'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'

const MAX_REPLY_TEXT = 1000

const route = useRoute()
const store = useSupportStore()
const toast = useToast()
const { setBackground } = useAppBackground()

const replyText = ref('')
const replyImages = ref([])

// Таймеры для polling
let pollTimeout = null
let pollInterval = null

const canReply = computed(() => replyText.value.trim().length > 0)

const messages = computed(() => {
  if (!store.currentMessages || !Array.isArray(store.currentMessages)) return []
  
  return store.currentMessages.map(m => ({
    SENDER: m.IS_ADMIN ? 'admin' : 'user',
    TEXT: m.TEXT || '',
    IMAGES: m.IMAGES || [],
    CREATED_AT: m.CREATED_AT
  }))
})

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function getImageUrl(img) {
  if (!img) return ''
  if (typeof img === 'string') return img
  return img.URL || img.THUMB || ''
}

async function sendReply() {
  if (!canReply.value || store.replying) return
  
  const ok = await store.replyToTicket({
    ticketId: route.params.id,
    text: replyText.value,
    images: replyImages.value
  })

  if (ok) {
    replyText.value = ''
    replyImages.value = []
    // toast.success('Сообщение отправлено')
  } else if (store.error) {
    toast.error(store.error)
  }
}

function openImage(url) {
  if (url) window.open(url, '_blank')
}

async function load() {
  await store.loadTicket(route.params.id)
}

// --- Polling логика ---
function startPolling() {
  stopPolling()
  // Первый опрос через 30 сек
  pollTimeout = setTimeout(() => {
    checkForUpdates()
    // Далее каждые 2 минуты
    pollInterval = setInterval(checkForUpdates, 120000)
  }, 30000)
}

function stopPolling() {
  if (pollTimeout) clearTimeout(pollTimeout)
  if (pollInterval) clearInterval(pollInterval)
  pollTimeout = null
  pollInterval = null
}

async function checkForUpdates() {
  if (store.currentTicket?.STATUS === 'closed') {
    stopPolling()
    return
  }
  await load()
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  load().then(() => {
    if (store.currentTicket?.STATUS !== 'closed') {
      startPolling()
    }
  })
})

onUnmounted(() => {
  stopPolling()
})

watch(() => route.params.id, async (newId) => {
  if (newId) {
    stopPolling()
    await load()
    if (store.currentTicket?.STATUS !== 'closed') {
      startPolling()
    }
  }
})
</script>

<style scoped>
.support-detail-page {
  padding-bottom: 24px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 100px);
}

.loading {
  text-align: center;
  padding: 24px;
  color: var(--muted);
}

.ticket-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 24px;
}

/* Лента сообщений */
.ticket-thread {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.message {
  border-radius: 12px;
  padding: 16px;
  max-width: 90%;
}
.user-message {
  align-self: flex-end;
  background: #E8F5E9;
  border-bottom-right-radius: 4px;
}
.admin-message {
  align-self: flex-start;
  background: #fff;
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.message-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}
.user-message .message-meta span:first-child {
  font-weight: 600;
  color: #015f01;
}
.admin-message .message-meta span:first-child {
  font-weight: 600;
  color: var(--accent);
}

.message-body p {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.message-images {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.message-images img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
}

/* Форма ответа */
.reply-section {
  margin-top: auto;
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 -4px 12px rgba(0,0,0,0.02);
}

.reply-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--black);
}

.reply-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-form textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  outline: none;
}
.reply-form textarea:focus {
  border-color: var(--accent);
}

.error-text {
  color: #B91D0C;
  font-size: 13px;
  margin: 0;
}

.empty {
  text-align: center;
  padding: 40px 20px;
}
.mt-16 { margin-top: 16px; }
</style>