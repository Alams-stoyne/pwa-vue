<template>
  <div class="page storage-page page--bottom-action">

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
      материалов: {{ filteredItems.length }} из {{ pastItems.length }}
    </p>

    <div v-if="loading" class="list">
      <div v-for="n in 3" :key="n" class="card skeleton pulse">
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <div v-else-if="!groups.length" class="empty-block">
      <div class="empty-title">хранилище пока пусто</div>
      <div class="empty-text">здесь появятся материалы прошедших дней</div>
      <div class="empty-help-text">Нажмите «Синхронизировать» — подтянем материалы за последнюю неделю.</div>
    </div>

    <div v-else-if="groups.length" class="group-list">
      <section v-for="g in groups" :key="g.date" class="group">
        <h3 class="group-date">{{ formatDate(g.date) }}</h3>
        <div class="list">
          <router-link
            v-for="l in g.items"
            :key="l.dbKey"
            :to="lectureLink(l.dbKey)"
            class="card clickable lecture-row"
          >
            <div class="lecture-cover" :style="getCoverStyle(l.dbKey)">
              <span v-if="!coverUrls[l.dbKey] && !l.cover" class="cover-fallback">📖</span>
              <span v-if="l.videoLink" class="video-badge">▶</span>
            </div>

            <div class="lecture-row-main">
              <div class="lecture-row-head">
                <span class="lecture-row-title">{{ l.title }}</span>
              </div>
              <span v-if="store.isRead(l.dbKey)" class="read-badge">просмотрено</span>
            </div>
          </router-link>
        </div>
      </section>
    </div>
    <div class="bottom-action d-grid g10">
      <button
        type="button"
        class="btn btn-secondary btn-center"
        :disabled="busy || !store.online"
        @click="syncAllThemes"
      >
        <span v-if="busy" class="sync-spin" aria-hidden="true">↻</span>
        <span v-else class="sync-arrow" aria-hidden="true">↻</span>
        {{ busy ? 'Синхронизация…' : 'Синхронизировать' }}
      </button>

      <p class="muted sync-hint">
        <template v-if="lastSyncText">
          последняя синхронизация: {{ lastSyncText }}
        </template>
        <template v-else>синхронизация ещё не выполнялась</template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useLecturesStore } from './store'
import { useThemeStore } from '../theme/store'
import { themesComputed, getTheme } from '../theme/themes'
import { idbGet } from '../core/db'

import { localDate } from '../core/utils/date'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()

const store = useLecturesStore()
const theme = useThemeStore()
const route = useRoute()
const toast = useToast()

const items = ref([])
const loading = ref(true)
const filter = ref('')

const coverUrls = ref({})

const busy = computed(() =>
  store.syncing || store.syncingReads || store.syncingPhotos
)

const pastItems = computed(() => {
  const today = localDate()
  return items.value.filter((l) => l.publishedDate && l.publishedDate !== today)
})

const themeOrder = computed(() => {
  const map = new Map()
  themesComputed.value.forEach((t, i) => map.set(t.id, i))
  return map
})

function bucketSortKey(bucket) {
  if (bucket === 'lecture-general') return [0, 0]
  if (bucket === 'lecture-charging') return [1, 0]
  const id = String(bucket || '').replace(/^lecture-/, '')
  if (id && id === theme.selected) return [2, 0]
  return [3, themeOrder.value.get(id) ?? 999]
}

function compareBuckets(a, b) {
  const [pa, sa] = bucketSortKey(a)
  const [pb, sb] = bucketSortKey(b)
  return pa - pb || sa - sb
}

const availableBuckets = computed(() => {
  const map = new Map()
  for (const l of pastItems.value) {
    const key = l.bucket || 'unknown'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
})

const chips = computed(() => {
  const buckets = [...availableBuckets.value.entries()]
    .sort(([a], [b]) => compareBuckets(a, b))

  const list = [
    { key: '', label: 'Все', emoji: '', count: pastItems.value.length },
  ]
  for (const [key, count] of buckets) {
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
  return pastItems.value.filter((l) => !filter.value || l.bucket === filter.value)
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
    .map(([date, list]) => ({
      date,
      items: [...list].sort((a, b) => compareBuckets(a.bucket, b.bucket)),
    }))
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

function getCoverStyle(dbKey) {
  const url = coverUrls.value[dbKey]
  return url ? { backgroundImage: `url("${url}")` } : {}
}

function revokeCovers() {
  for (const url of Object.values(coverUrls.value)) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
  coverUrls.value = {}
}

async function loadCovers(items) {
  for (const l of items) {
    if (!l.coverKey) continue

    try {
      const blob = await idbGet('photos', l.coverKey)
      if (blob) {
        coverUrls.value[l.dbKey] = URL.createObjectURL(blob)
      }
    } catch (e) {
      console.warn('[storage] failed to load cover for', l.dbKey, e)
    }
  }
}

async function reload() {
  revokeCovers()
  items.value = await store.loadArchive()
  await loadCovers(items.value)
}

async function syncAllThemes() {
  await store.syncFromServer({ force: true })

  const res = await store.syncArchive({ days: 7, allThemes: true, force: true })

  if (res.error === 'OFFLINE') { toast.warn('нет сети'); return }
  if (res.error) { toast.error('не удалось синхронизировать'); return }

  await reload()

  if (res.added === 0) {
    toast.info('новых материалов не найдено')
  } else {
    toast.success(`загружено ${res.added} материалов за ${res.days} дн.`)
  }
}

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  theme.load()
  await reload()
  loading.value = false

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

onBeforeUnmount(() => {
  revokeCovers()
})
</script>

<style scoped>
.storage-page{
  position: relative;
  max-height: 100dvh;
}
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

.sync-hint {
  font-size: 12px;
  text-align: center;
  margin: 0;
}

.chips {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 2px 10px;
  margin: 0 -18px;
  padding-left: 18px;
  padding-right: 18px;
}

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
  text-transform: lowercase;
  transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform var(--t-fast);
}
.chip:hover:not(:disabled) { background: #fafafa; box-shadow: none; transform: translateY(-1px); }
.chip.active {
    background: var(--white);
    color: var(--txt-green-dsrk);
    border-color: var(--txt-green-dsrk);
}
.chip-count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

.meta-line { font-size: 13px; margin: 0 0 12px; }
.group-list{
  position: relative;
  max-height: calc(100dvh - 288px);
  overflow: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}
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
  padding: 10px;
}

.lecture-cover {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 12px;
  background-color: var(--grey-light);
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.cover-fallback {
  font-size: 28px;
  opacity: .35;
}

.video-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(15, 90, 5, 0.85);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  backdrop-filter: blur(2px);
}

.lecture-row-main { flex: 1; min-width: 0; }
.lecture-row-head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 4px;
}
.lecture-row-title { font-weight: 600; font-size: 15px; }
.read-badge { color: var(--accent); font-weight: 700; font-size: 13px; }

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

.skeleton { padding: 14px; }
.sk-line { height: 12px; border-radius: 6px; background: #eee; margin-bottom: 8px; }
.sk-line--title { width: 45%; height: 16px; }
.sk-line--text { width: 85%; margin-bottom: 0; }
</style>