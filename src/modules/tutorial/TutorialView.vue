<template>
  <div class="page tutorial-page">
    <!-- Ссылка «Пропустить» — вверху справа -->
    <button
      type="button"
      class="skip-btn"
      @click="skip"
    >
      Пропустить
    </button>

    <div class="tutorial-body">
      <transition name="tut-slide" mode="out-in">
        <section :key="currentStep" class="tut-slide">
          <div class="head text-center">
            <h1 class="title color-text-stroke">{{ current?.title }}</h1>
            <div v-if="current?.text" class="text">{{ current.text }}</div>
          </div>
        </section>
      </transition>
    </div>

    <div class="d-flex flex-column g24 bottom-action">
      <!-- Точки-индикаторы -->
      <div v-if="total > 1" class="tut-dots" role="tablist">
        <button
          v-for="(s, i) in slides"
          :key="s.id"
          type="button"
          class="tut-dot"
          :class="{ active: i === currentStep }"
          :aria-label="`Слайд ${i + 1} из ${total}`"
          :aria-selected="i === currentStep"
          role="tab"
          @click="goTo(i)"
        />
      </div>     
      <div class="tut-buttons">
        <button
          v-if="!isLast"
          type="button"
          class="btn btn-primary btn-center"
          @click="next"
        >
          Далее
        </button>
        <button
          v-else
          type="button"
          class="btn btn-primary btn-center"
          @click="finish"
        >
          Завершить обучение
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTutorialStore } from './store'
import { useAppBackground } from '../core/composables/useAppBackground'
import { resolveNextOnboardingRoute } from '../onboarding/navigation'

const store = useTutorialStore()
const router = useRouter()

const { setBackground, clearBackground } = useAppBackground()

const slides = computed(() => store.slides)
const total = computed(() => store.total)
const current = computed(() => store.current)
const currentStep = computed(() => store.currentStep)
const currentImage = computed(() => store.currentImage)
const isLast = computed(() => store.isLast)

function next() { store.next() }
function goTo(i) { store.goTo(i) }

/**
 * Изображение текущего слайда → фон приложения.
 * Следим и за сменой шага, и за появлением картинки
 * (картинки кешируются асинхронно — currentImage может
 * быть пустым сразу после перехода на слайд, а затем заполниться).
 *
 * Если картинки нет — возвращаем дефолтный фон.
 */
watch(
  [currentStep, currentImage],
  ([, img]) => {
    if (img) {
      setBackground({ url: img })
    } else {
      clearBackground()
    }
  },
  { immediate: true },
)

async function finish() {
  clearBackground()
  await store.finish()
  const next = await resolveNextOnboardingRoute()
  router.replace(next)
}

async function skip() {
  clearBackground()
  await store.finish()
  const next = await resolveNextOnboardingRoute()
  router.replace(next)
}

onMounted(() => {

  store.load()
})

onBeforeUnmount(() => {
  clearBackground()
})
</script>

<style scoped>
.tutorial-page {
  position: relative;
  display: flex;
  /* padding: var(--top-zone) 24px 120px; */
}

/* ─── Кнопка «Пропустить» ─── */
.skip-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 8px 12px;
  background: none;
  border: none;
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 600;
  color: var(--white);
  cursor: pointer;
  box-shadow: none;
  text-decoration: underline;
  text-underline-offset: 3px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity var(--t-fast);
  z-index: 5;
}
.skip-btn:hover { opacity: .7; }
.skip-btn:active { opacity: .5; }

/* ─── Центральный блок ─── */
.tutorial-body {
  display: grid;
  gap: 24px;
}
.tut-slide .title{
font-size: 40px;
line-height: 88%;
}
.tut-slide .text{
  max-height: 60dvh;
  overflow: auto;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 120%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--white);
}

/* Карточка с текстом — полупрозрачный «стеклянный» слой,
   чтобы текст читался на любой фоновой картинке. */
.tut-card {
  /* width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px 20px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, .85);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  box-shadow: 0 6px 24px rgba(0, 0, 0, .08); */
}

/* ─── Заголовок и текст ─── */
/* .tut-title {
  margin: 0;
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.01em;
  color: #d3ff4f;
  -webkit-text-stroke: 1.5px #015f01;
}

.tut-text {
  margin: 0;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 16px;
  line-height: 1.3;
  color: #015f01;
} */

/* ─── Точки ─── */
.tut-dots {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.tut-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, .5);
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(1, 95, 1, .25);
  transition: background var(--t-fast), transform var(--t-fast);
}
.tut-dot.active {
  background: var(--white);
  transform: scale(1.35);
  box-shadow: none;
}
.tut-dot:hover:not(.active) {
  background: rgba(255, 255, 255, .8);
}
.tut-buttons{
  width: 100%;
}
.tut-buttons .btn{
  width: 100%;
}

/* ─── Переходы между слайдами ─── */
.tut-slide-enter-active,
.tut-slide-leave-active {
  transition: opacity var(--t-base), transform var(--t-base);
}
.tut-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.tut-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

@media (max-width: 420px) {
  .tut-title { font-size: 26px; }
  .tut-text { font-size: 15px; }
  .tut-card { padding: 18px 16px; }
}
</style>