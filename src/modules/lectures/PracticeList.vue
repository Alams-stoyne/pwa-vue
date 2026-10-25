<template>
  <div class="practice-list">
    <header class="practice-head d-grid g8">
      <div class="practice-label">Задания на сегодня</div>
      <div class="practice-title">Для направления {{ theme.currentTheme?.name || '—' }}</div>
    </header>

    <div v-if="tasks.loading" class="list">
      <div v-for="n in 3" :key="n" class="card skeleton pulse">
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <div v-else-if="!tasks.list.length" class="empty-block">
        <div class="empty-title">Пока нет заданий</div>
        <div class="empty-text">На сегодня для направления «{{ theme.currentTheme?.name }}» заданий нет</div>
        <!-- <div class="empty-help-text">Нажмите «Синхронизировать» — подтянем материалы за последнюю неделю.</div> -->
    </div>

    <div v-else class="list">
      <article
        v-for="(t, i) in tasks.list"
        :key="t.ID_TASK"
        class="card task rise"
        :class="{ done: tasks.isDone(t.ID_TASK, t.DATE) }"
        :style="{ animationDelay: i * 60 + 'ms' }"
        role="button"
        tabindex="0"
      >
        <!-- @click="openDetail(t)" @keydown.enter="openDetail(t)"  -->
        <header class="task-head">
          <h3 class="task-title">{{ t.TITLE }}</h3>
          <!-- <transition name="fade">
            <span v-if="tasks.isDone(t.ID, t.DATE)" class="task-badge">✓ Выполнено</span>
          </transition> -->
        </header>
        <p class="task-text muted">{{ t.TEXT }}</p>

        <div class="task-footer" v-if="tasks.isDone(t.ID_TASK, t.DATE)"> 
          <span class="read" aria-label="награда получена">
            <div class="check"><AppIcon name="check" :size="10" /></div>          
            <AppIcon name="apple" :size="14" />
            <div class="text">награда получена</div>  
          </span>
          <span class="task-barge" aria-label="выполнено">выполнено</span>   
        </div>
        <div class="task-footer" v-else> 
          <span class="read" aria-label="за выполнение">  
            <AppIcon name="apple" :size="14" />
            <div class="text">за выполнение</div>  
          </span>
          <span class="btn btn-primary btn-center" aria-label="выполнено" @click="openDetail(t)" @keydown.enter="openDetail(t)">открыть</span>   
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '../tasks/store'
import { useThemeStore } from '../theme/store'
import { useToast } from '../core/composables/useToast'
import AppIcon from '../../components/AppIcon.vue'

const router = useRouter()
const tasks = useTasksStore()
const theme = useThemeStore()
const toast = useToast()

function openDetail(task) {
  router.push({ name: 'PracticeDetail', params: { id: task.ID_TASK } })
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
.task {
  padding: 16px;
  cursor: pointer;
  transition: transform var(--t-base), box-shadow var(--t-base);
}
.task:hover { transform: translateY(-1px); }
.task:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
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
.task-footer { 
  display: flex; 
  justify-content: space-between;
  align-items: center;
}
.task-footer .read { 
  display: flex;
  gap: 4px;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  line-height: 120%;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
}
.task-footer .read .check{ 
  background: var(--txt-dark-green);
  color: var(--txt-brand-limon);
  border-radius: 9px;
  padding: 2px;
  width: 14px;
  height: 14px;
}

.task-footer .btn{ 
  padding: 8px 16px 9px;
}
.task-barge{
  border-radius: 120px;
  padding: 4px 10px 5px;
  background: var(--green-light);
  font-size: 12px;
  text-align: center;
  color: var(--txt-dark-green);
  background: var(--green-light);
}


.task-done-note { font-size: 13px; }
.task-open { font-size: 13px; }

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