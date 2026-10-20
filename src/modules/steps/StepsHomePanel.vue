<template>
  <div class="steps-home-panel">
    <p v-if="loadingSummary && !hasSummary" class="muted loading">
      Загружаем прогресс…
    </p>

    <!-- Прогресс-арка -->
    <section class="arc-block">
      <div class="arc-wrap">
        <svg viewBox="0 0 289 160" class="progress-arc" aria-hidden="true">
          <path
            d="M 14 145 A 130.5 130.5 0 0 1 275 145"
            fill="none" stroke="#D0E8FC" stroke-width="14" stroke-linecap="round"
          />
          <path
            d="M 14 145 A 130.5 130.5 0 0 1 275 145"
            fill="none" stroke="#0E5505" stroke-width="14" stroke-linecap="round"
            pathLength="100"
            :stroke-dasharray="`${progressPercent} 100`"
            class="progress-arc__fill"
          />
        </svg>

        <div class="arc-center">
          <div class="arc-value">{{ formattedTotal }}</div>
          <div v-if="goal" class="arc-goal">из {{ formattedGoal }}</div>
          <div class="arc-label">шагов</div>
        </div>
      </div>

      <p v-if="!hasSummary && !loadingSummary" class="muted arc-hint">
        Отправьте первые шаги — прогресс появится здесь.
      </p>
    </section>

    <!-- Рейтинг -->
    <section class="rating-card">
      <div class="rating-main">
        <div class="rating-num">
          <template v-if="rank > 0">#{{ rank }}</template>
          <template v-else>—</template>
        </div>
        <div class="rating-desc">
          <div class="rating-title">
            <template v-if="totalUsers > 0">
              из {{ totalUsers }} участников
            </template>
            <template v-else>
              Пока нет данных о рейтинге
            </template>
          </div>
          <div v-if="todaySteps > 0" class="rating-meta muted">
            Сегодня зачтено {{ formattedToday }} {{ plural(todaySteps, ['шаг', 'шага', 'шагов']) }}
          </div>
        </div>
      </div>

      <div v-if="topPercent > 0" class="rating-badge">
        Вы в топ-{{ topPercent }}%
      </div>
    </section>

    <!-- Действия -->
    <div class="bottom-action d-grid g12">
      <router-link to="/steps/add" class="btn btn-primary action-btn">
        Добавить шаги
      </router-link>
      <router-link to="/steps/rules" class="btn btn-secondary action-btn">
        Правила
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStepsStore } from './store'

const store = useStepsStore()

const progressPercent = computed(() => {
  const p = store.progressPercent
  return Math.max(0, Math.min(100, Number(p) || 0))
})

const hasSummary = computed(() => store.hasSummary)
const loadingSummary = computed(() => store.loadingSummary)
const goal = computed(() => store.goal)
const rank = computed(() => store.rank)
const totalUsers = computed(() => store.totalUsers)
const todaySteps = computed(() => store.todaySteps)
const topPercent = computed(() => Number(store.summary?.TOP_PERCENT) || 0)

const formattedTotal = computed(() => formatNumber(store.totalSteps))
const formattedGoal = computed(() => formatNumber(goal.value))
const formattedToday = computed(() => formatNumber(todaySteps.value))

function formatNumber(n) {
  const v = Number(n) || 0
  return v.toLocaleString('ru-RU')
}

function plural(n, forms) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

onMounted(() => {
  store.loadSummary()
})
</script>

<style scoped>
.steps-home-panel { padding-bottom: 16px; }

.loading { padding: 16px 0; text-align: center; font-size: 14px; }

/* ─── Прогресс-арка ─── */
.arc-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.arc-wrap {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.progress-arc {
  width: 100%;
  height: auto;
  display: block;
}
.progress-arc__fill {
  transition: stroke-dasharray 700ms cubic-bezier(.2,.7,.2,1);
}

.arc-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -35%);
  text-align: center;
  width: 100%;
  pointer-events: none;
}

.arc-value {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0E5505;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.arc-goal {
  font-size: 15px;
  color: #6b7268;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.arc-label {
  font-size: 13px;
  color: #015f01;
  margin-top: 4px;
  font-weight: 600;
  text-transform: lowercase;
}

.arc-hint {
  margin: 8px 0 0;
  font-size: 13px;
  text-align: center;
}

/* ─── Рейтинг ─── */
.rating-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  margin-bottom: 20px;
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.rating-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rating-num {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #015f01;
  font-variant-numeric: tabular-nums;
  min-width: 60px;
}

.rating-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.rating-title {
  font-size: 14px;
  font-weight: 600;
  color: #21271f;
}
.rating-meta {
  font-size: 12.5px;
}

.rating-badge {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: #E6F4EA;
  color: #0F5A05;
  font-size: 12px;
  font-weight: 700;
}

/* ─── Действия ─── */
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.action-btn {
  width: 100%;
  max-width: 358px;
  margin: 0 auto;
  text-align: center;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
}

@media (max-width: 420px) {
  .arc-value { font-size: 28px; }
  .rating-num { font-size: 24px; }
}
</style>