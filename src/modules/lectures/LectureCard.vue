<template>
  <router-link
    class="lecture-card"
    :to="`/training/lectures/${encodeURIComponent(lecture.dbKey)}`"
    :style="{ animationDelay: (index || 0) * 40 + 'ms' }"
  >
    <div class="lecture-cover" :style="coverStyle">
      <span v-if="!coverSrc" class="lecture-cover-fallback" aria-hidden="true">📖</span>


        <span v-if="lecture.videoLink" class="lecture-meta-item">
          ▶ 
        </span>
    </div>

    <div class="lecture-body">
      <p class="lecture-title">{{ lecture.title }}</p>
      <p class="lecture-desc">{{ lecture.description }}</p>

      <div class="lecture-meta">
        <span v-if="readMinutes" class="lecture-meta-item">
          ⏱ {{ readMinutes }} мин
        </span>
        <span v-if="lecture.videoLink" class="lecture-meta-item">
          ▶ видео
        </span>
        <span v-if="read" class="lecture-read" aria-label="Прочитано">
          <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
            <path d="M4 10.5l4 4 8-8"
                  stroke="currentColor" stroke-width="2.2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>        
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { idbGet } from '../core/db'

const props = defineProps({
  lecture: { type: Object, required: true },
  read: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})

const coverSrc = ref('')

const coverStyle = computed(() =>
  coverSrc.value
    ? { backgroundImage: `url("${coverSrc.value}")` }
    : {}
)

/** Метка типа материала по bucket. */
const kindLabel = computed(() => {
  const b = props.lecture.bucket
  if (b === 'lecture-charging') return 'Зарядка'
  if (b === 'lecture-general') return 'Общее'
  return 'Направление'
})

/** Примерная длительность чтения — по количеству символов. */
const readMinutes = computed(() => {
  const t = props.lecture.text || ''
  if (!t) return 0
  return Math.max(1, Math.round(t.length / 900))
})

onMounted(async () => {
  if (props.lecture.coverKey) {
    const blob = await idbGet('photos', props.lecture.coverKey)
    if (blob) coverSrc.value = URL.createObjectURL(blob)
    else if (props.lecture.cover) coverSrc.value = props.lecture.cover
  } else if (props.lecture.cover) {
    coverSrc.value = props.lecture.cover
  }
})

onBeforeUnmount(() => {
  if (coverSrc.value?.startsWith('blob:')) URL.revokeObjectURL(coverSrc.value)
})
</script>

<style scoped>
.lecture-card {
  flex: 0 0 auto;
  width: 100%;
  scroll-snap-align: start;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  text-decoration: none;
  color: var(--text);
  transition:
    transform var(--t-base),
    box-shadow var(--t-base),
    border-color var(--t-base);
  display: flex;
  flex-direction: column;
  animation: riseIn var(--t-slow) both;
  padding: 8px;
}
/* .lecture-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, .10);
  border-color: #e0e0e0;
}
.lecture-card:active { transform: scale(.98); } */

/* ─── Обложка ─── */
.lecture-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 4;
  border-radius: 14px;
  padding: 20px 0 28px;
  background: var(--grey-light);
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.lecture-cover::after {
  /* Лёгкое затемнение снизу для читаемости чипа */
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 40%;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, .35) 100%);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--t-base);
}
.lecture-card:hover .lecture-cover::after { opacity: 1; }

.lecture-cover-fallback { font-size: 34px; opacity: .35; }

.lecture-read-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(15, 90, 5, .35);
  animation: popIn 320ms cubic-bezier(.2,.7,.2,1) both;
}
@keyframes popIn {
  0%   { transform: scale(.4); opacity: 0; }
  60%  { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); }
}

.lecture-kind {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: #fff;
  background: rgba(15, 90, 5, .85);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

/* ─── Тело ─── */
.lecture-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.lecture-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lecture-desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lecture-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--muted);
}
.lecture-meta-item { white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .lecture-card,
  .lecture-read-badge { animation: none; }
  .lecture-card:hover { transform: none; }
}
</style>