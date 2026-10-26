<template>
  <div class="page welcome-page">
    <div class="welcome-body">
      <h1 class="welcome-title">Добро пожаловать</h1>
    </div> 
    <div class="mascot_block">
      <Mascot ref="mascot" id="welcome-mascot"
        :body-src="`/maskot/body_sport.png`" 
        bubble-text="Я Зефирчик!&#10;Спасибо, что заботились обо мне всё это время. Мне было так приятно ваше внимание и забота!" 
        :typewriter-speed="40"
        @bubble-complete="onBubbleDone"
        effect="stars-fast" 
      />           
    </div>

    <div class="welcome-text">
      <p><strong>А теперь пришла очередь Зефирчика позаботиться о вас!</strong></p>
      <p>Всю Неделю здоровья и безопасности Х5 Зефирчик будет рядом: поможет освоиться на платформе, познакомит с её возможностями и подскажет, с чего начать.</p>
      <p>Вместе с Зефирчиком вы сможете двигаться шаг за шагом, прислушиваться к себе и выбирать то, что подходит именно вам.</p>
      <p>Давайте начнём с небольшого тестирования. Ваши ответы помогут определить, какое из трёх направлений может быть вам ближе: <b>Антистресс</b>, <b>Энергия</b> или <b>Тело</b>.</p>
      <p>Здесь нет правильных или неправильных ответов — важно лишь то, что подходит именно вам. А окончательный выбор направления остаётся за вами!</p>
    </div>
    <Mascot class="mascot_bottom" :body-src="`/maskot/wellcome_dop.png`" hide-face/>     
    <!-- <div class="bottom-action"></div> -->
    <button type="button" class="btn btn-primary btn-center btn-full" @click="start">
      начать тестирование
    </button>    
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
  font-weight: 400;
  font-size: 16px;
  line-height: 120%;
  border-radius: 28px;
  padding: 28px;
  background: var(--white);
  color: var(--black);
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 16px;
  letter-spacing: -0.01em;
  margin-top: -15%;
}

.welcome-text p{
  position: relative;
}
.welcome-text p strong{
  position: relative;
  font-weight: 500;
  font-size: 18px;
}
.mascot_bottom{
  position: relative;
  margin-left: 18px;
}
.mascot_bottom .maskot__face{
  display: none;
}
</style>