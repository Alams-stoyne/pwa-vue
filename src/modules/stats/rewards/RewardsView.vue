<template>
  <div class="page rewards-page">
    <!-- <div class="tabs" role="tablist">
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
    </div> -->

    <!-- <div v-if="store.partial" class="partial-hint">
      часть истории не загрузилась — потяните вниз, чтобы повторить
    </div> -->

    <div class="rewards-wrap">
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
          <div v-if="loading && !earnedGrouped.length" class="state muted">загрузка…</div>

          <template v-else-if="earnedGrouped.length">
            <!-- <div class="card total-row">
              <span class="total-label">всего заработано:</span>
              <span class="total-value">
                {{ formatNum(store.totalEarned) }}
                <span class="apple"><AppIcon name="apple" :size="22" /></span>
              </span>
            </div> -->

            <section v-for="g in earnedGrouped" :key="g.date" class="date-group">
              <div class="date-label">{{ formatDate(g.date) }}</div>
              <div class="items">
                <component
                  :is="itemLink(item).clickable ? 'router-link' : 'div'"
                  v-for="(item, idx) in g.items"
                  :key="itemKey(item, 'earned', g.date, idx)"
                  :to="itemLink(item).to"
                  class="card reward-card"
                  :class="{ clickable: itemLink(item).clickable }"
                >
                  <div
                    v-if="item._lecture"
                    class="reward-cover"
                    :style="coverStyle(item._lecture)"
                  />
                  <div class="reward-main">
                    <div class="reward-title">{{ item._lecture?.title || item.TITLE }}</div>
                    <div class="reward-meta">
                      <span class="badge badge--type">{{ typeLabel(item.TYPE) }}</span>
                      <span
                        v-if="item._lecture && lectureThemeName(item._lecture)"
                        class="badge badge--theme"
                      >{{ lectureThemeName(item._lecture) }}</span>
                    </div>
                  </div>
                  <span class="item-points">
                    +{{ formatNum(item.POINTS) }}
                    <span class="apple"><AppIcon name="apple" :size="18" /></span>
                  </span>
                </component>
              </div>
            </section>
          </template>

          <div v-else-if="error" class="state error">{{ error }}</div>

          <div v-else class="empty-block">
            <div class="empty-title">пока нет начислений</div>
            <div class="empty-text">
              выполните действие на главной или в разделе «Обучение» — здесь появятся яблоки за них.
            </div>
          </div>
        </section>

        <!-- ── ТАБ «ПРОСМОТРЕНО» ── -->
        <section v-show="tab === 'pending'" class="pane">
          <div v-if="loading && !pendingGrouped.length" class="state muted">загрузка…</div>

          <template v-else-if="pendingGrouped.length">
            <p class="pending-hint muted">
              материалы, по которым награда ещё не начислена
            </p>

            <section v-for="g in pendingGrouped" :key="g.date" class="date-group">
              <div class="date-label">{{ formatDate(g.date) }}</div>
              <div class="items">
                <component
                  :is="itemLink(item).clickable ? 'router-link' : 'div'"
                  v-for="(item, idx) in g.items"
                  :key="itemKey(item, 'pending', g.date, idx)"
                  :to="itemLink(item).to"
                  class="card reward-card"
                  :class="{ clickable: itemLink(item).clickable }"
                >
                  <div
                    v-if="item._lecture"
                    class="reward-cover"
                    :style="coverStyle(item._lecture)"
                  />
                  <div class="reward-main">
                    <div class="reward-title">{{ item._lecture?.title || item.TITLE }}</div>
                    <div class="reward-meta">
                      <span class="badge badge--type">{{ typeLabel(item.TYPE) }}</span>
                      <span
                        v-if="item._lecture && lectureThemeName(item._lecture)"
                        class="badge badge--theme"
                      >{{ lectureThemeName(item._lecture) }}</span>
                      <span class="badge" :class="reasonClass(item.REASON)">
                        {{ reasonLabel(item) }}
                      </span>
                    </div>
                  </div>
                  <span
                    v-if="Number(item.POINTS) > 0"
                    class="item-points item-points--muted"
                  >
                    ожидалось +{{ formatNum(item.POINTS) }}
                    <span class="apple"><AppIcon name="apple" :size="18" /></span>
                  </span>
                </component>
              </div>
            </section>
          </template>

          <div v-else-if="error" class="state error">{{ error }}</div>

          <div v-else class="empty-block">
            <div class="empty-title">пока нет информации</div>
            <div class="empty-text">
              здесь появятся материалы, за которые награда не начислена, но материал просмотрен.
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
import { getTheme } from '../../theme/themes'
import AppIcon from '../../../components/AppIcon.vue'
import { useAppBackground } from '../../core/composables/useAppBackground'

const { setBackground } = useAppBackground()
const store = useRewardsStore()

const tab = ref('earned')
const scrollRef = ref(null)

// ── Маппинги ──────────────────────────────────────────────
const TYPE_LABELS = {
  lecture:         'лекция',
  lecture_theme:   'лекция',
  lecture_general: 'общая лекция',
  charging:        'зарядка',
  task:            'практика',
  task_completed:  'практика',
  habit:           'привычка',
  steps:           'шаги',
  steps_sent:      'шаги',
  steps_approved:  'шаги',
  event:           'событие',
  reflection:      'рефлексия',
}
const REASON_LABELS = {
  LIMIT_OR_NO_POINTS:  'лимит или без награды',
  LIMIT_REACHED:       'дневной лимит исчерпан',
  MODERATION_PENDING:  'на проверке',
  MODERATION_REJECTED: 'отклонено модератором',
  ZERO_REWARD:         'без награды',
}

function typeLabel(type) { return TYPE_LABELS[type] || type || 'активность' }
function reasonLabel(item) {
  return item.REASON_LABEL || REASON_LABELS[item.REASON] || 'не начислено'
}
function reasonClass(reason) {
  return {
    'badge--limit':    reason === 'LIMIT_OR_NO_POINTS' || reason === 'LIMIT_REACHED',
    'badge--pending':  reason === 'MODERATION_PENDING',
    'badge--rejected': reason === 'MODERATION_REJECTED',
    'badge--zero':     reason === 'ZERO_REWARD',
    'badge--unknown':  !REASON_LABELS[reason],
  }
}

// Название направления из bucket лекции (lecture-energy → энергия)
function lectureThemeName(lecture) {
  const bucket = lecture?.bucket || ''
  if (!bucket.startsWith('lecture-')) return ''
  if (bucket === 'lecture-general' || bucket === 'lecture-charging') return ''
  const id = bucket.replace(/^lecture-/, '')
  return getTheme(id)?.name?.toLowerCase() || ''
}

function coverStyle(lecture) {
  if (!lecture?.cover) return {}
  return { backgroundImage: `url("${lecture.cover}")` }
}

/**
 * Переход возможен только для лекций (у них есть _lecture из IDB).
 * Практики, привычки, шаги, события, рефлексия — некликабельны.
 */
function itemLink(item) {
  if (item._lecture?.dbKey) {
    return {
      clickable: true,
      to: {
        path: `/training/lectures/${encodeURIComponent(item._lecture.dbKey)}`,
        query: { from: 'rewards' },
      },
    }
  }
  return { clickable: false, to: undefined }
}
// ── Группировка по датам ──────────────────────────────────
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
        const ta = a.CREATED_AT ? new Date(a.CREATED_AT).getTime() : 0
        const tb = b.CREATED_AT ? new Date(b.CREATED_AT).getTime() : 0
        return tb - ta
      }),
    }))
}

const earnedGrouped = computed(() => groupByDate(store.earned))
const pendingGrouped = computed(() => groupByDate(store.pending))

function itemKey(item, tabName, date, idx) {
  if (item.ID != null) return `id_${item.ID}`
  if (item.ACTION_ID) return `action_${item.ACTION_ID}_${item.TYPE || ''}`
  return `${tabName}_${date}_${item.TYPE || 'x'}_${idx}`
}

// ── Форматирование ────────────────────────────────────────
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

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  if (store.loading || isRefreshing.value) return
  store.load().catch(() => {})
}

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
/* ── Только то, чего нет в style.css ── */

.rewards-page {
  position: relative;
  display: grid;
  gap: 16px;
  align-content: start;
  max-height: 100dvh;
}

.rewards-wrap {
  position: relative;
  overflow: hidden;
  max-height: calc(100dvh - 180px);
  border-radius: 14px;
}
.rewards-scroll {
  position: relative;
  height: 100%;
  max-height: calc(100dvh - 180px);
  overflow-y: auto;
  scrollbar-width: none;
  overscroll-behavior-y: contain;
  transition: transform 0.25s ease;
  padding: 4px 0;
}
.rewards-scroll.is-pulling { transition: none; }
.rewards-scroll::-webkit-scrollbar { display: none; }

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

.partial-hint {
  padding: 10px 12px;
  background: #FFF8EC;
  border: 1px solid #FBE5C6;
  border-radius: 10px;
  font-family: var(--font-family);
  font-size: 12.5px;
  line-height: 1.4;
  color: #7a4b00;
  text-transform: lowercase;
  text-wrap: balance;
}

.pane { display: grid; gap: 16px; padding: 4px 0 16px; }

.state {
  text-align: center;
  padding: 32px 16px;
  font-size: 14px;
}

.pending-hint { margin: 0; font-size: 12.5px; }

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 0;
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

.date-group { display: grid; gap: 8px; }
.date-label {
  padding: 8px 4px 0;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12.5px;
  letter-spacing: .04em;
  text-transform: lowercase;
  color: var(--muted);
}
.items { display: grid; gap: 8px; }

.reward-card {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  margin-bottom: 0;
}
.reward-cover {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 10px;
  background-color: var(--grey-light);
  background-size: cover;
  background-position: center;
}
.reward-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 6px;
}
.reward-title {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  line-height: 1.35;
  color: var(--txt-black-dark-green);
  text-transform: lowercase;
  word-break: break-word;
}
.reward-meta {
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

.badge {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: var(--font-family);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-transform: lowercase;
  white-space: nowrap;
}
.badge--type    { background: var(--grey-light); color: var(--txt-black-dark-green); }
.badge--theme   { background: var(--bg-green-light); color: var(--txt-dark-green); }
.badge--limit   { background: #FFF8EC; color: #7a4b00; }
.badge--pending { background: #FFF8EC; color: #7a4b00; }
.badge--rejected { background: #FFF1F0; color: #7a1710; }
.badge--zero    { background: var(--grey-light); color: var(--muted); }
.badge--unknown { background: var(--grey-light); color: var(--muted); }
</style>