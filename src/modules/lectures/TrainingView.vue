<template>
  <div class="page training-page">
    <div class="tabs" role="tablist">
        <button class="tab" :class="{ active: tab === 'lectures' }" role="tab" :aria-selected="tab === 'lectures'" @click="tab = 'lectures'">Лекции</button>
        <button class="tab" :class="{ active: tab === 'practice' }" role="tab" :aria-selected="tab === 'practice'" @click="tab = 'practice'">Практики</button>
        <span class="tab-indicator" :style="{ transform: `translateX(${tab === 'lectures' ? 0 : 100}%)` }" />
    </div>

    <section v-show="tab === 'lectures'" class="pane">
      <LectureSlider
        :title="`Для направления ${themeName}`"
        :emoji="themeEmoji"
        :list="lectures.themeList"
        :is-read="lectures.isRead"
        :loading="lectures.loading"
        :show-all-link="{ path: '/training/storage', query: { filter: `lecture-${theme.selected}` } }"
      />
    </section>

    <section v-show="tab === 'practice'" class="pane">
      <PracticeList />

      <LectureSlider
        title="Зарядка"
        emoji="⚡"
        :list="lectures.chargingList"
        :is-read="lectures.isRead"
        :loading="lectures.loading"
        :show-all-link="{ path: '/training/storage', query: { filter: 'lecture-charging' } }"
      />
    </section>

    <div class="bottom-action">
      <router-link to="/training/storage" class="btn btn-secondary btn-center">
        архив материалов
      </router-link>
    </div>    
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LectureSlider from './LectureSlider.vue'
import PracticeList from './PracticeList.vue'
import { useLecturesStore } from './store'
import { useThemeStore } from '../theme/store'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()

const lectures = useLecturesStore()
const theme = useThemeStore()
const route = useRoute()
const router = useRouter()

const initialTab = (route.query.tab === 'practice' || route.query.tab === 'practices')
  ? 'practice'
  : 'lectures'
const tab = ref(initialTab)

watch(tab, (v) => {
  const query = { ...route.query }
  if (v === 'practice') query.tab = 'practice'
  else delete query.tab
  router.replace({ query })
})

const themeName = computed(() => theme.currentTheme?.name || '—')
const themeEmoji = computed(() => theme.currentTheme?.emoji || '')

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  theme.load()

  // init() сам делает:
  //   1. _watchNet / _startTimer / _watchPeriod
  //   2. await period.whenReady()   — ждём, пока период загрузится
  //   3. cleanupLecturesOutsidePeriod(period) — чистим IDB от старых
  //   4. loadAll()                  — грузим лекции (после cleanup!)
  //   5. syncFromServer / syncMissingPhotos
  //
  // Раньше здесь был ещё отдельный lectures.loadAll() — это вызывало
  // рассинхрон: cleanup срабатывал ПОСЛЕ загрузки, в сторе оставались
  // лекции, которых уже нет в IDB.
  await lectures.init()
  lectures.flushReadQueue()
})
</script>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.head h1 { margin: 0; }
.head-actions { display: flex; gap: 4px; }

.pane { animation: fadePane var(--t-base) both; }
@keyframes fadePane {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.storage-wrap {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  margin-bottom: 12px;
}
.storage-btn {
  text-decoration: none;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.empty {
  text-align: center;
  padding: 40px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.empty-emoji { font-size: 44px; }
.empty h3 { margin: 4px 0 0; }

.skeleton { padding: 16px; }
.sk-line { height: 12px; border-radius: 6px; background: #eee; margin-bottom: 8px; }
.sk-line--title { width: 40%; height: 16px; }
.sk-line--text { width: 90%; margin-bottom: 0; }
</style>