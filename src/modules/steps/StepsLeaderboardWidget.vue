<template>
  <section class="leaderboard-widget">
    <!-- Заголовок и переключатель -->
    <header class="lb-header">
      <div class="lb-title-wrap">
        <h2 class="lb-title">топ-5</h2>
        <span v-if="store.userWorkplace" class="lb-subtitle">· {{ store.userWorkplace }}</span>
      </div>
      
      <div class="lb-tabs">
        <button :class="{ active: store.leaderboardDate === 'all' }" @click="setDate('all')">Всё</button>
        <button :class="{ active: store.leaderboardDate === 'today' }" @click="setDate('today')">Сегодня</button>
      </div>
    </header>

    <!-- Сводка (приоритет у компании пользователя, иначе общая) -->
    <div v-if="summaryData" class="lb-summary">
      <div class="lbs-item">
        <span class="lbs-val">{{ summaryData.TOTAL_PARTICIPANTS }}</span>
        <span class="lbs-label">участников</span>
      </div>
      <div class="lbs-item">
        <span class="lbs-val">{{ formatNum(summaryData.TOTAL_STEPS) }}</span>
        <span class="lbs-label">шагов</span>
      </div>
      <div v-if="store.schoolStats && !store.workplaceMeta" class="lbs-item">
        <span class="lbs-val">{{ store.schoolStats.AVG_PROGRESS_PERCENT }}%</span>
        <span class="lbs-label">прогресс</span>
      </div>
    </div>

    <!-- Скелетон -->
    <div v-if="store.loadingLeaderboard && !store.leaderboard" class="lb-list">
      <div v-for="i in 5" :key="i" class="lb-card skeleton pulse" />
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="!top5.length" class="lb-empty">
      <p>За этот период пока нет подтверждённых шагов.</p>
      <button v-if="!store.online" class="btn btn-secondary mt-16" @click="refresh">Обновить</button>
    </div>

    <!-- Список топ-5 -->
    <div v-else class="lb-list">
      <div 
        v-for="(user, index) in top5" 
        :key="index" 
        class="lb-card"
      >
        <div class="lb-rank">№{{ user.rank }}</div>
        <div class="lb-user">
          <span class="lb-nick">{{ user.nickname }}</span>
          <span v-if="user.workplace && !store.userWorkplace" class="lb-workplace">{{ user.workplace }}</span>
        </div>
        <div class="lb-steps">{{ formatNum(user.steps) }} шагов</div>
      </div>
    </div>

    <!-- Дата обновления -->
    <p v-if="store.leaderboardUpdatedAt" class="lb-updated">
      Обновлено: {{ formatDate(store.leaderboardUpdatedAt) }}
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStepsStore } from './store'

const store = useStepsStore()

// Берем топ-5 из отфильтрованного списка
const top5 = computed(() => {
  return store.myWorkplaceTop.slice(0, 5)
})

// Если есть данные по компании — берем их, иначе общие школьные
const summaryData = computed(() => {
  if (store.workplaceMeta) {
    return {
      TOTAL_PARTICIPANTS: store.workplaceMeta.TOTAL_PARTICIPANTS,
      TOTAL_STEPS: store.workplaceMeta.TOTAL_STEPS,
    }
  }
  return store.schoolStats || null
})

function setDate(date) {
  store.loadLeaderboard({ date })
}

function refresh() {
  store.loadLeaderboard({ date: store.leaderboardDate, force: true })
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('ru-RU')
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} в ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => {
  store.loadLeaderboard({ date: store.leaderboardDate })
})
</script>

<style scoped>
.leaderboard-widget {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
  margin-bottom: 24px;
}

.lb-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}
.lb-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.lb-title {
  font-family: var(--font-family);
  font-size: 20px;
  font-weight: 700;
  text-transform: lowercase;
  color: var(--txt-dark-green);
  margin: 0;
}
.lb-subtitle {
  font-size: 13px;
  color: #6b7268;
  font-weight: 500;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-tabs {
  display: flex;
  background: #fff;
  border-radius: 100px;
  padding: 2px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.lb-tabs button {
  background: transparent;
  border: none;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7268;
  cursor: pointer;
}
.lb-tabs button.active {
  background: var(--accent);
  color: #015F01;
}

.lb-summary {
  display: flex;
  justify-content: space-between;
  background: #f1f3e9;
  padding: 12px 16px;
  border-radius: 16px;
  margin-bottom: 4px;
}
.lbs-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}
.lbs-item:not(:last-child) {
  border-right: 1px solid rgba(0,0,0,0.05);
}
.lbs-val {
  font-weight: 800;
  font-size: 15px;
  color: #015F01;
}
.lbs-label {
  font-size: 11px;
  color: #6b7268;
  text-align: center;
}

.lb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lb-card {
  background: #fff;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
}

.lb-card.skeleton {
  background: #eee;
  height: 56px;
}

.lb-rank {
  font-family: var(--second-family, inherit); 
  font-weight: 800;
  font-size: 18px;
  color: #D3FF4F;
  -webkit-text-stroke: 1px #21271f;
  min-width: 32px;
}

.lb-user {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.lb-nick {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 15px;
  color: #21271f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lb-workplace {
  font-size: 11px;
  color: #8FA69A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-steps {
  font-size: 12px;
  font-weight: 600;
  color: #015F01;
  white-space: nowrap;
}

.lb-updated {
  font-size: 11px;
  color: #8FA69A;
  text-align: right;
  margin-top: 4px;
}

.lb-empty {
  text-align: center;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  font-size: 14px;
  color: #6b7268;
}
.mt-16 { margin-top: 16px; }
</style>