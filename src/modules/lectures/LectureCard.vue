<template>
  <router-link
    class="lecture-card"
    :to="`/training/lectures/${encodeURIComponent(lecture.dbKey)}`"
    :style="{ animationDelay: (index || 0) * 40 + 'ms' }"
  >
    <div class="lecture-cover" :style="coverStyle">
       <div class="video_play_ico" v-if="lecture.videoLink">
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
            <use xlink:href="#stroke0_289_5302" fill="white" />
            <mask id="stroke1_289_5302" fill="white">
              <use xlink:href="#stroke0_289_5302" />
            </mask>
            <path d="M20.1105 0.0191986C31.7015 -0.472169 41.4947 8.5285 41.9811 20.1196C42.4675 31.7106 33.4626 41.5001 21.8712 41.9816C10.287 42.4626 0.504886 33.4643 0.0188082 21.8803C-0.467245 10.2963 8.52673 0.510271 20.1105 0.0191986Z" stroke-width="4.4301" stroke="#21271F" mask="url(#stroke1_289_5302)" />
            <path d="M16.8474 12.6205C17.3166 12.5462 17.862 12.7019 18.2679 12.9341C18.9108 13.3018 19.5445 13.6877 20.1827 14.0639L24.0995 16.3737L26.8862 18.0195C27.287 18.2563 27.9587 18.6234 28.3137 18.8731C28.5934 19.0706 28.8299 19.323 29.0085 19.6149C29.3807 20.2374 29.4865 20.9836 29.3018 21.685C29.1891 22.1382 28.9514 22.5505 28.6158 22.8753C28.2515 23.2256 27.2319 23.7809 26.7455 24.0678L23.7666 25.8281C21.8749 26.8826 20.0208 28.098 18.1279 29.1433C16.711 29.9031 14.9729 28.8688 14.7541 27.3358C14.6632 26.6988 14.7048 25.8606 14.7049 25.215L14.7052 21.4773L14.7046 17.1328C14.7047 16.3432 14.6835 15.5399 14.7423 14.7532C14.7806 14.4524 14.8812 14.1498 15.0239 13.8852C15.4118 13.1656 16.0521 12.742 16.8474 12.6205Z" fill="#21271F" />
            <defs>
              <path id="stroke0_289_5302" d="M20.1105 0.0191986C31.7015 -0.472169 41.4947 8.5285 41.9811 20.1196C42.4675 31.7106 33.4626 41.5001 21.8712 41.9816C10.287 42.4626 0.504886 33.4643 0.0188082 21.8803C-0.467245 10.2963 8.52673 0.510271 20.1105 0.0191986Z" />
            </defs>
          </svg>
       </div>
    </div>

    <div class="lecture-body">
      <p class="lecture-title">{{ lecture.title }}</p>
      <p class="lecture-desc">{{ lecture.description }}</p>

      <div class="lecture-meta"  v-if="read">
        <span class="lecture-read" aria-label="награда получена">
          <div class="check"><AppIcon name="check" :size="10" /></div>          
          <AppIcon name="apple" :size="14" />
          <div class="text">награда получена</div>  
        </span>
        <span class="lecture-barge" aria-label="выполнено">выполнено</span>       
      </div>
      <div class="lecture-meta"  v-else>
        <span class="lecture-read" aria-label="награда получена">     
          <AppIcon name="apple" :size="14" />
          <div class="text">за выполнение</div>  
        </span>     
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { idbGet } from '../core/db'
import AppIcon from '../../components/AppIcon.vue'

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
  margin-bottom: 9px;
}

.lecture-meta {
  font-family: var(--font-family);
  letter-spacing: -.01em;
  text-transform: lowercase;
  margin-top: auto;
  font-size: 14px;
  font-weight: 500;
  line-height: 120%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lecture-read { 
  display: flex;
  gap: 4px;
}
.lecture-read .check{ 
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--txt-dark-green);
  color: var(--txt-brand-limon);
  border-radius: 9px;
  padding: 2px;
  width: 14px;
  height: 14px;
}
.lecture-read .text{
  color: var(--txt-black-dark-green);  
}
.lecture-barge { 
  border-radius: 120px;
  padding: 4px 10px 5px;
  background: var(--green-light);
  font-size: 12px;
  text-align: center;
  color: var(--txt-dark-green);
  background: var(--green-light);
}



@media (prefers-reduced-motion: reduce) {
  .lecture-card,
  .lecture-read-badge { animation: none; }
  .lecture-card:hover { transform: none; }
}
</style>