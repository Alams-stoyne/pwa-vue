<template>
  <section class="slider" :class="{ 'is-empty': !loading && !list.length }">
    <header class="slider-head">
      <h2 class="slider-title">{{ title }}</h2>
      <span class="slider-count">{{ list.length }}</span>
    </header>

    <!-- Skeleton -->
    <div v-if="loading" class="slider-skeleton">
      <div
        v-for="n in 3"
        :key="n"
        class="lecture-card--skeleton pulse"
      >
        <div class="sk-cover" />
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!list.length" class="slider-empty muted">
      Пока нет материалов в этом блоке
    </div>

    <!-- Swiper -->
    <div v-else class="slider-wrap">
      <!-- Стрелка влево -->
      <!-- <button
        type="button"
        class="slider-nav slider-nav--prev"
        :class="{ 'is-hidden': !canPrev }"
        aria-label="Назад"
        tabindex="-1"
        @click="prev"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path d="M15 5l-7 7 7 7"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button> -->

      <Swiper
        ref="swiperRef"
        :modules="modules"
        :slides-per-view="'1.1'"
        :space-between="12"
        :slides-offset-before="18"
        :slides-offset-after="18"
        :free-mode="{ enabled: true, sticky: false, momentum: true }"
        :grab-cursor="true"
        :simulate-touch="true"
        :observer="true"
        :observe-parents="true"
        :resize-observer="true"
        :watch-slides-progress="true"
        :a11y="{ enabled: true }"
        class="lecture-swiper"
        @swiper="onSwiper"
        @slide-change="onSlideChange"
        @progress="onProgress"
      >
        <SwiperSlide
          v-for="(l, i) in list"
          :key="l.dbKey"
          class="lecture-swiper-slide"
        >
          <LectureCard
            :lecture="l"
            :read="isRead(l.dbKey)"
            :index="i"
          />
        </SwiperSlide>
      </Swiper>

      <!-- Стрелка вправо -->
      <!-- <button
        type="button"
        class="slider-nav slider-nav--next"
        :class="{ 'is-hidden': !canNext }"
        aria-label="Вперёд"
        tabindex="-1"
        @click="next"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path d="M9 5l7 7-7 7"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button> -->
    </div>

    <!-- Progress -->
    <!-- <div v-if="list.length > 1 && !loading" class="slider-progress">
      <div class="slider-progress-bar">
        <span
          class="slider-progress-fill"
          :style="{ width: progress + '%' }"
        />
      </div>
      <span class="slider-progress-label muted">
        {{ visibleIndex + 1 }}–{{ Math.min(visibleIndex + visibleCount, list.length) }}
        из {{ list.length }}
      </span>
    </div> -->
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { FreeMode, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import LectureCard from './LectureCard.vue'

const props = defineProps({
  title: { type: String, required: true },
  emoji: { type: String, default: '' },
  list: { type: Array, default: () => [] },
  isRead: { type: Function, default: () => () => false },
  loading: { type: Boolean, default: false },
  showAllLink: { type: [String, Object], default: null },
})

const modules = [FreeMode, A11y]

const swiperRef = ref(null)
const canPrev = ref(false)
const canNext = ref(true)
const progress = ref(0)
const visibleIndex = ref(0)
const visibleCount = ref(1)

const CARD_WIDTH = 200
const GAP = 12

function onSwiper(swiper) {
  swiperRef.value = swiper
  updateVisible(swiper)
  // Пересчёт кнопок после инициализации — Swiper может быть
  // ещё не полностью просчитан на момент первого кадра.
  updateNav(swiper)
  progress.value = Math.round(swiper.progress * 100)
}

function onSlideChange(swiper) {
  visibleIndex.value = swiper.activeIndex
  updateNav(swiper)
}

function onProgress(swiper, p) {
  progress.value = Math.round(p * 100)
  updateVisible(swiper)
  updateNav(swiper)
}

function updateNav(swiper) {
  // isBeginning / isEnd могут не успеть обновиться к моменту
  // вызова slideChange — дополнительно смотрим на translate.
  canPrev.value = !swiper.isBeginning
  canNext.value = !swiper.isEnd
}

function updateVisible(swiper) {
  const w = swiper?.width || 0
  if (!w) return
  visibleCount.value = Math.max(1, Math.round(w / (CARD_WIDTH + GAP)))
}

function prev() {
  swiperRef.value?.slidePrev()
}

function next() {
  swiperRef.value?.slideNext()
}
</script>

<style scoped>
.slider { margin-bottom: 22px; }

/* ─── Шапка ─── */
.slider-head {
  display: flex;
  align-items: center;
  /* gap: 8px; */
  margin-bottom: 10px;
}
.slider-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 18px;
  line-height: 87%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--black);
}
.slider-count {
  position: relative;
  border-radius: 14px;
  padding: 8px;
  width: 24px;
  height: 24px;
  background: var(--white);
  font-family: var(--second-family);
  font-weight: 500;
  font-size: 12px;
  line-height: 100%;
  text-align: center;
  color: var(--black);
  display: flex;
  align-content: center;
  justify-content: center;
  align-items: center;
  margin-left: auto;
}
.slider-all {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background var(--t-fast), transform var(--t-fast);
  -webkit-tap-highlight-color: transparent;
}
.slider-all:hover { background: var(--accent-soft); }
.slider-all:active { transform: scale(.96); }
.slider-all-arrow {
  display: inline-block;
  transition: transform var(--t-base);
}
.slider-all:hover .slider-all-arrow { transform: translateX(3px); }

/* ─── Обёртка Swiper ─── */
.slider-wrap {
  position: relative;
  overflow: visible;
}

/* ─── Swiper ─── */
.lecture-swiper {
  margin: 0 -18px;
  padding-bottom: 6px;
}

.lecture-swiper :deep(.swiper-slide) {
  width: 200px;
  height: auto;
  display: flex;
}

/* ─── Стрелки ─── */
.slider-nav {
  position: absolute;
  top: calc(50% - 20px);
  transform: translateY(-50%);
  z-index: 3;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, .95);
  color: var(--text);
  box-shadow: 0 6px 18px rgba(0, 0, 0, .10);
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--t-base), transform var(--t-fast), background var(--t-fast);
}
.slider-nav--prev { left: -14px; }
.slider-nav--next { right: -14px; }

.slider-nav:hover:not(:disabled) {
  background: #fff;
  transform: translateY(-50%) scale(1.06);
  box-shadow: 0 8px 22px rgba(0, 0, 0, .14);
}
.slider-nav:active:not(:disabled) { transform: translateY(-50%) scale(.96); }

.slider-wrap:hover .slider-nav { opacity: 1; pointer-events: auto; }
.slider-nav.is-hidden { opacity: 0 !important; pointer-events: none !important; }

@media (hover: none) {
  .slider-nav { display: none; }
}

/* ─── Прогресс ─── */
.slider-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 0 2px;
}
.slider-progress-bar {
  flex: 1;
  height: 3px;
  border-radius: 999px;
  background: #eee;
  overflow: hidden;
}
.slider-progress-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 999px;
  transition: width 180ms cubic-bezier(.2,.7,.2,1);
}
.slider-progress-label {
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

/* ─── Пустое состояние ─── */
.slider-empty {
  font-size: 13px;
  padding: 20px 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
}

/* ─── Skeleton ─── */
.slider-skeleton {
  display: flex;
  gap: 12px;
  overflow: hidden;
  margin: 0 -18px;
  padding: 0 18px 6px;
}
.lecture-card--skeleton {
  flex: 0 0 auto;
  width: 200px;
  padding: 0 0 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.sk-cover {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f2f2f2;
  margin-bottom: 10px;
}
.sk-line {
  height: 10px;
  border-radius: 4px;
  background: #f2f2f2;
  margin: 0 12px 8px;
}
.sk-line--title { height: 14px; width: 70%; margin-top: 4px; }
.sk-line--text { width: 90%; }
</style>