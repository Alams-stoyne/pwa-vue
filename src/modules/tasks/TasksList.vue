<script setup>
import { useRouter } from 'vue-router'
import { useTasksStore } from './store'

const router = useRouter()
const store = useTasksStore()

function openDetail(task) {
  router.push({ name: 'PracticeDetail', params: { id: task.ID } })
}
</script>

<template>
  <div class="tasks-list">
    <div v-if="store.loading" class="tasks-state">Загрузка…</div>
    <div v-else-if="!store.list.length" class="tasks-state">
      Практик на сегодня нет
    </div>

    <template v-else>
      <article
        v-for="t in store.list"
        :key="t.ID"
        class="task-card"
        role="button"
        tabindex="0"
        @click="openDetail(t)"
        @keydown.enter="openDetail(t)"
      >
        <img v-if="t.COVER" :src="t.COVER" :alt="t.TITLE" class="task-cover" loading="lazy" />
        <div class="task-body">
          <h3 class="task-title">{{ t.TITLE }}</h3>
          <p v-if="t.DESCRIPTION" class="task-desc">{{ t.DESCRIPTION }}</p>
        </div>
        <span v-if="store.isDone(t.ID)" class="task-done">✓ Выполнено</span>
      </article>
    </template>
  </div>
</template>

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