<template>
  <div class="page tasks-page">
    <header class="head">
      <div>
        <p class="muted head-label">Задания на сегодня</p>
        <h1>{{ theme.currentTheme?.name || '—' }}</h1>
      </div>
      <HelpIcon>
        Задания обновляются ежедневно и зависят от выбранной темы.
        Выполнить задание можно один раз и только в день, когда оно выдано.
      </HelpIcon>
      <button
        class="ghost icon-btn"
        :disabled="loading || !store.online"
        @click="refresh"
      ><span :class="{ spin: loading }">↻</span></button>
    </header>

    <p class="muted meta-line">
      {{ today }} ·
      выполнено {{ store.progress.done }} из {{ store.progress.total || '—' }}
    </p>

    <div v-if="loading" class="list">
      <div v-for="n in 3" :key="n" class="card skeleton pulse">
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <div v-else-if="!store.list.length" class="empty">
      <span class="empty-emoji">🎯</span>
      <h3>Пока нет заданий</h3>
      <p class="muted">На сегодня для темы «{{ theme.currentTheme?.name }}» заданий нет.</p>
    </div>

    <div v-else class="list">
      <article
        v-for="(t, i) in store.list"
        :key="t.ID_TASK"
        class="card task rise"
        :class="{ done: store.isDone(t.ID_TASK) }"
        :style="{ animationDelay: i * 60 + 'ms' }"
      >
        <header class="task-head">
          <span class="task-index">#{{ i + 1 }}</span>
          <h3 class="task-title">{{ t.TITLE }}</h3>
          <transition name="fade">
            <span v-if="store.isDone(t.ID_TASK)" class="task-badge">✓ Выполнено</span>
          </transition>
        </header>
        <p class="task-text muted">{{ t.TEXT }}</p>
        <div class="task-footer">
          <transition name="fade" mode="out-in">
            <span v-if="store.isDone(t.ID_TASK)" key="d" class="task-done-note muted">
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
import HelpIcon from '../../components/HelpIcon.vue'
import { useTasksStore } from './store'
import { useThemeStore } from '../theme/store'
import { useToast } from '../core/composables/useToast'

const store = useTasksStore()
const theme = useThemeStore()
const toast = useToast()

const today = computed(() => {
  const d = new Date()
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
})

const loading = computed(() => store.loading)

function refresh() {
  if (!store.online) return
  store.load({ force: true })
}

function complete(task) {
  const ok = store.complete(task)
  if (ok) toast.success('Задание выполнено')
}

watch(() => store.error, (v) => {
  if (!v || v === 'OFFLINE_EMPTY') return
  toast.error(v)
})

onMounted(() => {
  theme.load()
  store.initNetworkWatcher()
  store.flushQueue()
  store.load()
})

watch(() => theme.selected, (n, o) => { if (n && n !== o) store.load({ force: true }) })
</script>

<style scoped>
.head { display: flex; align-items: center; gap: 8px; }
.head h1 { margin: 2px 0 0; }
.head-label { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
.head > div { flex: 1; }

.icon-btn {
  width: 40px; height: 40px; padding: 0;
  border-radius: 50%; font-size: 18px;
  display: grid; place-items: center;
}
.spin { display: inline-block; animation: spin 800ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.meta-line { margin: 8px 0 16px; font-size: 13px; }

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
  text-align: center; padding: 40px 12px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
}
.empty-emoji { font-size: 44px; }
.empty h3 { margin: 4px 0 0; }

.skeleton { padding: 16px; }
.sk-line { height: 12px; border-radius: 6px; background: #eee; margin-bottom: 8px; }
.sk-line--title { width: 50%; height: 16px; }
.sk-line--text { width: 85%; margin-bottom: 0; }
</style>