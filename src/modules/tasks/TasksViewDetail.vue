<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTasksStore } from './store'
import { useConsentStore } from '../consent/store'
import { fetchTasksByThemeDate } from './api'

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
  return tasksStore.isDone(task.value.ID, taskDate.value)
})

const hasConsent = computed(() => consent.isGranted)

async function loadTask() {
  const found = tasksStore.list.find(t => String(t.ID) === taskId)
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
</script>

<template>
  <div class="page practice-detail">
    <div v-if="loading" class="state">Загрузка…</div>
    <div v-else-if="!task && error" class="state error">{{ error }}</div>

    <template v-else-if="task">
      <header class="detail-head">
        <h1>{{ task.TITLE }}</h1>
        <p v-if="task.DESCRIPTION" class="detail-desc">{{ task.DESCRIPTION }}</p>
        <img v-if="task.COVER" :src="task.COVER" :alt="task.TITLE" class="detail-cover" />
      </header>

      <div v-if="task.TEXT" class="detail-content" v-html="task.TEXT" />

      <a
        v-if="task.VIDEO_LINK"
        :href="task.VIDEO_LINK"
        target="_blank"
        rel="noopener"
        class="detail-video"
      >
        Смотреть видео
      </a>

      <div class="detail-actions">
        <span v-if="isDone" class="badge-done">✓ Практика выполнена</span>

        <p v-else-if="!hasConsent" class="consent-warning">
          Чтобы отметить практику выполненной, необходимо
          <router-link to="/onboarding/consent">согласие на обработку персональных данных</router-link>.
        </p>

        <button
          v-else
          class="btn btn-primary"
          type="button"
          :disabled="marking"
          @click="markDone"
        >
          {{ marking ? 'Отправка…' : 'Отметить выполненным' }}
        </button>

        <p v-if="error" class="error-text">{{ error }}</p>
      </div>
    </template>
  </div>
</template>