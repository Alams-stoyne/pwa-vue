<template>
  <div class="page tasks-page">

    <div class="tabs" role="tablist">
      <button class="tab" :class="{ active: tab === 'reflection' }" role="tab"
              :aria-selected="tab === 'reflection'" @click="tab = 'reflection'">рефлексия</button>

      <button class="tab" :class="{ active: tab === 'steps' }" role="tab"
              :aria-selected="tab === 'steps'" @click="tab = 'steps'">шагомер</button>
      <span class="tab-indicator"
            :style="{ transform: `translateX(${tab === 'reflection' ? 0 : 100}%)` }" />
    </div>

    <section v-show="tab === 'reflection'" class="pane">
        <ReflectionView />
    </section>
    <section v-show="tab === 'steps'" class="pane">
      <StepsView />
    </section>

    <!-- <header class="head">
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
    </div> -->
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ReflectionView from '../reflection/ReflectionView.vue'
import StepsView from '../steps/StepsHomeView.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const tab = ref('reflection')

onMounted(() => {
  setBackground({ url: 'backgrounds/bg_frame.jpg' })
})
</script>

<style scoped>

</style>