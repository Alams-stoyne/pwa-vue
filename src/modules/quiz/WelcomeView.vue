<template>
  <div class="page welcome-page">
    <Mascot ref="mascot" 
      :body-src="`/maskot/body_sport.png`" 
      bubble-text="Привет! тут будет приветствие от зефирчика."
      :typewriter-speed="40"
      @bubble-complete="onBubbleDone"
    />     
    <div class="welcome-body">
      <h1 class="welcome-title">Добро пожаловать</h1>
      <p class="welcome-text">ответьте на несколько вопросов — мы предложим подходящее направление</p>
    </div>
    <div class="bottom-action">
      <button type="button" class="btn btn-primary btn-center" @click="start">
        Начать тестирование
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuizStore } from './store'
import Mascot from '../../components/Mascot.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const router = useRouter()
const store = useQuizStore()

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_start.jpg' })
  store.load()
  if (store.done) { router.replace('/themes'); return }
  // Вопросы грузятся заранее — чтобы на /quiz не было пустого экрана
  await store.loadQuestions().catch(() => {})
})

function start() {
  store.begin()
  router.push('/quiz')
}
</script>

<style scoped>
.welcome-page {
  position: relative;
  /* display: grid; */
}

.welcome-body {
  max-width: 360px;
  margin: 0 auto;
  animation: riseIn var(--t-slow) both;
}

.welcome-title {
  position: relative;
  margin: 0;
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 40px;
  line-height: 88%;
  text-align: center;
  color: var(--txt-brand);
  text-transform: lowercase;
  -webkit-text-stroke: 1.5px #015f01;
}

.welcome-text {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 120%;
  text-align: center;
  color: var(--white);
}

</style>