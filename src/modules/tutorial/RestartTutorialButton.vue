<template>
  <button 
    type="button" 
    class="btn btn-secondary btn-center" 
    @click="restartTutorial"
  >
    Пройти обучение заново
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTutorialStore } from './store'

const router = useRouter()
const store = useTutorialStore()

function restartTutorial() {
  // 1. Сбрасываем флаг прохождения в localStorage и обнуляем шаг
  store.reset()
  
  // 2. Переходим на страницу обучения
  router.push('/onboarding/tutorial')
}
</script>