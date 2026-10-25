<template>
  <div class="page theme-page page--bottom-action">
    <transition name="fade" appear>
      <header>
        <div class="theme-top-title color-text-stroke">{{ isChangeMode ? 'Смена направления' : 'Выберите направление' }}</div>
      </header>
    </transition>

    <div class="theme-grid">
      <article
        v-for="(t, i) in store.themes"
        :key="t.id"
        class="theme-card rise"
        :class="{ selected: store.effective === t.id, busy }"
        :style="{ animationDelay: i * 60 + 'ms' }"
      >
        <button type="button" class="theme-main" :disabled="busy" @click="pick(t.id)">
          <span class="theme-check" aria-hidden="true"><AppIcon name="check" :size="16" /></span>
          <div class="theme-info">
            <span class="theme-name color-text-stroke">{{ t.name }}</span>
            <div v-if="quiz.recommended === t.id && !isChangeMode" class="theme-badge">⭐ рекомендуем</div>
            <span class="theme-subtitle muted">{{ t.subtitle }}</span>            
          </div>
        </button>

        <button class="theme-details" :disabled="busy" @click.stop="openRecomendation(t)">
          <span>подробнее</span>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.830603C-2.80058e-07 0.371874 0.371873 1.34778e-06 0.830601 1.55782e-06L11.794 0C12.0143 0 12.2255 0.0875097 12.3813 0.243278C12.5371 0.399046 12.6246 0.610312 12.6246 0.830601V11.794C12.6246 12.2527 12.2527 12.6246 11.794 12.6246C11.3352 12.6246 10.9634 12.2527 10.9634 11.794V2.83585L1.41793 12.3813C1.09356 12.7057 0.567648 12.7057 0.243278 12.3813C-0.0810918 12.0569 -0.0810921 11.531 0.243278 11.2067L9.78873 1.6612L0.830601 1.6612C0.371872 1.6612 -2.97561e-07 1.28933 0 0.830603Z" fill="#21271F" />
          </svg>           
        </button>

        <!-- <button class="theme-details" :disabled="busy" @click.stop="openVideo(t)">
          <span>Подробнее</span>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.830603C-2.80058e-07 0.371874 0.371873 1.34778e-06 0.830601 1.55782e-06L11.794 0C12.0143 0 12.2255 0.0875097 12.3813 0.243278C12.5371 0.399046 12.6246 0.610312 12.6246 0.830601V11.794C12.6246 12.2527 12.2527 12.6246 11.794 12.6246C11.3352 12.6246 10.9634 12.2527 10.9634 11.794V2.83585L1.41793 12.3813C1.09356 12.7057 0.567648 12.7057 0.243278 12.3813C-0.0810918 12.0569 -0.0810921 11.531 0.243278 11.2067L9.78873 1.6612L0.830601 1.6612C0.371872 1.6612 -2.97561e-07 1.28933 0 0.830603Z" fill="#21271F" />
          </svg>           
        </button> -->

      </article>
    </div>

    <div class="bottom-action d-grid g8">
      <button
        type="button"
        class="btn btn-primary btn-center"
        :disabled="!canConfirm || busy"
        @click="confirm"
      >
        <template v-if="busy">сохраняем…</template>
        <template v-else-if="isChangeMode">сохранить изменения</template>
        <template v-else>подтвердить выбор</template>
      </button>

      <button
        type="button"
        class="btn btn-secondary btn-center"
        @click="retake"
      >       
       пройти тест заново
      </button>
    </div>

    <!-- <VideoOverlay
      v-model="videoOpen"
      :url="currentVideoTheme?.videoUrl || ''"
      :title="currentVideoTheme?.name || ''"
      breadcrumb="Направление"
      :description="currentVideoTheme?.videoDescription || ''"
    /> -->
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from './store'
import { useQuizStore } from '../quiz/store'
import AppIcon from '../../components/AppIcon.vue'
import VideoOverlay from '../../components/VideoOverlay.vue'
import { getTheme } from '../theme/themes'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'
import { resolveNextOnboardingRoute } from '../onboarding/navigation'

const store = useThemeStore()
const quiz = useQuizStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { setBackground, clearBackground } = useAppBackground()

const isChangeMode = computed(() =>
  route.query.change === '1' ||
  (!!store.selected && !route.meta?.recommendationOnly && route.query.change !== '0')
)

const busy = ref(false)
const videoOpen = ref(false)
const currentVideoTheme = ref(null)

const canConfirm = computed(() => !!store.draft && store.draft !== store.selected)
const recommendedName = computed(() => getTheme(quiz.recommended)?.name || '')

onMounted(() => { 
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  store.load(); 
  quiz.load()
})

function pick(id) { if (!busy.value) store.setDraft(id) }

function openVideo(theme) {
  currentVideoTheme.value = theme
  videoOpen.value = true
}

function openRecomendation(theme) {
  router.push(`/themes/${theme.id}`)
}

async function confirm() {
  if (!canConfirm.value || busy.value) return
  busy.value = true
  if (!store.commitDraft()) { busy.value = false; return }

  if (isChangeMode.value) {
    router.back()
    return
  }

  const next = await resolveNextOnboardingRoute()
  router.replace(next)
}

function retake() {
  store.clearDraft()
  quiz.reset()
  router.push('/quiz/welcome')
}
</script>

<style scoped>
.theme-page { 
  position: relative;
  /* background: linear-gradient(180deg, #86d0fb -14.79%, rgba(134, 208, 251, 0) 100%); */
}

.theme-page .theme-top-title{
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
  text-transform: lowercase;
}
.head-label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 6px; color: var(--accent); }
.recommend-note { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; }
.recommend-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 1.6s ease-in-out infinite; }

.theme-grid { display: grid; gap: 12px; margin-top: 20px; }
@media (max-width: 420px) { .theme-grid { grid-template-columns: 1fr; } }

.theme-card {
  position: relative; 
  display: flex; 
  flex-direction: column;
  border: 1.5px solid var(--border); 
  border-radius: var(--radius);
  background: var(--bg, #fff); 
  overflow: hidden;
  transition: transform var(--t-base), border-color var(--t-base),
              box-shadow var(--t-base), background var(--t-base), opacity var(--t-base);
}
.theme-card:hover { 
  transform: translateY(-3px); 
  box-shadow: var(--shadow-1); 
}
.theme-card.selected {
   border-color: #015f01; 
   box-shadow: 0 0 0 1px var(--accent-soft); 
}
.theme-card.busy { opacity: .6; pointer-events: none; }

.theme-main {
  position: relative; 
  display: flex; 
  gap: 16px; 
  padding: 18px 15px; 
  text-align: left;
  background: transparent; color: var(--text); font-weight: 500;
  border: none; border-radius: 0; box-shadow: none; cursor: pointer;
}
.theme-main:hover:not(:disabled) { background: transparent; box-shadow: none; }
.theme-main:active:not(:disabled) { transform: none; }
.theme-info{
  position: relative;
  display: flex; 
  flex-direction: column; 
  align-items: flex-start;
  gap: 6px; 
}
.theme-emoji { font-size: 26px; line-height: 1; }
.theme-name { 
  font-weight: 400;
  font-size: 17px;
  line-height: 159%;
  text-wrap: balance;
}
.theme-subtitle { font-size: 12px; }
.theme-badge {
  display: flex;
  gap: 8px;
  border-radius: 120px;
  padding: 4px 10px 5px 8px;
  background: #f1f3e9;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-align: center;
  color: #015f01;
}
.theme-check {
  background: #d1efea;
  width: 24px; 
  height: 24px; 
  border-radius: 50%;
  display: grid; 
  place-items: center; 
  color: #fff; 
  transition: opacity var(--t-base), transform var(--t-base);
}
.theme-card.selected .theme-check{ 
  background: #015f01;
  color: #D3FF4F;
}

.theme-details {
  position: absolute;
  text-decoration: none;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-align: center;
  background: #FFF;
  color: #21271f;
  top: 18px;
  right: 15px;
  display: flex;
  gap: 6px;
  border: 1.50px solid #21271f;
  border-radius: 120px;
  padding: 10px 16px 11px;
  width: 117px;
  height: 40px;
  min-height: 40px;
}
.theme-details:hover { background: rgba(15, 90, 5, .18); }

.retake-wrap {
  margin-top: 90px;
  display: flex;
  justify-content: center;
}
.retake-btn { max-width: 358px; }
</style>