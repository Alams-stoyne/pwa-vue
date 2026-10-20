<template>
  <div class="page storage-page">

    <div class="actions">
      <button
        type="button"
        class="btn-secondary sync-btn"
        :disabled="busy || !store.online"
        @click="syncAllThemes"
      >
        <span v-if="busy" class="sync-spin" aria-hidden="true">↻</span>
        <span v-else class="sync-arrow" aria-hidden="true">↻</span>
        {{ busy ? 'Синхронизация…' : 'Синхронизировать 7 дней (все темы)' }}
      </button>

      <p class="muted sync-hint">
        <template v-if="lastSyncText">
          Последняя синхронизация: {{ lastSyncText }}
        </template>
        <template v-else>Синхронизация ещё не выполнялась</template>
      </p>
    </div>

    <!-- Чипы-фильтры по темам/разделам — только те, что реально есть в IDB -->
    <div v-if="chips.length > 1" class="chips" role="tablist">
      <button
        v-for="c in chips"
        :key="c.key"
        type="button"
        class="chip"
        :class="{ active: filter === c.key }"
        @click="filter = c.key"
      >
        <span v-if="c.emoji" aria-hidden="true">{{ c.emoji }}</span>
        <span>{{ c.label }}</span>
        <span class="chip-count muted">{{ c.count }}</span>
      </button>
    </div>

    <p class="muted meta-line">
      Материалов: {{ filteredItems.length }} из {{ items.length }}
    </p>

    <div v-if="loading" class="list">
      <div v-for="n in 3" :key="n" class="card skeleton pulse">
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <div v-else-if="!groups.length && hasTodayOnly" class="empty">
      <span class="empty-emoji">🗓️</span>
      <h3>Здесь появятся материалы за прошедшие дни</h3>
      <p class="muted">
        Сегодняшние лекции — в разделе «Обучение».
        В хранилище они появятся после полуночи.
      </p>
    </div>

    <div v-else-if="!groups.length" class="empty">
      <span class="empty-emoji">📦</span>
      <h3>Хранилище пусто</h3>
      <p class="muted">
        Нажмите «Синхронизировать 7 дней (все темы)» — подтянем материалы за последнюю неделю.
      </p>
    </div>

    <section v-for="g in groups" :key="g.date" class="group">
      <h3 class="group-date">{{ formatDate(g.date) }}</h3>
      <div class="list">
        <router-link
          v-for="l in g.items"
          :key="l.dbKey"
          :to="lectureLink(l.dbKey)"
          class="card clickable lecture-row"
        >
          <div class="lecture-row-main">
            <div class="lecture-row-head">
              <span class="lecture-row-title">{{ l.title }}</span>
              <span v-if="store.isRead(l.dbKey)" class="read-badge">✓</span>
            </div>
            <p class="lecture-row-desc muted">{{ l.description }}</p>
            <span class="chip chip--bucket" :style="bucketStyle(l.bucket)">
              {{ bucketLabel(l.bucket) }}
            </span>
          </div>
          <span class="chevron" aria-hidden="true">›</span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import HelpIcon from '../../components/HelpIcon.vue'
import { useLecturesStore } from './store'
import { useThemeStore } from '../theme/store'
import { themesComputed, getTheme } from '../theme/themes'

import { localDate } from '../core/utils/date'
import { useToast } from '../core/composables/useToast'

const store = useLecturesStore()
const theme = useThemeStore()
const route = useRoute()
const toast = useToast()

const items = ref([])
const loading = ref(true)
const filter = ref('')   // '' = все

const busy = computed(() =>
  store.syncing || store.syncingReads || store.syncingPhotos
)

/** Уникальные bucket'ы, представленные в IDB, с количеством */
const availableBuckets = computed(() => {
  const map = new Map()
  for (const l of items.value) {
    const key = l.bucket || 'unknown'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
})

/** Чипы фильтра: Все + те, что реально есть */
const chips = computed(() => {
  const list = [
    { key: '', label: 'Все', emoji: '', count: items.value.length },
  ]
  for (const [key, count] of availableBuckets.value.entries()) {
    list.push({
      key,
      label: bucketLabel(key),
      emoji: bucketEmoji(key),
      count,
    })
  }
  return list
})

const filteredItems = computed(() => {
  const today = localDate()
  return items.value
    .filter((l) => l.publishedDate && l.publishedDate !== today)
    .filter((l) => !filter.value || l.bucket === filter.value)
})

const hasTodayOnly = computed(() => {
  const today = localDate()
  return items.value.some((l) => l.publishedDate === today)
})

const groups = computed(() => {
  const map = new Map()
  for (const l of filteredItems.value) {
    const d = l.publishedDate || '—'
    if (!map.has(d)) map.set(d, [])
    map.get(d).push(l)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, list]) => ({ date, items: list }))
})

const lastSyncText = computed(() => {
  const ts = store.lastArchiveSyncAt
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
})

function bucketLabel(bucket) {
  if (!bucket) return 'Материал'
  if (bucket === 'lecture-general') return 'Общие'
  if (bucket === 'lecture-charging') return 'Зарядка'
  const id = bucket.replace(/^lecture-/, '')
  return getTheme(id)?.name || id
}

function bucketEmoji(bucket) {
  if (bucket === 'lecture-general') return '🌐'
  if (bucket === 'lecture-charging') return '⚡'
  const id = bucket.replace(/^lecture-/, '')
  return getTheme(id)?.emoji || '📖'
}

function bucketStyle(bucket) {
  // Лёгкий цветовой оттенок по теме
  const palette = {
    'lecture-general': '#ED5C03',
    'lecture-charging': '#FFD232',
  }
  const id = bucket.replace(/^lecture-/, '')
  const themeObj = themesComputed.value.find((t) => t.id === id)

  const color = palette[bucket] || (themeObj ? '#015F01' : '#666')
  return {
    borderColor: color,
    color,
    background: `${color}11`,
  }
}

function formatDate(iso) {
  if (!iso || iso === '—') return iso
  const [y, m, d] = iso.split('-')
  const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек']
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`
}

function lectureLink(dbKey) {
  return {
    path: `/training/lectures/${encodeURIComponent(dbKey)}`,
    query: { from: 'storage' },
  }
}

async function reload() {
  items.value = await store.loadArchive()
}

async function syncAllThemes() {
  await store.syncFromServer({ force: true })

  const res = await store.syncArchive({ days: 7, allThemes: true, force: true })

  if (res.error === 'OFFLINE') { toast.warn('Нет сети'); return }
  if (res.error) { toast.error('Не удалось синхронизировать'); return }

  await reload()

  if (res.added === 0) {
    toast.info('Новых материалов не найдено')
  } else {
    toast.success(`Загружено ${res.added} материалов за ${res.days} дн.`)
  }
}

onMounted(async () => {
  theme.load()
  await reload()
  loading.value = false

  // Если есть фильтр из URL (например, пришли с «Все →» на слайдере) — применим
  if (route.query.filter) filter.value = route.query.filter

  if (store.online) {
    await store.syncFromServer({ force: true })
    await reload()

    const diff = Date.now() - store.lastArchiveSyncAt
    if (diff > 60 * 60 * 1000) {
      await store.syncArchive({ days: 7, allThemes: true })
      await reload()
    }

    store.syncMissingPhotos()
  }
})
</script>

<style scoped>
/* .storage-page { padding-top: 12px; } */

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.head h1 { flex: 1; margin: 0; font-size: 22px; }

.actions {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sync-btn {
  width: 100%;
  max-width: 358px;
  height: 48px;
  margin: 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
}
.sync-spin, .sync-arrow { display: inline-block; font-size: 18px; line-height: 1; }
.sync-spin { animation: spin 800ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.sync-hint { font-size: 12px; text-align: center; margin: 0; }

/* Чипы фильтра */
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 10px;
  margin: 0 -18px;
  padding-left: 18px;
  padding-right: 18px;
  scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }

.chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: none;
  transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform var(--t-fast);
}
.chip:hover:not(:disabled) { background: #fafafa; box-shadow: none; transform: translateY(-1px); }
.chip.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.chip.active .chip-count { color: rgba(255,255,255,.8); }
.chip-count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

.meta-line { font-size: 13px; margin: 0 0 12px; }

.group { margin-bottom: 22px; }
.group-date {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--muted);
}

.list { display: grid; gap: 10px; }
.lecture-row {
  display: flex; align-items: center; gap: 12px;
  text-decoration: none; color: var(--text);
  padding: 12px 14px;
}
.lecture-row-main { flex: 1; min-width: 0; }
.lecture-row-head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 4px;
}
.lecture-row-title { font-weight: 600; font-size: 15px; }
.read-badge { color: var(--accent); font-weight: 700; font-size: 13px; }
.lecture-row-desc {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chip--bucket {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-weight: 600;
  background: transparent;
}

.chevron { font-size: 22px; color: var(--muted); }

.empty {
  text-align: center;
  padding: 40px 12px;
  display: flex; flex-direction: column; gap: 10px; align-items: center;
}
.empty-emoji { font-size: 44px; }
.empty h3 { margin: 4px 0 0; font-size: 16px; }

.skeleton { padding: 14px; }
.sk-line { height: 12px; border-radius: 6px; background: #eee; margin-bottom: 8px; }
.sk-line--title { width: 45%; height: 16px; }
.sk-line--text { width: 85%; margin-bottom: 0; }
</style>