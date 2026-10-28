<template>
  <div class="page rewards-page">
    <!-- Заглушка при отсутствии согласия на ПД -->
    <div v-if="!consent.isGranted" class="consent-wrap">
      <ConsentBanner
        :class="'relative'"
        text="Для просмотра истории начислений необходимо согласие на обработку персональных данных."
      />
    </div>

    <!-- Основной контент (доступен только при наличии согласия) -->
    <template v-else>
      <!-- Табы: Получены / Эффективность -->
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
          :class="{ active: tab === 'efficiency' }"
          role="tab"
          :aria-selected="tab === 'efficiency'"
          @click="tab = 'efficiency'"
        >эффективность</button>
        <span
          class="tab-indicator"
          :style="{ transform: `translateX(${tab === 'earned' ? 0 : 100}%)` }"
        />
      </div>

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
                    <span class="btn-badge">
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

          <!-- ── ТАБ «ЭФФЕКТИВНОСТЬ» ── -->
          <section v-show="tab === 'efficiency'" class="pane">
            <div v-if="loading && !store.dailyEfficiency.length" class="state muted">загрузка…</div>

            <template v-else-if="store.dailyEfficiency.length">
              <div class="eff-total">
                <div class="eff-total-line">
                  <div class="eff-total-label">средняя эффективность:</div>
                  <div class="eff-total-hint muted">{{ activeDaysLabel }}</div>                  
                </div>
                <div class="eff-total-value color-text-stroke">{{ averagePercentLabel }}</div>
              </div>

              <div class="eff-list">
                <div
                  v-for="d in store.dailyEfficiency"
                  :key="d.DATE"
                  class="eff-row"
                >
                  <div class="eff-head">
                    <span class="eff-date">{{ formatDate(d.DATE) }}</span>
                    <span
                      class="eff-percent"
                      :class="{ 'is-null': d.PERCENT == null }"
                    >{{ formatPercent(d.PERCENT) }}</span>
                  </div>
                  <div class="eff-bar">
                    <div
                      class="eff-bar-fill"
                      :style="{ width: barWidth(d.PERCENT) }"
                    />
                  </div>
                  <div class="eff-meta">
                    <template v-if="d.MAX > 0">
                      {{ d.EARNED }} из {{ d.MAX }}
                      <template v-if="d.ITEMS_COUNT > 0">
                        <span class="eff-dot">·</span>
                        {{ pluralActions(d.ITEMS_COUNT) }}
                      </template>
                    </template>
                    <template v-else>нет активностей в этот день</template>
                  </div>
                </div>
              </div>
            </template>

            <div v-else-if="error" class="state error">{{ error }}</div>

            <div v-else class="empty-block">
              <div class="empty-title">{{ emptyReason }}</div>
              <div class="empty-text">
                график эффективности появится после первого дня с активностями.
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRewardsStore } from './store'
import { useConsentStore } from '../../consent/store'
import { usePullToRefresh } from '../../core/composables/usePullToRefresh'
import { getTheme } from '../../theme/themes'
import { usePeriod } from '../../core/period'
import ConsentBanner from '../../consent/ConsentBanner.vue'
import AppIcon from '../../../components/AppIcon.vue'
import { useAppBackground } from '../../core/composables/useAppBackground'

const { setBackground } = useAppBackground()
const store = useRewardsStore()
const consent = useConsentStore()
const periodApi = usePeriod()

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

// ── Группировка по датам (для таба «Получены») ───────────
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

function itemKey(item, tabName, date, idx) {
  if (item.ID != null) return `id_${item.ID}`
  if (item.ACTION_ID) return `action_${item.ACTION_ID}_${item.TYPE || ''}`
  return `${tabName}_${date}_${item.TYPE || 'x'}_${idx}`
}

// ── Таб «Эффективность» — производные ─────────────────────
const emptyReason = computed(() => {
  if (!periodApi.isConfigured.value) return 'марафон ещё не настроен'
  return 'марафон ещё не начался'
})

const averagePercentLabel = computed(() => {
  const days = store.dailyEfficiency.filter((d) => d.PERCENT != null && Number(d.MAX) > 0)
  if (!days.length) return '—'
  const avg = days.reduce((sum, d) => sum + Number(d.PERCENT || 0), 0) / days.length
  return `${avg.toFixed(0)}%`
})

const activeDaysLabel = computed(() => {
  const total = store.dailyEfficiency.length
  const withActions = store.dailyEfficiency.filter((d) => Number(d.EARNED) > 0).length
  return `${withActions} из ${total} ${pluralDays(total)}`
})

function pluralDays(n) {
  const v = Number(n) || 0
  if (v % 10 === 1 && v % 100 !== 11) return 'дня'
  if ([2, 3, 4].includes(v % 10) && ![12, 13, 14].includes(v % 100)) return 'дней'
  return 'дней'
}

function pluralActions(n) {
  const v = Number(n) || 0
  if (v === 1) return '1 действие'
  if (v >= 2 && v <= 4) return `${v} действия`
  return `${v} действий`
}

function formatPercent(p) {
  if (p == null) return '—'
  const n = Number(p)
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n)}%`
}

function barWidth(p) {
  if (p == null) return '0%'
  const n = Number(p)
  if (!Number.isFinite(n)) return '0%'
  return `${Math.max(0, Math.min(100, n))}%`
}

// ── Общее форматирование ─────────────────────────────────
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

// ── Pull-to-refresh ──────────────────────────────────────
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
  if (consent.isGranted) {
    await store.load()
  }
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

/* Обертка для ConsentBanner, чтобы он был по центру */
.consent-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 0;
}

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

.pane { display: grid; gap: 16px; padding: 4px 0 16px; }

.state {
  text-align: center;
  padding: 32px 16px;
  font-size: 14px;
}

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

/* ── Эффективность ── */
.eff-total {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 14px;
  gap: 6px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  align-content: flex-start;
}
.eff-total-line {
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  display: grid;
}
.eff-total-label {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  color: var(--txt-black-dark-green);
  text-transform: lowercase;
}
.eff-total-value {
  font-size: 34px;
  line-height: 1;
}
.eff-total-hint {
  font-family: var(--font-family);
  font-size: 12.5px;
  text-transform: lowercase;
}

.eff-list { 
  display: grid; 
  gap: 12px; 
}
.eff-row {
  gap: 8px;
  padding: 10px;
  display: grid;
}
.eff-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.eff-date {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  color: var(--txt-black-dark-green);
  text-transform: lowercase;
}
.eff-percent {
  font-family: var(--font-family);
  color: var(--txt-dark-green);
  white-space: nowrap;
  font-size: 16px;
  font-weight: 700;
}
.eff-percent.is-null {
  color: var(--muted);
  font-family: var(--font-family);
  font-weight: 400;
}
.eff-bar {
  height: 8px;
  background: var(--grey-light);
  border-radius: 999px;
  overflow: hidden;
}
.eff-bar-fill {
  height: 100%;
  background: #94E91E;
  border-radius: 100px;
  transition: width 0.3s ease;
}
.eff-meta {
  font-family: var(--font-family);
  font-size: 12.5px;
  color: var(--muted);
  text-transform: lowercase;
}
.eff-dot {
  margin: 0 4px;
  opacity: 0.6;
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