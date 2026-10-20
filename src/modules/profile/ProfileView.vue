<template>
  <div class="page profile-page">
    <Mascot ref="mascot" 
      :body-src="`/maskot/body_sport.png`" 
      bubble-text="Привет! Я Зефирчик. Рад тебя видеть на Неделе здоровья и безопасности Х5!"
      :typewriter-speed="40"
      @bubble-complete="onBubbleDone"
    />  

    <div class="profile-nickname color-text-stroke text-center">
      {{ store.nickname }}
    </div>

    <router-link to="/support" class="btn btn-secondary">
      Тех. поддержка
    </router-link>

    <div class="bottom-action d-grid">
      <!-- <router-link to="/themes?change=1" class="btn btn-primary btn-center">
        Смена направления
      </router-link> -->
      <router-link
        v-if="consent.isGranted"
        to="/profile/edit"
        class="btn btn-primary btn-center"
      >
        Редактировать профиль
      </router-link>

      <div v-else class="consent-warning">
        Редактирование профиля доступно только после согласия
        на обработку персональных данных.
        <router-link to="/onboarding/consent">Дать согласие</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useProfileStore } from './store'
import { useThemeStore } from '../theme/store'
import { useConsentStore } from '../consent/store'
import Mascot from '../../components/Mascot.vue'
import { useAppBackground } from '../core/composables/useAppBackground'


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
}
</style>