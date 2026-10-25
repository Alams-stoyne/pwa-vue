<template>
  <div class="page profile-page">
    <!-- <router-link to="/themes?change=1" class="btn btn-primary btn-center">
      Смена направления
    </router-link>     -->
    
    <Mascot ref="mascot" 
      :body-src="`/maskot/body_sport.png`" 
      bubble-text="Привет! Я Зефирчик. Рад тебя видеть на Неделе здоровья и безопасности Х5!"
      :typewriter-speed="40"
      @bubble-complete="onBubbleDone"
    />  

    <div class="profile-nickname color-text-stroke text-center">
      {{ store.nickname }}
    </div>
    <div class="d-grid g12 w-100">
      <router-link to="/support" class="btn btn-link-white"> 
        <span class="text">написать администратору</span>
        <span class="ico">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0.830603C-2.80058e-07 0.371874 0.371873 1.34778e-06 0.830601 1.55782e-06L11.794 0C12.0143 0 12.2255 0.0875097 12.3813 0.243278C12.5371 0.399046 12.6246 0.610312 12.6246 0.830601V11.794C12.6246 12.2527 12.2527 12.6246 11.794 12.6246C11.3352 12.6246 10.9634 12.2527 10.9634 11.794V2.83585L1.41793 12.3813C1.09356 12.7057 0.567648 12.7057 0.243278 12.3813C-0.0810918 12.0569 -0.0810921 11.531 0.243278 11.2067L9.78873 1.6612L0.830601 1.6612C0.371872 1.6612 -2.97561e-07 1.28933 0 0.830603Z" fill-rule="evenodd" clip-rule="evenodd" fill="#21271F" />
          </svg>
        </span>      
      </router-link>
      <router-link to="/themes?change=1" class="btn btn-link-white"> 
        <span class="text">сменить направление</span>
        <span class="ico">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0.830603C-2.80058e-07 0.371874 0.371873 1.34778e-06 0.830601 1.55782e-06L11.794 0C12.0143 0 12.2255 0.0875097 12.3813 0.243278C12.5371 0.399046 12.6246 0.610312 12.6246 0.830601V11.794C12.6246 12.2527 12.2527 12.6246 11.794 12.6246C11.3352 12.6246 10.9634 12.2527 10.9634 11.794V2.83585L1.41793 12.3813C1.09356 12.7057 0.567648 12.7057 0.243278 12.3813C-0.0810918 12.0569 -0.0810921 11.531 0.243278 11.2067L9.78873 1.6612L0.830601 1.6612C0.371872 1.6612 -2.97561e-07 1.28933 0 0.830603Z" fill-rule="evenodd" clip-rule="evenodd" fill="#21271F" />
          </svg>
        </span>      
      </router-link>
      <button class="btn btn-link-white" @click="restartTutorial"> 
        <span class="text">Пройти обучение заново</span>
        <span class="ico">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0.830603C-2.80058e-07 0.371874 0.371873 1.34778e-06 0.830601 1.55782e-06L11.794 0C12.0143 0 12.2255 0.0875097 12.3813 0.243278C12.5371 0.399046 12.6246 0.610312 12.6246 0.830601V11.794C12.6246 12.2527 12.2527 12.6246 11.794 12.6246C11.3352 12.6246 10.9634 12.2527 10.9634 11.794V2.83585L1.41793 12.3813C1.09356 12.7057 0.567648 12.7057 0.243278 12.3813C-0.0810918 12.0569 -0.0810921 11.531 0.243278 11.2067L9.78873 1.6612L0.830601 1.6612C0.371872 1.6612 -2.97561e-07 1.28933 0 0.830603Z" fill-rule="evenodd" clip-rule="evenodd" fill="#21271F" />
          </svg>
        </span>      
      </button>
    </div>

    <div class="bottom-action d-grid">
      <router-link
        v-if="consent.isGranted"
        to="/profile/edit"
        class="btn btn-primary btn-center"
      >
        Редактировать профиль
      </router-link>

      <ConsentBanner v-else :class="'relative'" text="Редактирование профиля доступно только после согласия на обработку персональных данных." />

    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from './store'
import { useThemeStore } from '../theme/store'
import { useConsentStore } from '../consent/store'
import Mascot from '../../components/Mascot.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
import ConsentBanner from '../consent/ConsentBanner.vue'
import { useTutorialStore } from '../tutorial/store'

const router = useRouter()
const tutorial = useTutorialStore()

async function restartTutorial() {
  tutorial.reset() // сбрасывает tutorial.done и currentStep
  await router.push('/onboarding/tutorial')
}

const store = useProfileStore()
const theme = useThemeStore()
const consent = useConsentStore()
const { setBackground } = useAppBackground()

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  theme.load()
  store.load()
})
</script>

<style scoped>
.profile-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-bottom: 120px; /* под bottom-action */
}

.profile-nickname {
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
  text-align: center;
  margin-top: -94px;
}
</style>