<template>
  <div class="page quiz-page">
    <BackButton :disabled="!store.current" custom @click="goBack" />

    <transition name="fade" appear>
      <header class="head">
        <p class="muted head-label">
          вопрос {{ store.step + 1 }} из {{ store.total }}
        </p>
      </header>
    </transition>

    <!-- <transition name="fade" appear>
      <header class="head">
        <p class="muted head-label">
          Шаг 2 из 3 · Подбор тематики · {{ store.step + 1 }} из {{ store.total }}
        </p>
        <h1>Что вам ближе?</h1>
        <p class="muted head-sub">
          Ответьте на несколько вопросов — мы предложим подходящее направление.
        </p>
      </header>
    </transition> -->

    <div class="progress" role="progressbar"
         :aria-valuenow="store.progress" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-bar" :style="{ width: store.progress + '%' }" />
    </div>

    <transition name="q-slide" mode="out-in">
      <section v-if="store.current" :key="store.current.id" class="question">
        <h2 class="q-title">{{ store.current.text }}</h2>

        <div class="answers">
          <button
            v-for="(a, i) in store.current.answers"
            :key="i"
            type="button"
            class="answer"
            :class="{ selected: picked === i }"
            :style="{ animationDelay: i * 50 + 'ms' }"
            @click="pick(i)"
          >
            <span class="answer-index" aria-hidden="true"><AppIcon name="check" :size="16" /></span>
            <span class="answer-text">{{ a.text }}</span>
          </button>
        </div>
      </section>
    </transition>

    <div class="bottom-action" v-if="canAdvance">
      <button
        type="button"
        class="btn btn-primary btn-center"
        :disabled="!canAdvance"
        @click="next"        
      >
        {{ isLast ? 'Получить рекомендацию' : 'Далее' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from './store'
import { useThemeStore } from '../theme/store'
import BackButton from '../../components/BackButton.vue'
import { useToast } from '../core/composables/useToast'
import AppIcon from '../../components/AppIcon.vue'

import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const store = useQuizStore()
const theme = useThemeStore()
const router = useRouter()
const toast = useToast()

const picked = computed(() => store.picked)
const canAdvance = computed(() => store.canAdvance)

// Явная проверка последнего вопроса — не полагаемся на store.isLast
const isLast = computed(() => store.step >= store.total - 1)

function pick(i) {
  // ВАЖНО: через action, чтобы Vue гарантированно отследил изменение
  store.answer(i)
}

function next() {
  if (!store.canAdvance) return

  if (store.step >= store.total - 1) {
    store.finish()
    theme.load()

    const recommendedId = store.recommended
    // toast.success('Тест завершён — открываем рекомендованную тематику')

    if (recommendedId) {
      // сразу на детальную страницу рекомендованной темы
      router.replace({
        path: `/themes/${recommendedId}`,
        query: {}, // без ?change=1 — это онбординг
      })
    } else {
      // страховка на случай, если рекомендация не посчиталась
      router.replace('/themes')
    }
    return
  }

  store.forward()
}

function goBack() {
  if (store.isFirst) {
    router.replace('/quiz/welcome')
    return
  }
  store.clearAnswer(store.step)
  store.back()
}

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.load()
  if (store.done) { router.replace('/themes'); return }
  if (!store.started) { router.replace('/quiz/welcome'); return }
  // Страховка: если пользователь открыл /quiz напрямую,
  // вопросы могут быть не загружены.
  await store.loadQuestions().catch(() => {})
})
</script>


<style scoped>
.quiz-page { 
  position: relative;
}
.head { 
  
}
.head-label { 
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 14px;
  line-height: 110%;
  letter-spacing: -0.01em;
  color: var(--black);
  text-transform: lowercase;
}
/* .head h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: -0.01em; }
.head-sub { font-size: 14px; margin: 0; } */

.progress { 
  height: var(--progress-bar-height, 16px); 
  background: var(--white, #FFF); 
  border-radius: 999px; 
  overflow: hidden; 
  margin-bottom: 22px; 
}
.progress-bar { 
  height: 100%; 
  background: var(--progress-bar-background, #015F01); 
  border-radius: 999px; transition: width var(--t-base); 
}

.q-title { 
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
  color: #d3ff4f;
  -webkit-text-stroke: 1px #015f01;
}
.answers { display: grid; gap: 10px; }

.answer {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  background: var(--bg); 
  color: var(--text);
  border: 1px solid #afe6dd;
  border-radius: var(--radius);
  text-align: left; 
  font-weight: 500; 
  cursor: pointer; 
  box-shadow: none;
  transition: transform var(--t-fast), border-color var(--t-fast),
              box-shadow var(--t-fast), background var(--t-fast);
  animation: riseIn var(--t-slow) both;
}
.answer:hover:not(:disabled) {
  background: var(--bg); border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
  transform: translateY(-1px);
}
.answer:active:not(:disabled) { transform: scale(.98); }
.answer.selected { 
  border-color: var(--accent); 
}

.answer-index {
  flex-shrink: 0; 
  width: 28px; 
  height: 28px; 
  border-radius: 24px;
  background: #E6F0FF; 
  color: var(--accent);
  font-weight: 700; 
  font-size: 13px;
  display: grid; 
  place-items: center;
}
.answer.selected .answer-index { 
  background: var(--accent); 
  color: #D3FF4F;
}
.answer-text { flex: 1; font-size: 15px; line-height: 1.35; }

.q-slide-enter-active, .q-slide-leave-active { transition: opacity var(--t-base), transform var(--t-base); }
.q-slide-enter-from { opacity: 0; transform: translateX(14px); }
.q-slide-leave-to   { opacity: 0; transform: translateX(-14px); }
</style>
