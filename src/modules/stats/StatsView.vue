<template>
  <div class="page stats-page">
    <!-- Табы -->
    <div class="tabs-wrap">
      <div class="tabs" role="tablist">
        <button 
          class="tab" 
          :class="{ active: tab === 'personal' }" 
          @click="tab = 'personal'"
        >личная</button>
        <button 
          class="tab" 
          :class="{ active: tab === 'global' }" 
          @click="tab = 'global'"
        >общая</button>
        <span class="tab-indicator" :style="{ transform: `translateX(${tab === 'personal' ? 0 : 100}%)` }" />
      </div>
    </div>

    <!-- ЛИЧНАЯ СТАТИСТИКА -->
    <section v-show="tab === 'personal'" class="pane">
      <h1 class="page-title">ваш прогресс</h1>
      
      <div class="apples-row">
        <span class="apples-label">у вас:</span>
        <div class="apples-badge">
          {{ formatNum(store.apples) }} <AppIcon name="apple" :size="20" />
        </div>
      </div>

      <!-- Карточка места в рейтинге -->
      <div class="card rating-card">
        <div class="rc-icon"><AppIcon name="crown" :size="28" /></div>
        <div class="rc-info">
          <div class="rc-value">{{ formatNum(personal.RANK) }}</div>
          <div class="rc-label">ваше место среди всех участников</div>
        </div>
      </div>

      <!-- Сетка 2х2 -->
      <div class="grid-2x2">
        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="book" :size="20" /></div>
          <div class="sc-value">{{ formatNum(personal.LECTURES_READ) }}</div>
          <div class="sc-label">просмотрено лекций</div>
        </div>

        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="tasks" :size="20" /></div>
          <div class="sc-value">{{ formatNum(personal.TASKS_DONE) }}</div>
          <div class="sc-label">выполнено практик</div>
        </div>

        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="juice" :size="20" /></div>
          <div class="sc-value">{{ formatNum(personal.HABITS_DAYS) }}</div>
          <div class="sc-label">дней выполнена привычка</div>
        </div>

        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="steps" :size="20" /></div>
          <div class="sc-value">{{ formatNum(personal.STEPS_CONFIRMED) }}</div>
          <div class="sc-label">подтверждено шагов</div>
        </div>
      </div>

      <router-link to="/stats/rules" class="btn btn-outline rules-btn">
        правила личного и командного зачёта
      </router-link>
    </section>

    <!-- ОБЩАЯ СТАТИСТИКА -->
    <section v-show="tab === 'global'" class="pane">
      <div class="alert-banner">
        Яблоки и рейтинги обновляются раз в сутки. Шаги проходят проверку.
      </div>

      <h1 class="page-title mt-24">общий зачёт компаний х5</h1>
      <p class="page-subtitle">ваши действия добавляют вклад в результат команды на протяжении всей недели</p>

      <div class="apples-row mt-16">
        <span class="apples-label">общее количество яблок:</span>
        <div class="apples-badge big">
          {{ formatNum(globalProgress.TOTAL_APPLES) }} <AppIcon name="apple" :size="24" />
        </div>
      </div>

      <!-- Сетка 2х2 для общей статистики -->
      <div class="grid-2x2 mt-16">
        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="user" :size="20" /></div>
          <div class="sc-value">+{{ formatNum(globalProgress.TOTAL_USERS) }}</div>
          <div class="sc-label">участников присоединилось</div>
        </div>

        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="book" :size="20" /></div>
          <div class="sc-value">{{ formatNum(globalProgress.LECTURES_READ) }}</div>
          <div class="sc-label">просмотрено лекций</div>
        </div>

        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="tasks" :size="20" /></div>
          <div class="sc-value">{{ formatNum(globalProgress.TASKS_DONE) }}</div>
          <div class="sc-label">выполнено практик</div>
        </div>

        <div class="card stat-card">
          <div class="sc-icon"><AppIcon name="juice" :size="20" /></div>
          <div class="sc-value">{{ formatNum(globalProgress.HABITS_DAYS) }}</div>
          <div class="sc-label">общее кол-во дней привычки</div>
        </div>
      </div>

      <div class="card stat-card full-width mt-16">
        <div class="sc-icon"><AppIcon name="steps" :size="20" /></div>
        <div class="sc-value">{{ formatNum(globalProgress.STEPS_CONFIRMED) }}</div>
        <div class="sc-label">подтверждено шагов за период марафона</div>
      </div>

      <!-- Эффективность компаний -->
      <h2 class="page-title mt-32">ваша эффективность</h2>
      
      <div class="company-progress-bar-wrap">
        <div class="cpb-label">{{ companyPercent }}%</div>
        <div class="cpb-track">
          <div class="cpb-fill" :style="{ width: companyPercent + '%' }" />
        </div>
      </div>

      <div class="companies-list">
        <!-- ▼ ИСПОЛЬЗУЕМ companiesList ▼ -->
        <div v-for="comp in companiesList" :key="comp.ID" class="company-item">
          <div class="ci-header">
            <div class="ci-name">
              <span class="ci-logo">
                <img v-if="comp.LOGO" :src="comp.LOGO" alt="" class="ci-logo-img" />
                <template v-else>{{ comp.NAME[0] }}</template>
              </span> 
              {{ comp.NAME }}
            </div>
            <span class="ci-percent">{{ comp.PERCENT }}%</span>
          </div>
          <div class="ci-track">
            <div class="ci-fill" :style="{ width: comp.PERCENT + '%' }" />
          </div>
        </div>
      </div>

      <router-link to="/stats/rules" class="btn btn-outline rules-btn mt-24">
        правила личного и командного зачёта
      </router-link>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStatsStore } from './store'
import AppIcon from '../../components/AppIcon.vue'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()
const store = useStatsStore()
const tab = ref('personal')

// Дефолтные значения для личной статистики
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

// Глобальная статистика
const globalProgress = computed(() => store.global?.GLOBAL_PROGRESS || {
  TOTAL_APPLES: 0, TOTAL_USERS: 0, LECTURES_READ: 0, TASKS_DONE: 0, HABITS_DAYS: 0, STEPS_CONFIRMED: 0
})

const companiesList = computed(() => store.companiesList)

// Вычисляем процент эффективности компании пользователя
const companyPercent = computed(() => {
  if (store.personal?.COMPANY_PERCENT) return store.personal.COMPANY_PERCENT
  if (store.userCompany) return store.userCompany.PERCENT
  return 0
})

function formatNum(n) {
  return Number(n || 0).toLocaleString('ru-RU')
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.init()
})
</script>

<style scoped>
/* Стили остаются без изменений (как в предыдущем файле) */
.stats-page {
  padding-bottom: 90px;
}

/* Табы */
.tabs-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}
.tabs {
  position: relative;
  display: flex;
  background: #FFFFFF;
  border-radius: 100px;
  padding: 4px;
  width: 100%;
  max-width: 320px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
}
.tab {
  flex: 1;
  z-index: 2;
  padding: 10px 0;
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 600;
  text-transform: lowercase;
  color: #6b7268;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.3s;
}
.tab.active { color: #21271f; }
.tab-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: #21271f;
  border-radius: 100px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}
.tab.active { color: #fff; }
.tab { position: relative; }

/* Заголовки */
.page-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 24px;
  line-height: 1.1;
  text-transform: lowercase;
  color: var(--txt-dark-green);
  margin: 0 0 12px;
}
.page-subtitle {
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.4;
  color: var(--txt-black-dark-green);
  margin: 0;
}

/* Яблоки */
.apples-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.apples-label {
  font-size: 15px;
  font-weight: 500;
}
.apples-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1.5px solid #21271f;
  border-radius: 100px;
  padding: 6px 12px;
  font-weight: 700;
  font-size: 16px;
}
.apples-badge.big {
  font-size: 20px;
  padding: 8px 16px;
}

/* Карточка рейтинга */
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

/* Сетка 2х2 */
.grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 4px;
}
.stat-card.full-width {
  grid-column: 1 / -1;
}
.sc-icon {
  width: 32px;
  height: 32px;
  background: #D3FF4F;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #015F01;
  margin-bottom: 8px;
}
.sc-value {
  font-size: 22px;
  font-weight: 800;
  color: #21271f;
  line-height: 1;
}
.sc-label {
  font-size: 12.5px;
  color: var(--txt-black-dark-green);
  line-height: 1.3;
}

/* Кнопка правил */
.rules-btn {
  width: 100%;
  text-align: center;
  text-transform: lowercase;
  font-weight: 600;
  border-color: #015F01;
  color: #015F01;
  padding: 16px;
  border-radius: 100px;
}

/* Общая статистика: Алерт */
.alert-banner {
  background: #D3FF4F;
  color: #015F01;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

/* Эффективность компаний */
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
  display: flex;
  flex-direction: column;
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
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: #21271f;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
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

.mt-16 { margin-top: 16px; }
.mt-24 { margin-top: 24px; }
.mt-32 { margin-top: 32px; }

.card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid var(--border);
}
</style>