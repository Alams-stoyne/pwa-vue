<template>
  <div v-if="theme" class="page reco-page d-grid g24">
    <div class="reco-card">
      <header class="reco-head">
        <div class="reco-label" v-if="isRecommended">Ваша рекомендация</div>
        <div class="reco-name color-text-stroke">{{ theme.name }}</div>
      </header>
      <div class="reco-desc">{{ theme.description }}</div>
    </div>

    <div class="action d-grid g4">
      <button type="button" class="btn btn-primary btn-center" @click="choose">
        Выбрать это направление
      </button>
      <button type="button" class="reco-skip m-auto" @click="skip">
        Посмотреть другие направления
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getTheme } from './themes'
import { useThemeStore } from './store'
import { useQuizStore } from '../quiz/store'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'

const props = defineProps({ id: { type: String, required: true } })

const theme = computed(() => getTheme(props.id))

const store = useThemeStore()
const quiz = useQuizStore()
const router = useRouter()
const toast = useToast()
const { setBackground, clearBackground } = useAppBackground()

/**
 * Это направление — рекомендация после теста?
 * quiz.recommended хранится в localStorage (quiz.recommended) и
 * загружается через quiz.load(). Если тест не пройден — null.
 */
const isRecommended = computed(() => {
  if (!quiz.done) return false
  if (!quiz.recommended) return false
  return String(quiz.recommended) === String(props.id)
})

/**
 * Следим за изменением theme — это ключевой момент.
 * Если данные с CDN придут позже, чем сработал onMounted,
 * watch поймает обновление и установит фон.
 */
watch(
  theme,
  (newTheme) => {
    if (newTheme?.backgroundImageRecomendation) {
      setBackground({ url: newTheme.backgroundImageRecomendation })
    }
  },
  { immediate: true } // сразу проверяем, если данные уже есть
)

function choose() {
  store.setTheme(props.id)
  toast.success(`Выбрано направление: ${theme.value?.name || ''}`)
  router.replace('/home')
}

function skip() {
  router.replace('/themes')
}

onMounted(async () => {
  // на случай, если RecommendationView открыли напрямую по URL
  await store.loadThemes().catch(() => {})
})

// при уходе с экрана — сбрасываем фон
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  clearBackground()
})
</script>

<style scoped>
/* без изменений — все стили из вашего файла */
.reco-page {
  position: relative;
  align-content: end;
  align-items: end;
  justify-content: center;
}

.reco-inner {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 20px;
}

.reco-head {
  background: #f1f3e9;
  border-radius: 24px;
  padding: 20px 0 28px;
  gap: 4px;
  display: grid;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.reco-label {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 120%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-green-dsrk);
}
.reco-name {
  display: flex;
  align-content: center;
  align-items: center;
  justify-content: center;
  text-transform: lowercase;
  font-weight: 400;
  font-size: 40px;
  line-height: 88%;
}

.reco-card {
  display: grid;
  gap: 18px;
  background: #fff;
  border: 1px solid #afe6dd;
  border-radius: 30px;
  padding: 16px 16px 24px;
}

.reco-desc {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 16px;
  line-height: 130%;
  letter-spacing: -0.01em;
  text-align: center;
  color: #21271f;
}

.reco-video-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.22);
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  transition: background var(--t-fast), transform var(--t-fast);
  -webkit-tap-highlight-color: transparent;
}
.reco-video-btn:hover:not(:disabled) { background: rgba(255,255,255,.18); box-shadow: none; }
.reco-video-btn:active:not(:disabled) { transform: scale(.98); }

.reco-video-play {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #D3FF4F;
  color: #015F01;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  padding-left: 2px;
  font-size: 14px;
}

.reco-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 10px;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 40;
}
.reco-actions .btn-primary {
  width: 100%;
  max-width: 358px;
}
.reco-skip {
  background: transparent;
  color: rgba(255,255,255,.75);
  border: none;
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 12px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  box-shadow: none;
  transition: color var(--t-fast);
  -webkit-tap-highlight-color: transparent;
}
.reco-skip:hover:not(:disabled) { color: #fff; background: transparent; box-shadow: none; }

@media (max-width: 420px) {
  .reco-name { font-size: 30px; }
  .reco-desc { font-size: 14.5px; }
}
</style>