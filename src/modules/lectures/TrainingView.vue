<template>
  <div class="page training-page">
    <div class="tabs" role="tablist">
        <button class="tab" :class="{ active: tab === 'lectures' }" role="tab" :aria-selected="tab === 'lectures'" @click="tab = 'lectures'">Лекции</button>
        <button class="tab" :class="{ active: tab === 'practice' }" role="tab" :aria-selected="tab === 'practice'" @click="tab = 'practice'">Практики</button>
        <span class="tab-indicator" :style="{ transform: `translateX(${tab === 'lectures' ? 0 : 100}%)` }" />
    </div>

    <section v-show="tab === 'lectures'" class="pane">
      <LectureSlider
        title="Общие лекции"
        emoji="🌐"
        :list="lectures.generalList"
        :is-read="lectures.isRead"
        :loading="lectures.loading"
        :show-all-link="{ path: '/training/storage', query: { filter: 'lecture-general' } }"
      />

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
        Материалы прошлых дней
      </router-link>
    </div>    
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HelpIcon from '../../components/HelpIcon.vue'
import LectureSlider from './LectureSlider.vue'
import PracticeList from './PracticeList.vue'
import { useLecturesStore } from './store'
import { useThemeStore } from '../theme/store'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()


const lectures = useLecturesStore()
const theme = useThemeStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

// Возврат из детального просмотра практики (meta.backTo) приходит с
// ?tab=practice. На случай старых ссылок (?tab=practices) — принимаем оба.
const initialTab = (route.query.tab === 'practice' || route.query.tab === 'practices')
  ? 'practice'
  : 'lectures'
const tab = ref(initialTab)

// Синхронизируем выбранный таб с query — чтобы «Назад» из детального
// просмотра возвращал именно на нужную вкладку, и ссылку можно было шарить.
watch(tab, (v) => {
  const query = { ...route.query }
  if (v === 'practice') query.tab = 'practice'
  else delete query.tab
  router.replace({ query })
})

const themeName = computed(() => theme.currentTheme?.name || '—')
const themeEmoji = computed(() => theme.currentTheme?.emoji || '')

const anyData = computed(() =>
  lectures.generalList.length + lectures.themeList.length + lectures.chargingList.length > 0
)

function refresh() {
  if (lectures.online) lectures.loadAll({ force: true })
}

onMounted(() => {
  // setBackground({ background: 'linear-gradient(180deg, #86d0fb -14.79%, rgba(255, 255, 255, 0) 100%)' })
  setBackground({ url: 'backgrounds/bg_frame.jpg' })
  theme.load()
  lectures.initNetworkWatcher()
  lectures.flushReadQueue()
  lectures.loadAll()
})
</script>

<style scoped>
/* .training-page { padding-top: 12px; } */

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