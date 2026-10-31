<template>
  <div class="page stats-page page--bottom-action-one">
    <div class="tabs" role="tablist">
        <button class="tab" :class="{ active: tab === 'personal' }" role="tab" :aria-selected="tab === 'personal'" @click="tab = 'personal'">личная</button>
        <button class="tab" :class="{ active: tab === 'global' }" role="tab" :aria-selected="tab === 'global'" @click="tab = 'global'">общая</button>
        <span class="tab-indicator" :style="{ transform: `translateX(${tab === 'personal' ? 0 : 100}%)` }" />
    </div>

    <section v-show="tab === 'personal'" class="pane personal">
      <div class="head">
        <div class="title">ваш прогресс</div>
      </div>

      <div class="grid-stat">
        <div class="apples-row">
          <span class="apples-label">у вас:</span>
          <router-link
            to="/stats/rewards"
            class="btn-badge"
            aria-label="за что получены яблоки"
          >
            {{ formatNum(store.apples) }}<span class="apple"><AppIcon name="apple" :size="24" /></span>
          </router-link>
        </div>
        <div class="card stat-card">
          <div class="info">
            <div class="sc-icon"><AppIcon name="crown" :size="24" /></div>
            <div class="sc-value">{{  formatNum(personal.RANK) }}</div>
          </div>
          <div class="sc-label">ваше место среди всех участников</div>
        </div>
        <div class="grid-2x2">
          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="book" :size="24" /></div>
              <div class="sc-value">{{ formatNum(personal.LECTURES_READ) }}</div>
            </div>
            <div class="sc-label">просмотрено лекций</div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="tasks" :size="24" /></div>
              <div class="sc-value">{{ formatNum(personal.TASKS_DONE) }}</div>
            </div>
            <div class="sc-label">просмотрено практик</div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="juice" :size="24" /></div>
              <div class="sc-value">{{ formatNum(personal.HABITS_DAYS) }}</div>
            </div>
            <div class="sc-label">дней выполнена привычка</div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="steps" :size="24" /></div>
              <div class="sc-value">{{ formatNum(personal.STEPS_CONFIRMED) }}</div>
            </div>
            <div class="sc-label">подтверждено шагов</div>
          </div>
        </div>
      </div>
    </section>

    <div v-show="tab === 'global'" class="global-wrap">
      <div
        class="pull-indicator"
        :class="{
          'is-ready': isReady,
          'is-refreshing': isRefreshing,
        }"
        :style="{ transform: `translateY(calc(-100% + ${pullOffset}px))` }"
        aria-hidden="true"
      >
        <span v-if="isRefreshing" class="pull-spinner">↻</span>
        <span v-else class="pull-arrow" :class="{ 'is-ready': isReady }">↓</span>
        <span class="pull-text">{{ pullText }}</span>
      </div>

      <section
        ref="globalPaneRef"
        class="pane global"
        :class="{ 'is-pulling': isPulling }"
        :style="{ transform: `translateY(${pullOffset}px)` }"
        v-bind="pullHandlers"
      >
        <div class="head">
          <div class="title">общий зачёт X5</div>
          <div class="subtitle">ваши действия добавляют вклад в результат команды на протяжении всей недели</div>
        </div>

        <div class="grid-stat">
          <div class="apples-row">
            <span class="apples-label">общее количество яблок:</span>

            <!-- ▼ ЕДИНСТВЕННЫЙ клик в global: обновление всего блока ▼ -->
            <div
              class="btn-badge"
              :class="{ 'is-loading': isLoadingGlobal }"
              role="button"
              :aria-busy="isLoadingGlobal"
              :aria-disabled="isLoadingGlobal"
              :aria-label="isLoadingGlobal ? 'обновление статистики' : 'обновить статистику'"
              tabindex="0"
              @click="refreshGlobal"
              @keydown.enter.prevent="refreshGlobal"
              @keydown.space.prevent="refreshGlobal"
            >
              <AnimatedNumber
                :value="globalProgress.TOTAL_APPLES"
                :restart-key="stepsRestartKey"
                mode="count"
                :duration="2000"
              />
              <span v-if="isLoadingGlobal" class="badge-spinner" aria-hidden="true">↻</span>
              <span class="apple"><AppIcon name="apple" :size="24" /></span>
            </div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="user" :size="24" /></div>
              <div class="sc-value">
                +<AnimatedNumber
                  :value="globalProgress.TOTAL_USERS"
                  :restart-key="stepsRestartKey"
                  mode="count"
                  :duration="900"
                />
              </div>
            </div>
            <div class="sc-label">участников присоединилось</div>
          </div>

          <div class="grid-2x2">
            <div class="card stat-card">
              <div class="info">
                <div class="sc-icon"><AppIcon name="book" :size="24" /></div>
                <div class="sc-value">
                  <AnimatedNumber
                    :value="globalProgress.LECTURES_READ"
                    :restart-key="stepsRestartKey"
                    mode="count"
                    :duration="900"
                  />
                </div>
              </div>
              <div class="sc-label">просмотрено лекций</div>
            </div>

            <div class="card stat-card">
              <div class="info">
                <div class="sc-icon"><AppIcon name="tasks" :size="24" /></div>
                <div class="sc-value">
                  <AnimatedNumber
                    :value="globalProgress.TASKS_DONE"
                    :restart-key="stepsRestartKey"
                    mode="count"
                    :duration="900"
                  />
                </div>
              </div>
              <div class="sc-label">выполнено практик</div>
            </div>

            <div class="card stat-card">
              <div class="info">
                <div class="sc-icon"><AppIcon name="juice" :size="24" /></div>
                <div class="sc-value">
                  <AnimatedNumber
                    :value="globalProgress.HABITS_DAYS"
                    :restart-key="stepsRestartKey"
                    mode="count"
                    :duration="900"
                  />
                </div>
              </div>
              <div class="sc-label">общее кол-во дней привычки</div>
            </div>

            <!-- ▼ STEPS: count-анимация. Перезапуск с 0 при каждом
                 refreshGlobal (клик на бейдж яблок). ▼ -->
            <div class="card stat-card">
              <div class="info">
                <div class="sc-icon"><AppIcon name="steps" :size="24" /></div>
                <div class="sc-value">
                  <AnimatedNumber
                    :value="globalProgress.STEPS_CONFIRMED_TOTAL"
                    :restart-key="stepsRestartKey"
                    mode="count"
                    :duration="900"
                  />
                </div>
              </div>
              <div class="sc-label">подтверждено шагов за период марафона</div>
            </div>
          </div>
        </div>

        <div class="effective">
          <div class="head">
            <div class="title">ваша эффективность</div>
            <div class="company-progress-bar-wrap">
              <div class="cpb-label">{{ companyPercent }}%</div>
              <div class="cpb-track">
                <div class="cpb-fill" :style="{ width: companyPercent + '%' }" />
              </div>
            </div>
          </div>

          <div class="companies-list">
            <div v-for="comp in companiesList" :key="comp.ID" class="company-item">
              <div class="ci-header">
                <div class="ci-name">
                  <span class="ci-logo">
                    <img v-if="comp.LOGO" :src="comp.LOGO" :alt="comp.NAME" class="ci-logo-img" />
                    <template v-else>{{ comp.NAME }}</template>
                  </span>
                </div>
                <span class="ci-percent">{{ comp.PERCENT }}%</span>
              </div>
              <div class="ci-track">
                <div class="ci-fill" :style="{ width: comp.PERCENT + '%' }" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom-action">
      <router-link to="/stats/rules" class="btn btn-primary btn-center">
        <div class="text">правила</div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useStatsStore } from './store'
import { useLimits } from '../core/limits'
import { usePullToRefresh } from '../core/composables/usePullToRefresh'
import AppIcon from '../../components/AppIcon.vue'
import AnimatedNumber from '../../components/AnimatedNumber.vue'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()
const store = useStatsStore()
const limitsApi = useLimits()
const tab = ref('personal')

const personal = computed(() => {
  const p = store.personal || {}
  return {
    APPLES: store.apples,
    RANK: p.RANK || 0,
    LECTURES_READ: p.LECTURES_READ || 0,
    TASKS_DONE: p.TASKS_DONE || 0,
    HABITS_DAYS: p.HABITS_DAYS || 0,
    STEPS_CONFIRMED: p.STEPS_CONFIRMED || 0
  }
})

const globalProgress = computed(() => {
  const g = store.global?.GLOBAL_PROGRESS || {}
  return {
    TOTAL_APPLES: g.TOTAL_APPLES || 0,
    TOTAL_USERS: g.TOTAL_USERS || 0,
    LECTURES_READ: g.LECTURES_READ || 0,
    TASKS_DONE: g.TASKS_DONE || 0,
    HABITS_DAYS: g.HABITS_DAYS || 0,
    STEPS_CONFIRMED: g.STEPS_CONFIRMED || 0,
    STEPS_CONFIRMED_TOTAL:
      (g.STEPS_CONFIRMED_TOTAL != null)
        ? g.STEPS_CONFIRMED_TOTAL
        : (g.STEPS_CONFIRMED || 0),
  }
})

const companiesList = computed(() => store.companiesList)

const companyPercent = computed(() => {
  if (store.personal?.COMPANY_PERCENT) return store.personal.COMPANY_PERCENT
  if (store.userCompany) return store.userCompany.PERCENT
  return 0
})

function formatNum(n) {
  return Number(n || 0).toLocaleString('ru-RU')
}

// ── Pull-to-refresh ────────────────────────────────────────
const globalPaneRef = ref(null)

const {
  isPulling,
  isRefreshing,
  isReady,
  pullOffset,
  pullText,
  handlers: pullHandlers,
} = usePullToRefresh(
  globalPaneRef,
  async () => {
    await Promise.all([
      store.fetchPersonal({ force: true }),
      store.fetchGlobal({ force: true }),
    ])
    // Pull-to-refresh тоже рестартит анимацию шагов с 0
    stepsRestartKey.value++
  },
  {
    threshold: 70,
    maxPull: 100,
    damping: 0.5,
  },
)

// ── Общее состояние загрузки global ────────────────────────
const isLoadingGlobal = computed(
  () => store.loadingGlobal || isRefreshing.value,
)

// ── Рестарт анимации шагов (0 → value) ─────────────────────
const stepsRestartKey = ref(0)

// ── Обновление global (единственный клик) ──────────────────
// Клик на бейдж яблок → fetchGlobal({ force: true }).
// При успехе — stepsRestartKey++ → STEPS_CONFIRMED_TOTAL
// пересчитывается с 0. Остальные поля переходят «старое → новое»
// через mode='bump'.
async function refreshGlobal() {
  if (isLoadingGlobal.value) return

  // Запоминаем момент успешного обновления ДО запроса.
  // store.fetchGlobal обновляет times.lastGlobal только при успехе.
  const before = store.times?.lastGlobal || 0

  await store.fetchGlobal({ force: true })

  // Если lastGlobal сдвинулся — запрос прошёл, данные перезаписаны.
  // Рестартим анимацию шагов с 0.
  if ((store.times?.lastGlobal || 0) > before) {
    stepsRestartKey.value++
  }
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.init()
})

onBeforeUnmount(() => {
  store.stop()
})
</script>

<style scoped>
.stats-page {
  position: relative;
  display: grid;
  gap: 32px;
  align-items: start;
  align-content: start;
  overflow: hidden;
  max-height: 100dvh;
}

.pane {
  position: relative;
  display: grid;
  gap: 32px;
}

.global-wrap {
  position: relative;
  overflow: hidden;
  max-height: calc(100dvh - 355px);
  border-radius: 14px;
}

.pull-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  z-index: 2;
  transition: transform 0.2s ease;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 13px;
  color: var(--muted);
  text-transform: lowercase;
}
.pull-indicator.is-ready {
  color: var(--txt-green-dsrk);
}
.pull-indicator.is-refreshing {
  color: var(--txt-green-dsrk);
}
.pull-arrow {
  display: inline-block;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s ease;
}
.pull-arrow.is-ready {
  transform: rotate(180deg);
}
.pull-spinner {
  display: inline-block;
  font-size: 18px;
  line-height: 1;
  animation: pullSpin 800ms linear infinite;
}
@keyframes pullSpin {
  to { transform: rotate(360deg); }
}

.pane.global {
  position: relative;
  display: grid;
  gap: 32px;
  overflow: hidden;
  overflow-y: auto;
  height: 100%;
  max-height: calc(100dvh - 355px);
  scrollbar-width: none;
  border-radius: 14px;
  transition: transform 0.25s ease;
  overscroll-behavior-y: contain;
}
.pane.global.is-pulling {
  transition: none;
}
.pane.global::-webkit-scrollbar {
  display: none;
}

.pane .head{
  position: relative;
  display: grid;
  gap: 16px;
  font-family: var(--font-family);
  color: var(--txt-black-dark-green);
}
.pane .head .title{
  font-weight: 500;
  font-size: 28px;
  line-height: 100%;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.pane .head .subtitle {
  font-weight: 400;
  font-size: 16px;
  line-height: 120%;
  text-wrap: pretty;
}

.apples-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.apples-label {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 16px;
  line-height: 100%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}

.btn-badge--clickable {
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}
.btn-badge--clickable:hover {
  transform: translateY(-1px);
}
.btn-badge--clickable:active {
  transform: translateY(0);
}
.btn-badge--clickable:focus-visible {
  outline: 2px solid var(--txt-green-dsrk);
  outline-offset: 2px;
}
.btn-badge--clickable.is-loading {
  cursor: wait;
  opacity: 0.7;
  pointer-events: none;
}
.badge-spinner {
  display: inline-block;
  margin-left: 4px;
  font-size: 14px;
  line-height: 1;
  animation: pullSpin 800ms linear infinite;
}

.rating-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 16px;
}
.rc-icon {
  width: 48px;
  height: 48px;
  background: #D3FF4F;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #015F01;
}
.rc-value {
  font-size: 24px;
  font-weight: 800;
  color: var(--txt-dark-green);
}
.rc-label {
  font-size: 13px;
  color: var(--txt-black-dark-green);
  line-height: 1.2;
}
.grid-stat {
  display: grid;
  gap: 16px;
}
.grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.stat-card {
  display: grid;
  gap: 8px;
}
.stat-card.full {
  display: flex;
  gap: 14px;
}
.stat-card .info {
  display: flex;
  align-content: center;
  align-items: center;
  gap: 14px;
}

.sc-icon {
  border-radius: 58px;
  padding: 6px;
  display: grid;
  place-items: center;
  background: var(--txt-brand-limon);
  border-radius: 50%;
  width: 36px;
  aspect-ratio: 1 / 1;
}
.sc-value {
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 18px;
  line-height: 150%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
  display: inline-flex;
  align-items: center;
}
.sc-label {
  font-size: 12.5px;
  color: var(--txt-black-dark-green);
  line-height: 1.3;
}

.company-progress-bar-wrap {
  position: relative;
  background: #D3FF4F;
  border-radius: 100px;
  height: 32px;
  margin: 16px 0 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  overflow: hidden;
}
.cpb-label {
  font-weight: 700;
  font-size: 14px;
  color: #015F01;
  z-index: 2;
}
.cpb-fill {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  background: #e5ff9c;
  border-radius: 100px;
  z-index: 1;
}

.companies-list {
  display: grid;
  gap: 16px;
}

.company-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ci-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ci-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #21271f;
}
.ci-logo {
  color: var(--txt-black-dark-green);
  display: grid;
  place-items: center;
  font-size: 20px;
  overflow: hidden;
}
.ci-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ci-percent {
  font-weight: 700;
  color: var(--txt-dark-green);
}
.ci-track {
  height: 6px;
  background: #f0f0f0;
  border-radius: 100px;
  overflow: hidden;
}
.ci-fill {
  height: 100%;
  background: #94E91E;
  border-radius: 100px;
}

.grid-stat .card {
  border-radius: 14px;
  padding: 16px 10px;
  background: var(--white);
  margin: 0;
}
.btn-badge svg{
  color: transparent;
}
</style>