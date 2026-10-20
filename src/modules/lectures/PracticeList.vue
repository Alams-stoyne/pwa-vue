<template>
  <div class="practice-list">
    <header class="practice-head d-grid g8">
      <div class="practice-label">Задания на сегодня</div>
      <div class="practice-title"> Для направления Энергия{{ theme.currentTheme?.name || '—' }}</div>
    </header>

    <div v-if="tasks.loading" class="list">
      <div v-for="n in 3" :key="n" class="card skeleton pulse">
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <div v-else-if="!tasks.list.length" class="empty">
      <span class="empty-emoji">🎯</span>
      <h3>Пока нет заданий</h3>
      <p class="muted">На сегодня для направления «{{ theme.currentTheme?.name }}» заданий нет.</p>
    </div>

    <div v-else class="list">
      <article
        v-for="(t, i) in tasks.list"
        :key="t.ID_TASK"
        class="card task rise"
        :class="{ done: tasks.isDone(t.ID_TASK) }"
        :style="{ animationDelay: i * 60 + 'ms' }"
      >
        <header class="task-head">
          <span class="task-index">#{{ i + 1 }}</span>
          <h3 class="task-title">{{ t.TITLE }}</h3>
          <transition name="fade">
            <span v-if="tasks.isDone(t.ID_TASK)" class="task-badge">✓ Выполнено</span>
          </transition>
        </header>
        <p class="task-text muted">{{ t.TEXT }}</p>
        <div class="task-footer">
          <transition name="fade" mode="out-in">
            <span v-if="tasks.isDone(t.ID_TASK)" key="d" class="task-done-note muted">
              Задание выполнено
            </span>
            <button v-else key="b" @click="complete(t)">Отметить выполненным</button>
          </transition>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useTasksStore } from '../tasks/store'
import { useThemeStore } from '../theme/store'
import { useToast } from '../core/composables/useToast'

const tasks = useTasksStore()
const theme = useThemeStore()
const toast = useToast()

const today = computed(() => {
  const d = new Date()
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
})

function complete(task) {
  if (tasks.complete(task)) toast.success('Задание выполнено')
}

watch(() => tasks.error, (v) => {
  if (!v || v === 'OFFLINE_EMPTY') return
  toast.error(v)
})

onMounted(() => {
  theme.load()
  tasks.initNetworkWatcher()
  tasks.flushQueue()
  tasks.load()
})

watch(() => theme.selected, (n, o) => {
  if (n && n !== o) tasks.load({ force: true })
})
</script>

<style scoped>
.practice-head { 
  position: relative;
  font-family: var(--font-family);
  text-transform: lowercase;
  color: var(--black);
  margin-bottom: 16px;
}

.practice-label {
  font-weight: 700;
  font-size: 28px;
  line-height: 87%;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.practice-title { 
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
}

.meta-line { margin: 0; font-size: 13px; }

.list { display: grid; gap: 12px; }
.task { padding: 16px; }
.task.done { opacity: .75; }
.task-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.task-index {
  font-size: 12px; font-weight: 700; color: var(--accent);
  background: var(--accent-soft); padding: 2px 8px; border-radius: 999px;
}
.task-title { margin: 0; font-size: 16px; flex: 1; min-width: 120px; }
.task-badge {
  font-size: 12px; font-weight: 700; color: var(--accent);
  padding: 3px 8px; border-radius: 999px; background: var(--accent-soft);
}
.task-text { margin: 0 0 14px; font-size: 14px; line-height: 1.5; }
.task-footer { display: flex; justify-content: flex-end; }
.task-done-note { font-size: 13px; }
.task-footer button { padding: 10px 16px; }

.empty {
  text-align: center;
  padding: 40px 12px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
}
.empty-emoji { font-size: 44px; }
.empty h3 { margin: 4px 0 0; }
.skeleton { padding: 16px; }
.sk-line { height: 12px; border-radius: 6px; background: #eee; margin-bottom: 8px; }
.sk-line--title { width: 50%; height: 16px; }
.sk-line--text { width: 85%; margin-bottom: 0; }
</style>