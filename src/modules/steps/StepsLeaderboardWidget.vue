<template>
  <section class="leaderboard-widget">
    <header class="lb-header">
      <div class="lb-title">топ-5 среди вашей бизнес-единицы</div>
      <!-- <div class="lb-tabs" ref="tabsRef">
        <button
          type="button"
          :class="{ active: store.leaderboardDate === 'all' }"
          @click="setAll"
        >
          всё
        </button>
        <div class="lb-date-wrap">
          <button
            type="button"
            :class="{ active: store.leaderboardDate !== 'all' }"
            @click.stop="toggleDatePicker"
          >
            <template v-if="store.leaderboardDate !== 'all'">
              {{ formatShortDate(store.leaderboardDate) }}
            </template>
            <template v-else>по дате</template>
          </button>

          <div v-if="showDatePicker" class="lb-date-dropdown" @click.stop>
            <div v-if="!store.availableDates.length" class="lb-date-empty">
              нет доступных дат
            </div>
            <template v-else>
              <button
                v-for="d in store.availableDates"
                :key="d"
                type="button"
                :class="{
                  active: store.leaderboardDate === d,
                  'is-disabled': !probedAvailable(d),
                }"
                :disabled="!probedAvailable(d)"
                @click="selectDate(d)"
              >
                {{ formatDateLabel(d) }}
              </button>
            </template>
          </div>
        </div>
      </div> -->
    </header>

    <!-- Скелетон -->
    <div v-if="store.loadingLeaderboard && !store.currentLeaderboard" class="lb-list">
      <div v-for="i in 5" :key="i" class="lb-card skeleton pulse" />
    </div>

    <!-- Пустое состояние
    <div v-else-if="!top5.length" class="lb-empty">
      <p>
        {{ emptyText }}
      </p>
      <button v-if="!store.online" class="btn btn-secondary mt-16" @click="refresh">
        Обновить
      </button>
    </div> -->

    <!-- Список топ-5 -->
    <div v-else-if="!top5.length" class="lb-list">
      <div
        v-for="(user, index) in top5"
        :key="index"
        class="lb-card"
      >
        <div class="color-text-stroke lb-rank">№{{ user.rank }}</div>
        <div class="lb-user">
          <span class="lb-nick">{{ user.nickname }}</span>
        </div>
        <div class="lb-steps">{{ formatNum(user.steps) }} шагов</div>
      </div>
    </div>

    <!-- Дата обновления -->
    <p v-if="store.leaderboardUpdatedAt" class="lb-updated">
      обновлено: {{ formatDate(store.leaderboardUpdatedAt) }}
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStepsStore } from './store'
import { localDate } from '../core/utils/date'

const store = useStepsStore()

const showDatePicker = ref(false)
const tabsRef = ref(null)

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const MONTHS_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

const top5 = computed(() => store.myWorkplaceTop.slice(0, 5))

const emptyText = computed(() => {
  if (store.leaderboardDate === 'all') {
    return 'за этот период пока нет подтверждённых шагов.'
  }
  return `за ${formatDateLabel(store.leaderboardDate)} нет подтверждённых шагов.`
})

function parseIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatShortDate(iso) {
  const d = parseIso(iso)
  if (!d) return 'по дате'
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

function formatDateLabel(iso) {
  const today = localDate()
  if (iso === today) return 'сегодня'
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (iso === localDate(yest)) return 'вчера'
  const d = parseIso(iso)
  if (!d) return iso
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`
}

function probedAvailable(iso) {
  // true / undefined → доступна (пока не проверили — не блокируем)
  // false → точно нет данных
  return store._probedDates[iso] !== false
}

async function toggleDatePicker() {
  if (showDatePicker.value) {
    showDatePicker.value = false
    return
  }
  showDatePicker.value = true

  // Если summary ещё не загружен — даты пусты. Пробуем.
  if (!store.availableDates.length && !store.loadingSummary) {
    await store.loadSummary().catch(() => {})
  }
  if (!store.availableDates.length) return

  // Параллельная проверка доступности (кэшируется)
  store.probeDates(store.availableDates).catch(() => {})
}

function setAll() {
  showDatePicker.value = false
  if (store.leaderboardDate === 'all') return
  store.loadLeaderboard({ date: 'all' })
}

function selectDate(iso) {
  showDatePicker.value = false
  if (store.leaderboardDate === iso) return
  store.loadLeaderboard({ date: iso })
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

function onDocumentClick(e) {
  if (!showDatePicker.value) return
  const el = tabsRef.value
  if (el && el.contains(e.target)) return
  showDatePicker.value = false
}

onMounted(() => {
  store.loadLeaderboard({ date: store.leaderboardDate })
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.leaderboard-widget {
  display: grid;
  gap: 16px;
}

.lb-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}
.lb-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 28px;
  line-height: 87%;
  letter-spacing: -0.02em;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}

.lb-tabs {
  display: flex;
  background: #fff;
  border-radius: 100px;
  padding: 2px;
  border: 1px solid var(--dark);
  flex-shrink: 0;
  position: relative;
}
.lb-tabs > button {
  background: transparent;
  border: none;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dark);
  cursor: pointer;
}
.lb-tabs > button.active {
  background: var(--dark);
  color: var(--white);
}

/* ─── Date picker ─── */
.lb-date-wrap {
  position: relative;
  display: inline-flex;
}
.lb-date-wrap > button {
  background: transparent;
  border: none;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dark);
  cursor: pointer;
  white-space: nowrap;
}
.lb-date-wrap > button.active {
  background: var(--dark);
  color: var(--white);
}

.lb-date-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  max-height: 260px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
  padding: 4px;
  display: grid;
  gap: 2px;
  z-index: 10;
}
.lb-date-dropdown button {
  background: transparent;
  border: none;
  text-align: left;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dark);
  cursor: pointer;
  white-space: nowrap;
}
.lb-date-dropdown button:hover:not(:disabled) {
  background: #f1f3e9;
}
.lb-date-dropdown button.active {
  background: var(--dark);
  color: var(--white);
}
.lb-date-dropdown button.is-disabled {
  color: #b9beb3;
  cursor: not-allowed;
}
.lb-date-empty {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  white-space: nowrap;
}

/* ─── Список ─── */
.lb-list {
  display: grid;
  gap: 16px;
}
.lb-card {
  position: relative;
  border-radius: 14px;
  padding: 16px 10px;
  background: var(--white);
  display: flex;
  align-items: center;
  gap: 14px;
}

.lb-rank {
  font-size: 18px;
  line-height: 150%;
  text-transform: lowercase;
  text-wrap: balance;
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
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
}

.lb-steps {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
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