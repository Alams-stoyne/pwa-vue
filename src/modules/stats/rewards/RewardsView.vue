<template>
  <div class="page rewards-page">
    <div class="tabs" role="tablist">
      <button
        class="tab"
        :class="{ active: tab === 'earned' }"
        role="tab"
        :aria-selected="tab === 'earned'"
        @click="tab = 'earned'"
      >получены яблоки</button>
      <button
        class="tab"
        :class="{ active: tab === 'pending' }"
        role="tab"
        :aria-selected="tab === 'pending'"
        @click="tab = 'pending'"
      >просмотрено</button>
      <span
        class="tab-indicator"
        :style="{ transform: `translateX(${tab === 'earned' ? 0 : 100}%)` }"
      />
    </div>

    <div class="rewards-wrap">
      <!-- Индикатор pull-to-refresh -->
      <div
        class="pull-indicator"
        :class="{ 'is-ready': isReady, 'is-refreshing': isRefreshing }"
        :style="{ transform: `translateY(calc(-100% + ${pullOffset}px))` }"
        aria-hidden="true"
      >
        <span v-if="isRefreshing" class="pull-spinner">↻</span>
        <span v-else class="pull-arrow" :class="{ 'is-ready': isReady }">↓</span>
        <span class="pull-text">{{ pullText }}</span>
      </div>

      <div
        ref="scrollRef"
        class="rewards-scroll"
        :class="{ 'is-pulling': isPulling }"
        :style="{ transform: `translateY(${pullOffset}px)` }"
        v-bind="pullHandlers"
      >
        <!-- ── ТАБ «ПОЛУЧЕНЫ ЯБЛОКИ» ── -->
        <section v-show="tab === 'earned'" class="pane">
          <div v-if="loading && !earnedGrouped.length" class="state">загрузка…</div>

          <template v-else-if="earnedGrouped.length">
            <div class="total-row">
              <span class="total-label">всего заработано:</span>
              <span class="total-value">
                {{ formatNum(totalEarnedDisplay) }}
                <span class="apple"><AppIcon name="apple" :size="22" /></span>
              </span>
            </div>

            <section v-for="g in earnedGrouped" :key="g.date" class="date-group">
              <div class="date-label">{{ formatDate(g.date) }}</div>
              <div class="items">
                <div v-for="item in g.items" :key="item.ID || item.SOURCE_ID" class="item">
                  <span class="item-emoji">{{ typeEmoji(item.TYPE) }}</span>
                  <div class="item-main">
                    <div class="item-title">{{ item.TITLE }}</div>
                    <div class="item-meta">
                      <span class="badge badge--type">{{ typeLabel(item.TYPE) }}</span>
                    </div>
                  </div>
                  <span class="item-points">
                    +{{ formatNum(item.POINTS) }}
                    <span class="apple"><AppIcon name="apple" :size="18" /></span>
                  </span>
                </div>
              </div>
            </section>
          </template>

          <div v-else-if="error" class="state state--error">{{ error }}</div>

          <div v-else class="empty">
            <div class="empty-emoji">🍏</div>
            <div class="empty-title">пока нет начислений</div>
            <div class="empty-text">
              Выполните действие на главной или в разделе «Обучение» — здесь появятся яблоки за них.
            </div>
          </div>
        </section>

        <!-- ── ТАБ «ПРОСМОТРЕНО» ── -->
        <section v-show="tab === 'pending'" class="pane">
          <div v-if="loading && !pendingGrouped.length" class="state">загрузка…</div>

          <template v-else-if="pendingGrouped.length">
            <p class="pending-hint muted">
              материалы, по которым награда ещё не начислена
            </p>

            <section v-for="g in pendingGrouped" :key="g.date" class="date-group">
              <div class="date-label">{{ formatDate(g.date) }}</div>
              <div class="items">
                <div v-for="item in g.items" :key="item.ID || item.SOURCE_ID" class="item">
                  <span class="item-emoji">{{ typeEmoji(item.TYPE) }}</span>
                  <div class="item-main">
                    <div class="item-title">{{ item.TITLE }}</div>
                    <div class="item-meta">
                      <span class="badge badge--type">{{ typeLabel(item.TYPE) }}</span>
                      <span class="badge" :class="reasonClass(item.REASON)">{{ reasonLabel(item) }}</span>
                    </div>
                  </div>
                  <span
                    v-if="Number(item.POINTS) > 0"
                    class="item-points item-points--muted"
                  >
                    ожидалось +{{ formatNum(item.POINTS) }}
                    <span class="apple"><AppIcon name="apple" :size="18" /></span>
                  </span>
                </div>
              </div>
            </section>
          </template>

          <div v-else-if="error" class="state state--error">{{ error }}</div>

          <div v-else class="empty">
            <div class="empty-emoji">✨</div>
            <div class="empty-title">всё засчитано</div>
            <div class="empty-text">
              Здесь появятся материалы, за которые награда ещё не начислена.
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRewardsStore } from './store'
import { usePullToRefresh } from '../../core/composables/usePullToRefresh'
import AppIcon from '../../../components/AppIcon.vue'
import { useAppBackground } from '../../core/composables/useAppBackground'

const { setBackground } = useAppBackground()
const store = useRewardsStore()

const tab = ref('earned')
const scrollRef = ref(null)

// ── Группировка по датам ──────────────────────────────────
const TYPE_LABELS = {
  lecture_theme:   'лекция',
  lecture_general: 'общая лекция',
  charging:        'зарядка',
  task:            'практика',
  habit:           'привычка',
  steps:           'шаги',
  event:           'событие',
  reflection:      'рефлексия',
}
const TYPE_EMOJI = {
  lecture_theme:   '📖',
  lecture_general: '🌐',
  charging:        '⚡',
  task:            '🏃',
  habit:           '💧',
  steps:           '👟',
  event:           '🎉',
  reflection:      '📝',
}
const REASON_LABELS = {
  LIMIT_REACHED:       'дневной лимит исчерпан',
  MODERATION_PENDING:  'на проверке',
  MODERATION_REJECTED: 'отклонено модератором',
  ZERO_REWARD:         'без награды',
}

function typeLabel(type) { return TYPE_LABELS[type] || type || 'активность' }
function typeEmoji(type) { return TYPE_EMOJI[type] || '✨' }
function reasonLabel(item) {
  return item.REASON_LABEL || REASON_LABELS[item.REASON] || 'не начислено'
}
function reasonClass(reason) {
  return {
    'badge--limit':      reason === 'LIMIT_REACHED',
    'badge--pending':    reason === 'MODERATION_PENDING',
    'badge--rejected':   reason === 'MODERATION_REJECTED',
    'badge--zero':       reason === 'ZERO_REWARD',
    'badge--unknown':    !REASON_LABELS[reason],
  }
}

function groupByDate(items) {
  const map = new Map()
  for (const item of items) {
    const d = item.DATE || '—'
    if (!map.has(d)) map.set(d, [])
    map.get(d).push(item)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({
      date,
      items: [...list].sort((a, b) => {
        const ta = a.AT ? new Date(a.AT).getTime() : 0
        const tb = b.AT ? new Date(b.AT).getTime() : 0
        return tb - ta
      }),
    }))
}

const earnedGrouped = computed(() => groupByDate(store.earned))
const pendingGrouped = computed(() => groupByDate(store.pending))

// Итог считаем из массива — на случай, если сервер прислал TOTAL_EARNED с
// другими правилами фильтрации (например, без pending). Всегда согласовано
// с тем, что видит пользователь в списке.
const totalEarnedDisplay = computed(() =>
  earnedGrouped.value.reduce(
    (total, g) => total + g.items.reduce((s, i) => s + (Number(i.POINTS) || 0), 0),
    0,
  ),
)

// ── Утилиты форматирования ────────────────────────────────
function formatNum(n) {
  return Number(n || 0).toLocaleString('ru-RU')
}

const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function formatDate(iso) {
  if (!iso || iso === '—') return iso
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}

// ── Pull-to-refresh ───────────────────────────────────────
const {
  isPulling,
  isRefreshing,
  isReady,
  pullOffset,
  pullText,
  handlers: pullHandlers,
} = usePullToRefresh(
  scrollRef,
  async () => {
    await store.load({ force: true })
  },
  { threshold: 70, maxPull: 100, damping: 0.5 },
)

// ── Автообновление при возврате в приложение ─────────────
function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  if (store.loading || isRefreshing.value) return
  // Если кеш устарел — обновляем в фоне. Если свежий — store.load() сам
  // возьмёт из кеша и не сделает ни одного запроса.
  store.load().catch(() => {})
}

// При переключении табов сбрасываем скролл вверх, чтобы не показывать
// «середину» другого списка
watch(tab, () => {
  if (scrollRef.value) scrollRef.value.scrollTop = 0
})

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  await store.load()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.rewards-page {
  position: relative;
  display: grid;
  gap: 16px;
  align-content: start;
  max-height: 100dvh;
}

/* ─── Табы (как в StatsView) ─── */
.tabs {
  position: relative;
  display: flex;
  background: #fff;
  border-radius: 100px;
  padding: 4px;
  border: 1px solid var(--border);
}
.tab {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px 12px;
  border-radius: 100px;
  font-family: var(--font-family);
  font-size: 13px;
  font-weight: 600;
  color: var(--txt-black-dark-green);
  cursor: pointer;
  text-transform: lowercase;
  z-index: 1;
  transition: color var(--t-fast);
  white-space: nowrap;
}
.tab.active {
  color: #fff;
}
.tab-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  background: var(--txt-dark-green, #015F01);
  border-radius: 100px;
  transition: transform 0.25s ease;
  z-index: 0;
}

/* ─── Обёртка / скролл ─── */
.rewards-wrap {
  position: relative;
  overflow: hidden;
  max-height: calc(100dvh - 220px);
  border-radius: 14px;
}

.rewards-scroll {
  position: relative;
  height: 100%;
  max-height: calc(100dvh - 220px);
  overflow-y: auto;
  scrollbar-width: none;
  overscroll-behavior-y: contain;
  transition: transform 0.25s ease;
  padding: 4px 0;
}
.rewards-scroll.is-pulling {
  transition: none;
}
.rewards-scroll::-webkit-scrollbar {
  display: none;
}

/* ─── Pull-to-refresh ─── */
.pull-indicator {
  position: absolute;
  top: 0; left: 0; right: 0;
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
.pull-indicator.is-ready,
.pull-indicator.is-refreshing { color: var(--txt-green-dsrk); }
.pull-arrow {
  display: inline-block;
  font-size: 18px;
  line-height: 1;
  transition: transform 0.2s ease;
}
.pull-arrow.is-ready { transform: rotate(180deg); }
.pull-spinner {
  display: inline-block;
  font-size: 18px;
  line-height: 1;
  animation: pullSpin 800ms linear infinite;
}
@keyframes pullSpin { to { transform: rotate(360deg); } }

/* ─── Панe / состояния ─── */
.pane {
  display: grid;
  gap: 16px;
  padding: 4px 0 16px;
}

.state {
  text-align: center;
  padding: 32px 16px;
  color: var(--muted);
  font-size: 14px;
}
.state--error {
  color: #B91D0C;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-emoji { font-size: 44px; line-height: 1; }
.empty-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 17px;
  color: var(--txt-black-dark-green);
  text-transform: lowercase;
}
.empty-text {
  font-family: var(--font-family);
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--muted);
  max-width: 320px;
}

.pending-hint {
  margin: 0;
  font-size: 12.5px;
}

/* ─── Итог ─── */
.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 16px;
}
.total-label {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  color: var(--txt-black-dark-green);
  text-transform: lowercase;
}
.total-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--third-family);
  font-weight: 500;
  font-size: 20px;
  color: var(--txt-dark-green);
}
.total-value .apple svg { color: transparent; }

/* ─── Группа дат ─── */
.date-group {
  display: grid;
  gap: 8px;
}
.date-label {
  padding: 8px 4px 0;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12.5px;
  letter-spacing: .04em;
  text-transform: lowercase;
  color: var(--muted);
}

.items {
  display: grid;
  gap: 8px;
}

/* ─── Карточка записи ─── */
.item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
}
.item-emoji {
  flex-shrink: 0;
  font-size: 22px;
  line-height: 1.2;
  width: 28px;
  text-align: center;
}
.item-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}
.item-title {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.35;
  color: var(--txt-black-dark-green);
  text-transform: lowercase;
  word-break: break-word;
}
.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.item-points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-family: var(--third-family);
  font-weight: 500;
  font-size: 14px;
  color: var(--txt-dark-green);
  white-space: nowrap;
}
.item-points .apple svg { color: transparent; }
.item-points--muted {
  color: var(--muted);
  opacity: 0.85;
  font-weight: 400;
}

/* ─── Бейджи ─── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: var(--font-family);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-transform: lowercase;
  white-space: nowrap;
}
.badge--type {
  background: #f0f0f0;
  color: var(--txt-black-dark-green);
}
.badge--limit {
  background: #FFF8EC;
  color: #7a4b00;
}
.badge--pending {
  background: #FFF8EC;
  color: #7a4b00;
}
.badge--rejected {
  background: #FFF1F0;
  color: #7a1710;
}
.badge--zero {
  background: #f0f0f0;
  color: var(--muted);
}
.badge--unknown {
  background: #f0f0f0;
  color: var(--muted);
}
</style>