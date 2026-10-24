<template>
  <div class="page stats-page">
    <!-- <header class="head">
      <h1>Статистика</h1>
      <HelpIcon>
        Личная статистика обновляется мгновенно при ваших действиях (лекция,
        задание, привычка) и синхронизируется с сервером раз в час.
        Общая — сводка по всем пользователям.
      </HelpIcon>
    </header> -->

    <div class="tabs" role="tablist">
      <button class="tab" :class="{ active: tab === 'personal' }"
              role="tab" @click="switchTab('personal')">Личная</button>
      <button class="tab" :class="{ active: tab === 'global' }"
              role="tab" @click="switchTab('global')">Общая</button>
      <span class="tab-indicator"
            :style="{ transform: `translateX(${tab === 'personal' ? 0 : 100}%)` }" />
    </div>

    <!-- ─────── ЛИЧНАЯ ─────── -->
    <section v-show="tab === 'personal'" class="pane">
      <p class="muted sync-line">
        <span v-if="store.syncing" class="sync-line-inner">
          <span class="sync-dot is-syncing" /> Синхронизация…
        </span>
        <span v-else-if="!store.online" class="sync-line-inner">
          <span class="sync-dot is-offline" /> Офлайн — данные хранятся локально
        </span>
        <span v-else-if="lastSyncText" class="sync-line-inner">
          <span class="sync-dot is-ok" /> Синхронизировано {{ lastSyncText }}
        </span>
        <span v-else class="sync-line-inner">
          <span class="sync-dot is-ok" /> Локальные данные
        </span>
      </p>

      <!-- Фильтр периода -->
      <div class="periods" role="tablist">
        <button
          v-for="p in periods"
          :key="p.key"
          type="button"
          class="period-chip"
          :class="{ active: store.period === p.key }"
          @click="store.setPeriod(p.key)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Офлайн-очередь -->
      <transition name="fade">
        <section v-if="queue.total > 0" class="queue-card">
          <header class="qc-head">
            <span class="qc-icon" aria-hidden="true">📤</span>
            <div>
              <h3 class="qc-title">Офлайн-очередь</h3>
              <p class="muted qc-sub">
                {{ queue.total }} {{ plural(queue.total, ['отметка', 'отметки', 'отметок']) }}
                ждут отправки
              </p>
            </div>
          </header>
          <ul class="qc-list">
            <li v-if="queue.lectures">
              <span>Лекции</span>
              <span class="qc-count">{{ queue.lectures }}</span>
            </li>
            <li v-if="queue.tasks">
              <span>Задания</span>
              <span class="qc-count">{{ queue.tasks }}</span>
            </li>
            <li v-if="queue.habits">
              <span>Привычки</span>
              <span class="qc-count">{{ queue.habits }}</span>
            </li>
            <li v-if="queue.profile">
              <span>Профиль</span>
              <span class="qc-count">{{ queue.profile }}</span>
            </li>
          </ul>
          <p class="muted qc-note">
            Будут отправлены автоматически при появлении интернета.
          </p>
        </section>
      </transition>

      <!-- 1. Ключевые числа -->
      <div class="grid">
        <div v-for="c in keyCards" :key="c.key" class="stat-card card rise">
          <span class="stat-emoji">{{ c.emoji }}</span>
          <span class="stat-value">{{ c.value }}</span>
          <span class="stat-label muted">{{ c.label }}</span>
        </div>
      </div>

      <!-- 2. Активность за 7 дней -->
      <section class="block">
        <h3 class="block-title">Активность за 7 дней</h3>
        <div class="week-chart">
          <div
            v-for="d in weekChart"
            :key="d.date"
            class="wc-col"
            :class="{ 'is-today': d.isToday }"
            :title="d.tooltip"
          >
            <span class="wc-count muted">{{ d.count || '' }}</span>
            <div class="wc-bar-wrap">
              <div
                class="wc-bar"
                :class="{ 'has-value': d.count > 0 }"
                :style="{ height: d.height + '%' }"
              />
            </div>
            <span class="wc-label">{{ d.shortLabel }}</span>
          </div>
        </div>
      </section>

      <!-- 3. Разбивка по направлениям -->
      <section class="block">
        <h3 class="block-title">По направлениям</h3>
        <ul class="breakdown">
          <li v-for="t in themeBreakdown" :key="t.id">
            <span class="bd-label">
              <span v-if="t.emoji" aria-hidden="true">{{ t.emoji }}</span>
              {{ t.label }}
            </span>
            <span class="bd-value">{{ t.value }}</span>
            <div class="bd-bar-wrap">
              <div class="bd-bar" :style="{ width: t.percent + '%' }" />
            </div>
          </li>
        </ul>
      </section>

      <!-- 4. Разбивка по привычкам -->
      <section class="block">
        <h3 class="block-title">По привычкам</h3>
        <ul class="breakdown">
          <li v-for="h in habitBreakdown" :key="h.id">
            <span class="bd-label">
              <span aria-hidden="true">{{ h.emoji }}</span>
              {{ h.label }}
            </span>
            <span class="bd-value">{{ h.value }}</span>
            <div class="bd-bar-wrap">
              <div class="bd-bar" :style="{ width: h.percent + '%' }" />
            </div>
          </li>
        </ul>
      </section>

      <p v-if="!store.hasLocalData" class="muted empty-hint">
        Пока нет активности. Прочитайте лекцию, выполните задание или привычку —
        счётчики появятся здесь.
      </p>
    </section>

    <!-- ─────── ОБЩАЯ ─────── -->
    <section v-show="tab === 'global'" class="pane">
      <p class="muted sync-line">
        <span v-if="store.loadingGlobal" class="sync-line-inner">
          <span class="sync-dot is-syncing" /> Обновление…
        </span>
        <span v-else-if="!store.online && !store.global" class="sync-line-inner">
          <span class="sync-dot is-offline" /> Нет подключения
        </span>
        <span v-else-if="lastGlobalText" class="sync-line-inner">
          <span class="sync-dot is-ok" /> Обновлено {{ lastGlobalText }}
        </span>
        <span v-else class="sync-line-inner">
          <span class="sync-dot is-ok" /> Ожидание данных
        </span>
      </p>

      <div v-if="store.loadingGlobal && !store.global" class="grid">
        <div v-for="n in 4" :key="n" class="card skeleton pulse">
          <div class="sk-line sk-line--title" />
          <div class="sk-line sk-line--text short" />
        </div>
      </div>

      <div v-else-if="store.errorGlobal && !store.global" class="empty">
        <span class="empty-emoji">📡</span>
        <h3>Не удалось загрузить</h3>
        <p class="muted">Проверьте соединение и попробуйте снова.</p>
        <button class="ghost" :disabled="!store.online" @click="manualGlobal">
          Попробовать снова
        </button>
      </div>

      <div v-else-if="store.global" class="grid">
        <div v-for="c in globalCards" :key="c.key" class="stat-card card rise">
          <span class="stat-emoji">{{ c.emoji }}</span>
          <span class="stat-value">{{ c.value }}</span>
          <span class="stat-label muted">{{ c.label }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import HelpIcon from '../../components/HelpIcon.vue'
import { useStatsStore } from './store'
import { useThemeStore } from '../theme/store'
import { themesComputed, getTheme } from '../theme/themes'
import { habitsComputed } from '../habits/config'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const store = useStatsStore()
const theme = useThemeStore()
const toast = useToast()

const tab = ref('personal')

const periods = [
  { key: 'today', label: 'Сегодня' },
  { key: '7d',    label: '7 дней' },
  { key: '30d',   label: '30 дней' },
  { key: 'all',   label: 'Всё' },
]

// ─── Ключевые числа ───
const keyCards = computed(() => [
  { key: 'l', emoji: '📖', value: store.personal.LECTURES_READ, label: 'Лекций прочитано' },
  { key: 't', emoji: '🎯', value: store.personal.TASKS_DONE,    label: 'Заданий выполнено' },
  { key: 'h', emoji: '✨', value: store.personal.HABITS_DONE,   label: 'Привычек отмечено' },
  { key: 's', emoji: '🔥', value: store.personal.STREAK,        label: 'Дней подряд' },
])

// ─── 7-дневный график ───
const weekdays = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

/** Парсит 'YYYY-MM-DD' как локальную дату (без UTC-сдвига). */
function parseLocalDate(str) {
  const [y, m, d] = String(str).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function pad2(n) { return String(n).padStart(2, '0') }

const weekChart = computed(() => {
  const data = store.weekActivity
  const max = Math.max(1, ...data.map((d) => d.count || 0))

  const todayKey = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  })()

  return data.map((d) => {
    const dateObj = parseLocalDate(d.date)
    const height = Math.round((d.count / max) * 100)
    const parts = []
    if (d.localCount)  parts.push(`локально: ${d.localCount}`)
    if (d.serverCount) parts.push(`сервер: ${d.serverCount}`)
    const tooltip = parts.length
      ? `${d.date} — ${d.count} (${parts.join(', ')})`
      : `${d.date} — нет активности`

    return {
      ...d,
      height,
      shortLabel: weekdays[dateObj.getDay()],
      isToday: d.date === todayKey,
      tooltip,
    }
  })
})

// ─── Разбивка по направлениям ───
const themeBreakdown = computed(() => {
  const b = store.byTheme
  const items = [
    { id: 'general',  label: 'Общие',   emoji: '🌐', value: b.general  || 0 },
    { id: 'charging', label: 'Зарядка', emoji: '⚡', value: b.charging || 0 },
    ...themesComputed.value.map((t) => ({
      id: t.id, label: t.name, emoji: t.emoji, value: b[t.id] || 0,
    })),
  ]
  const max = Math.max(1, ...items.map((i) => i.value))
  return items.map((i) => ({ ...i, percent: Math.round((i.value / max) * 100) }))
})

// ─── Разбивка по привычкам ───
const habitBreakdown = computed(() => {
  const b = store.byHabit
  const items = habitsComputed.value.map((h) => ({
    id: h.id, label: h.title, emoji: h.emoji, value: b[h.id] || 0,
  }))
  const max = Math.max(1, ...items.map((i) => i.value))
  return items.map((i) => ({ ...i, percent: Math.round((i.value / max) * 100) }))
})

// ─── Общая ───
const globalCards = computed(() => {
  const g = store.global
  if (!g) return []
  return [
    { key: 'u', emoji: '👥', value: g.USERS,         label: 'Пользователей' },
    { key: 'l', emoji: '📖', value: g.LECTURES_READ, label: 'Прочтений всего' },
    { key: 't', emoji: '🎯', value: g.TASKS_DONE,    label: 'Заданий выполнено' },
    { key: 'h', emoji: '✨', value: g.HABITS_DONE,   label: 'Привычек отмечено' },
    { key: 'p', emoji: '🏆', value: themeName(g.TOP_THEME), label: 'Топ-направление' },
  ]
})

// ─── Офлайн-очередь ───
const queue = computed(() => store.queueInfo)

function plural(n, forms) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

// ─── Утилиты ───
const lastSyncText = computed(() => formatAgo(store.times.lastSyncAt))
const lastGlobalText = computed(() => formatAgo(store.times.lastGlobalAt))

function formatAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} ч назад`
  const d = new Date(ts)
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function themeName(id) { return getTheme(id)?.name || id || '—' }

function switchTab(t) {
  if (tab.value === t) return
  tab.value = t
  if (t === 'global') store.loadGlobal()
  else store.syncPersonal()
}
function manualGlobal() {
  if (!store.online) { toast.warn('Нет сети'); return }
  store.loadGlobal({ force: true })
}

watch(() => store.errorGlobal, (v) => {
  if (!v || v === 'OFFLINE_EMPTY') return
  toast.error(v)
})

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  theme.load()
  store.init()
  store.refreshQueueInfo()
})
</script>

<style scoped>
.head { display: flex; align-items: center; gap: 8px; }
.head h1 { margin: 0; }

.sync-line { font-size: 12px; margin: 0 0 12px; min-height: 16px; }
.sync-line-inner { display: inline-flex; align-items: center; gap: 6px; }
.sync-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
.sync-dot.is-ok      { background: #2e7d32; }
.sync-dot.is-offline { background: #b58500; }
.sync-dot.is-syncing { background: var(--accent); animation: pulse 1s ease-in-out infinite; }

/* ─── Офлайн-очередь ─── */
.queue-card {
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid #FBE5C6;
  background: #FFF8EC;
  border-radius: var(--radius);
  animation: riseIn var(--t-slow) both;
}
.qc-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}
.qc-icon {
  font-size: 22px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}
.qc-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.qc-sub {
  margin: 2px 0 0;
  font-size: 12.5px;
}
.qc-list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: grid;
  gap: 6px;
}
.qc-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  color: var(--text);
  padding: 4px 0;
  border-bottom: 1px dashed rgba(0,0,0,.06);
}
.qc-list li:last-child { border-bottom: none; }
.qc-count {
  font-weight: 700;
  color: #b58500;
  font-variant-numeric: tabular-nums;
}
.qc-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.pane { animation: fadePane var(--t-base) both; }
@keyframes fadePane {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Ключевые числа ─── */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 380px) { .grid { grid-template-columns: 1fr; } }

.stat-card {
  display: flex; flex-direction: column; gap: 4px;
  padding: 16px 14px; text-align: left;
  transition: transform var(--t-base), box-shadow var(--t-base);
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-1); }
.stat-emoji { font-size: 20px; }
.stat-value {
  font-size: 26px; font-weight: 700;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}
.stat-label { font-size: 12.5px; }

/* ─── Блоки ─── */
.block { margin-top: 22px; }
.block-title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* ─── 7-дневный график ─── */
.week-chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  align-items: end;
  height: 140px;
  padding: 8px 0 0;
}
.wc-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
}
.wc-count {
  font-size: 11px;
  min-height: 14px;
  font-variant-numeric: tabular-nums;
}
.wc-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  background: #f3f3f3;
  border-radius: 6px;
  overflow: hidden;
  min-height: 20px;
}
.wc-bar {
  width: 100%;
  background: var(--accent);
  border-radius: 6px;
  transition: height var(--t-slow);
}
.wc-bar.has-value { min-height: 3px; }

.wc-col.is-today .wc-bar-wrap {
  outline: 1.5px solid var(--accent);
  outline-offset: 2px;
}
.wc-col.is-today .wc-label {
  color: var(--text);
  font-weight: 700;
}

.wc-label { font-size: 11px; color: var(--muted); }

/* ─── Разбивка (по темам и привычкам) ─── */
.breakdown {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.breakdown li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 10px;
  align-items: center;
}
.bd-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13.5px; font-weight: 600;
}
.bd-value {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.bd-bar-wrap {
  grid-column: 1 / -1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 999px;
  overflow: hidden;
}
.bd-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width var(--t-slow);
}

.empty-hint { font-size: 13px; text-align: center; margin-top: 20px; }

.empty {
  text-align: center; padding: 40px 12px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
}
.empty-emoji { font-size: 44px; }
.empty h3 { margin: 4px 0 0; }

.skeleton { padding: 16px; }
.sk-line { height: 12px; border-radius: 6px; background: #eee; margin-bottom: 8px; }
.sk-line--title { width: 40%; height: 18px; }
.sk-line--text.short { width: 60%; margin-bottom: 0; }
</style>