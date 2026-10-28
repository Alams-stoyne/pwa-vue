<template>
  <div class="page tutorial-page">

    <div class="tutorial-body">
      <transition name="tut-slide" mode="out-in">
        <section :key="currentStep" class="tut-slide">
          <div class="head text-center">
            <h1 class="title text-center color-text-stroke">{{ current?.title }}</h1>
            <!-- <div v-if="current?.text" class="text">{{ current.text }}</div> -->
          </div>
        </section>
      </transition>
    </div>

    <div class="d-grid g16 bottom-action">
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
        <!-- Ссылка «Пропустить» — вверху справа -->
        <button
          v-if="!isLast"
          type="button"
          class="btn btn-link btn-center"
          @click="skip"
        >
          Пропустить
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
import { track } from '../analytics'
import { EVT } from '../analytics/events'

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
  track(EVT.ONBOARDING_TUTORIAL_DONE, { skipped: false })
  const next = await resolveNextOnboardingRoute()
  router.replace(next)
}

async function skip() {
  clearBackground()
  await store.finish()
  track(EVT.ONBOARDING_TUTORIAL_DONE, { skipped: true })
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

.tut-card {
}

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
  background: #afe6dd80;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(1, 95, 1, .25);
  transition: background var(--t-fast), transform var(--t-fast);
}
.tut-dot.active {
  background: var(--txt-dark-green);
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