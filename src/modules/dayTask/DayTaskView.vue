<template>
  <div class="page day-task-page page--bottom-action">
    <div class="tabs" role="tablist">
      <button
        type="button"
        class="tab"
        role="tab"
        :class="{ active: activeTab === 'reflection' }"
        :aria-selected="activeTab === 'reflection'"
        @click="setTab('reflection')"
      >Рефлексия</button>
      <button
        type="button"
        class="tab"
        role="tab"
        :class="{ active: activeTab === 'steps' }"
        :aria-selected="activeTab === 'steps'"
        @click="setTab('steps')"
      >Шагомер</button>
      <span
        class="tab-indicator"
        :style="{ transform: `translateX(${activeTab === 'reflection' ? 0 : 100}%)` }"
        aria-hidden="true"
      />
    </div>

    <section v-show="activeTab === 'reflection'" class="pane" role="tabpanel">
      <ReflectionPanel />
    </section>

    <section v-show="activeTab === 'steps'" class="pane" role="tabpanel">
      <StepsHomePanel />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HelpIcon from '../../components/HelpIcon.vue'
import ReflectionPanel from '../reflection/ReflectionPanel.vue'
import StepsHomePanel from '../steps/StepsHomePanel.vue'
import { useAppBackground } from '../core/composables/useAppBackground'

const TAB_KEY = 'tab'
const VALID_TABS = ['reflection', 'steps']

const route = useRoute()
const router = useRouter()
const { setBackground } = useAppBackground()

const initial = VALID_TABS.includes(route.query[TAB_KEY])
  ? route.query[TAB_KEY]
  : 'reflection'

const activeTab = ref(initial)

const titleForTab = computed(() =>
  activeTab.value === 'reflection' ? 'Рефлексия' : 'Шагомер'
)

const helpForTab = computed(() =>
  activeTab.value === 'reflection'
    ? 'Один раз в день поделитесь мыслями о том, как проходит ваш путь. Отправить можно только один раз в сутки.'
    : 'Здесь отображаются подтверждённые на сервере шаги и ваше место в общем рейтинге участников.'
)

function setTab(tab) {
  if (!VALID_TABS.includes(tab) || activeTab.value === tab) return
  activeTab.value = tab
  const nextQuery = { ...route.query }
  if (tab === 'reflection') delete nextQuery[TAB_KEY]
  else nextQuery[TAB_KEY] = tab
  router.replace({ query: nextQuery })
}

watch(
  () => route.query[TAB_KEY],
  (val) => {
    const next = VALID_TABS.includes(val) ? val : 'reflection'
    if (next !== activeTab.value) activeTab.value = next
  }
)

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  // Нормализуем URL, если пришёл невалидный tab
  if (route.query[TAB_KEY] && !VALID_TABS.includes(route.query[TAB_KEY])) {
    const nextQuery = { ...route.query }
    delete nextQuery[TAB_KEY]
    router.replace({ query: nextQuery })
  }
})
</script>

<style scoped>
.day-task-page {
    position: relative;
}
/* 
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.head h1 { margin: 0; font-size: 22px; }


.pane { animation: fadePane var(--t-base) both; }
@keyframes fadePane {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 420px) {
  .head h1 { font-size: 20px; }
} */
</style>