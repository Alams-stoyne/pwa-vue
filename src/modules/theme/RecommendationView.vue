<template>
  <div v-if="theme" class="page reco-page d-grid g24">
    <div class="reco-card">
      <header class="reco-head">
        <div class="reco-label" v-if="isRecommended">Ваша рекомендация</div>
        <div class="reco-name color-text-stroke">{{ theme.name }}</div>
      </header>
      <div class="reco-desc" v-html="theme.description"></div>
    </div>

    <!-- ▼ ДОБАВЛЕНО: подсказка при смене направления ▼ -->
    <div v-if="isChangeMode && themeLimitReached" class="limit-banner">
      На сегодня награды за направление получены — смена направления
      сегодня не принесёт новых наград.
    </div>

    <div class="action d-grid g4">
      <button type="button" class="btn btn-primary btn-center" @click="choose">
        выбрать это направление
      </button>
      <button type="button" class="reco-skip m-auto" @click="skip">
        посмотреть другие направления
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTheme } from './themes'
import { useThemeStore } from './store'
import { useQuizStore } from '../quiz/store'
import { useToast } from '../core/composables/useToast'
import { useLimits } from '../core/limits'
import { useAppBackground } from '../core/composables/useAppBackground'

const props = defineProps({ id: { type: String, required: true } })

const theme = computed(() => getTheme(props.id))

const store = useThemeStore()
const quiz = useQuizStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const limitsApi = useLimits()
const { setBackground, clearBackground } = useAppBackground()

const isChangeMode = computed(() =>
  route.query.change === '1' ||
  (!!store.selected && !route.meta?.recommendationOnly && route.query.change !== '0')
)

const isRecommended = computed(() => {
  if (!quiz.done) return false
  if (!quiz.recommended) return false
  return String(quiz.recommended) === String(props.id)
})

// ▼ НОВОЕ: подсказка показывается только когда И лекции, И практики
//   по направлению уже награждены сегодня. ▼
const themeLimitReached = computed(() => {
  const t = limitsApi.asMap.value
  return Boolean(t.lecture_theme?.reached) && Boolean(t.task?.reached)
})

watch(
  theme,
  (newTheme) => {
    if (newTheme?.backgroundImageRecomendation) {
      setBackground({ url: newTheme.backgroundImageRecomendation })
    }
  },
  { immediate: true }
)

function choose() {
  if (isChangeMode.value && themeLimitReached.value) {
    toast.warn(
      'На сегодня награды за направление получены — смена направления сегодня не принесёт новых наград.',
      { duration: 6000 },
    )
  }
  store.setTheme(props.id)
  router.replace('/home')
}

function skip() {
  if (isChangeMode.value) router.replace('/themes?change=1')
  else router.replace('/themes')
}

onMounted(async () => {
  await store.loadThemes().catch(() => {})
})

onBeforeUnmount(() => {
  clearBackground()
})
</script>

<style scoped>
.reco-page {
  position: relative;
  align-content: end;
  align-items: end;
  justify-content: center;
}

.reco-inner { max-width: 640px; margin: 0 auto; padding: 0 20px; }

.reco-head {
  background: #f1f3e9; border-radius: 24px;
  padding: 20px 0 28px; gap: 4px;
  display: grid; align-items: center; justify-content: center;
  text-align: center;
}
.reco-label {
  font-family: var(--font-family); font-weight: 500;
  font-size: 18px; line-height: 120%; text-align: center;
  text-transform: lowercase; text-wrap: balance; color: var(--txt-green-dsrk);
}
.reco-name {
  display: flex; align-content: center; align-items: center;
  justify-content: center; text-transform: lowercase;
  font-weight: 400; font-size: 40px; line-height: 88%;
}
.reco-card {
  display: grid; gap: 18px; background: #fff;
  border: 1px solid #afe6dd; border-radius: 30px;
  padding: 16px 16px 24px;
}
.reco-desc {
  font-family: var(--font-family); font-weight: 400;
  font-size: 16px; line-height: 130%; letter-spacing: -0.01em;
  color: #21271f;
}
.reco-desc :deep(p) { margin: 0 0 12px; }
.reco-desc :deep(p:last-child) { margin-bottom: 0; }
.reco-desc :deep(ul),
.reco-desc :deep(ol) { text-align: left; margin: 0 0 12px; padding-left: 20px; }
.reco-desc :deep(li) { margin-bottom: 4px; }
.reco-desc :deep(strong),
.reco-desc :deep(b) { font-weight: 700; }
.reco-desc :deep(em),
.reco-desc :deep(i) { font-style: italic; }
.reco-desc :deep(a) {
  color: var(--accent); text-decoration: underline; text-underline-offset: 2px;
}

.limit-banner {
  padding: 12px 16px;
  border-radius: 14px;
  background: #FFF8EC;
  border: 1px solid #FBE5C6;
  color: #7a4b00;
  font-family: var(--font-family);
  font-size: 13px;
  line-height: 1.4;
  text-wrap: balance;
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