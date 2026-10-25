<template>
  <div class="page stats-page page--bottom-action-one">
    <!-- Табы -->

    <div class="tabs" role="tablist">
        <button class="tab" :class="{ active: tab === 'personal' }" role="tab" :aria-selected="tab === 'personal'" @click="tab = 'personal'">личная</button>
        <button class="tab" :class="{ active: tab === 'global' }" role="tab" :aria-selected="tab === 'global'" @click="tab = 'global'">общая</button>
        <span class="tab-indicator" :style="{ transform: `translateX(${tab === 'personal' ? 0 : 100}%)` }" />
    </div>

    <!-- ЛИЧНАЯ СТАТИСТИКА -->
    <section v-show="tab === 'personal'" class="pane personal">
      <div class="head">
        <div class="title">ваш прогресс</div>
        <!-- <div class="subtitle">ваши действия добавляют вклад в результат команды на протяжении всей недели</div>         -->
      </div>

      <div class="grid-stat">
        <div class="apples-row">
          <span class="apples-label">у вас:</span>
          <div class="btn-badge">
            {{ formatNum(store.apples) }}<AppIcon name="apple" :size="24" />
          </div>
        </div>
        <div class="card stat-card">
          <div class="info">
            <div class="sc-icon"><AppIcon name="crown" :size="24" /></div>
            <div class="sc-value">{{  formatNum(personal.RANK) }}</div>            
          </div>
          <div class="sc-label">ваше место среди всех участников</div>
        </div>  
        <!-- Сетка 2х2 -->
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

    <!-- ОБЩАЯ СТАТИСТИКА -->
    <section v-show="tab === 'global'" class="pane global">
      <div class="head">
        <div class="title">общий зачёт компаний х5</div>
        <div class="subtitle">ваши действия добавляют вклад в результат команды на протяжении всей недели</div>        
      </div>

      <!-- Сетка 2х2 для общей статистики -->
      <div class="grid-stat">
        <div class="apples-row">
          <span class="apples-label">общее количество яблок:</span>
          <div class="btn-badge">
            {{ formatNum(globalProgress.TOTAL_APPLES) }} <AppIcon name="apple" :size="24" />
          </div>
        </div>       
        <div class="card stat-card">
          <div class="info">
            <div class="sc-icon"><AppIcon name="user" :size="24" /></div>
            <div class="sc-value">+{{ formatNum(globalProgress.TOTAL_USERS) }}</div>            
          </div>
          <div class="sc-label">участников присоединилось</div>
        </div>    

        <div class="grid-2x2">
          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="book" :size="24" /></div>
              <div class="sc-value">{{ formatNum(globalProgress.LECTURES_READ) }}</div>              
            </div>
            <div class="sc-label">просмотрено лекций</div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="tasks" :size="24" /></div>
              <div class="sc-value">{{ formatNum(globalProgress.TASKS_DONE) }}</div>              
            </div>
            <div class="sc-label">выполнено практик</div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="juice" :size="24" /></div>
              <div class="sc-value">{{ formatNum(globalProgress.HABITS_DAYS) }}</div>              
            </div>
            <div class="sc-label">общее кол-во дней привычки</div>
          </div>

          <div class="card stat-card">
            <div class="info">
              <div class="sc-icon"><AppIcon name="steps" :size="24" /></div>
              <div class="sc-value">{{ formatNum(globalProgress.STEPS_CONFIRMED) }}</div>              
            </div>
            <div class="sc-label">подтверждено шагов за период марафона</div>
          </div>        
        </div>
      </div>

      <div class="effective">
        <!-- Эффективность компаний -->
        <div class="head">
          <div class="title">ваша эффективность</div>
          <div class="company-progress-bar-wrap">
            <div class="cpb-label">{{ companyPercent }}%</div>
            <div class="cpb-track">
              <div class="cpb-fill" :style="{ width: companyPercent + '%' }" />
            </div>
          </div>          
        </div>
        <!-- <div class="page-title mt-32">ваша эффективность</div>       -->

        <div class="companies-list">
          <!-- ▼ ИСПОЛЬЗУЕМ companiesList ▼ -->
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
    <div class="bottom-action">
      <router-link to="/stats/rules" class="btn btn-primary btn-center">
        <div class="text">правила</div>        
      </router-link>      
    </div>
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
  position: relative;
  display: grid;
  gap: 32px;
  align-items: start;
  align-content: start;
}

.pane{
  position: relative;
  display: grid;
  gap: 32px;
}

.pane .head{
  position: relative;
  display: grid;
  gap: 16px;
  font-family: var(--font-family);  
  text-transform: lowercase;
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

/* Яблоки */
.apples-row {
  display: flex;
  align-items: center;
  gap: 8px;
  /* margin-bottom: 16px; */
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
/* .apples-badge {
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
} */

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
.grid-stat {
  display: grid;
  gap: 16px;
}
/* Сетка 2х2 */
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

.mt-16 { margin-top: 16px; }
.mt-24 { margin-top: 24px; }
.mt-32 { margin-top: 32px; }

.grid-stat .card {
  border-radius: 14px;
  padding: 16px 10px;
  background: var(--white);
}
.grid-stat .card {
  margin: 0;
}
</style>