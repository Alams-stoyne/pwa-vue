<template>
  <div class="page practice-detail">
    <div v-if="loading" class="state">Загрузка…</div>
    <div v-else-if="!task && error" class="state error">{{ error }}</div>

    <template v-else-if="task">
      <header class="detail-head">
        <h1 @click="viewClick(task)">{{ task.TITLE }}</h1>
        <p v-if="task.DESCRIPTION" class="detail-desc">{{ task.DESCRIPTION }}</p>
        <img v-if="task.COVER" :src="task.COVER" :alt="task.TITLE" class="detail-cover" />
      </header>

      <!-- ── Блок видео ── -->
      <div v-if="video" class="practice-video">
        <FacecastPlayer v-if="video.type === 'facecast'" :url="video.src" />
        
        <div v-else-if="video.type === 'iframe'" class="video-embed">
          <iframe :src="video.src" allowfullscreen frameborder="0" />
        </div>
        
        <video v-else-if="video.type === 'video'" :src="video.src" controls class="video" />
        
        <a 
          v-else 
          :href="video.src" 
          target="_blank" 
          rel="noopener" 
          class="btn btn-secondary btn-center mt-16"
        >
          ▶ Смотреть видео
        </a>
      </div>

      <div v-if="task.TEXT" class="detail-content" v-html="task.TEXT" />

      <div class="detail-actions">
        <span v-if="isDone" class="badge-done">✓ Практика выполнена</span>

        <p v-else-if="!hasConsent" class="consent-warning">
          Чтобы отметить практику выполненной, необходимо
          <router-link to="/onboarding/consent">согласие на обработку персональных данных</router-link>.
        </p>

        <p v-if="error" class="error-text">{{ error }}</p>
      </div>

      <div class="bottom-action">
        <button
          v-if="!isDone && hasConsent"
          class="btn btn-primary btn-center"
          type="button"
          :disabled="marking"
          @click="markDone"
        >
          <span class="text">{{ marking ? 'Отправка…' : 'готово' }}</span>
          <span class="badge" v-if="task.REWARD_POINTS">+{{ task.REWARD_POINTS }} <AppIcon name="apple" :size="21" /></span>         
        </button>  
      </div>

    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTasksStore } from './store'
import { useConsentStore } from '../consent/store'
import { fetchTasksByThemeDate } from './api'
import AppIcon from '../../components/AppIcon.vue'
import FacecastPlayer from '../../components/FacecastPlayer.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const route = useRoute()
const tasksStore = useTasksStore()
const consent = useConsentStore()

const task = ref(null)
const loading = ref(false)
const marking = ref(false)
const error = ref('')

const taskId = String(route.params.id)

// ID в JSON имеет вид "{theme}-{date}", например "5-2026-10-20".
function parseId(id) {
  const i = id.indexOf('-')
  if (i === -1) return { theme: '', date: '' }
  return { theme: id.slice(0, i), date: id.slice(i + 1) }
}

const taskDate = computed(() => task.value?.DATE || parseId(taskId).date)

const isDone = computed(() => {
  if (!task.value) return false
  return tasksStore.isDone(task.value.ID_TASK, taskDate.value)
})

const hasConsent = computed(() => consent.isGranted)

// ── Логика видео ──────────────────────────────────────────────
const video = computed(() => {
  const raw = task.value?.VIDEO_LINK
  if (!raw) return null

  const url = String(raw).trim()
  if (!url) return null

  // Facecast
  if (url.includes('facecast.net')) {
    return { type: 'facecast', src: url }
  }

  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (ytMatch) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
    }
  }

  // Прямая ссылка на видеофайл
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(url)) {
    return { type: 'video', src: url }
  }

  // Обычная ссылка
  return { type: 'link', src: url }
})

// ─────────────────────────────────────────────────────────────

async function loadTask() {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  const found = tasksStore.list.find(t => String(t.ID_TASK) === taskId)
  if (found) { task.value = found; return }

  const { theme, date } = parseId(taskId)
  if (!theme || !date) { error.value = 'Некорректная ссылка на практику'; return }

  loading.value = true
  try {
    const list = await fetchTasksByThemeDate(theme, date)
    task.value = list.find(t => String(t.ID) === taskId) || null
    if (!task.value) error.value = 'Практика не найдена'
  } catch {
    error.value = 'Не удалось загрузить практику'
  } finally {
    loading.value = false
  }
}

async function markDone() {
  if (!task.value || !hasConsent.value || isDone.value) return
  marking.value = true
  error.value = ''
  try {
    await tasksStore.complete(task.value)
  } catch (e) {
    error.value = e?.message === 'CONSENT_REQUIRED'
      ? 'Необходимо согласие на обработку персональных данных'
      : 'Не удалось отметить практику'
  } finally {
    marking.value = false
  }
}

onMounted(loadTask)

function viewClick(event) {
  console.log(event);
}
</script>

<style scoped>
.practice-detail {
  padding-bottom: 24px;
}

.state {
  text-align: center;
  padding: 24px;
  color: var(--muted);
}
.state.error {
  color: #B91D0C;
}

.detail-head {
  margin-bottom: 16px;
}

.detail-head h1 {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 20px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-wrap: balance;
  color: #21271f;
  margin: 0 0 8px;
}

.detail-desc {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.4;
  color: #6b7268;
}

.detail-cover {
  width: 100%;
  border-radius: var(--radius);
  display: block;
  margin: 12px 0;
}

/* ── Блок видео ── */
.practice-video {
  margin: 16px 0;
}

.video-embed {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.video-embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video {
  width: 100%;
  display: block;
  background: #000;
  border-radius: 16px;
  border: 1px solid var(--border);
}

.mt-16 {
  margin-top: 16px;
}

/* ── Текст ── */
.detail-content {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 130%;
  letter-spacing: -0.01em;
  color: #21271f;
  margin-bottom: 24px;
}
.detail-content :deep(p) { margin: 0 0 12px; }
.detail-content :deep(p:last-child) { margin-bottom: 0; }
.detail-content :deep(ul),
.detail-content :deep(ol) { margin: 0 0 12px; padding-left: 22px; }
.detail-content :deep(a) { color: var(--accent); text-decoration: underline; }

/* ── Действия и футер ── */
.detail-actions {
  margin-top: 24px;
}

.badge-done {
  display: inline-block;
  padding: 8px 14px;
  border-radius: 8px;
  background: #EEF7E5;
  color: #015F01;
  font-size: 14px;
  font-weight: 600;
}

.consent-warning {
  margin-top: 12px;
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

.error-text {
  color: #B91D0C;
  font-size: 13px;
  margin-top: 12px;
}
</style>