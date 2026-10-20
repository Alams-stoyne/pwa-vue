<template>
  <Teleport to="body">
    <transition name="video-overlay">
      <div
        v-if="modelValue"
        class="video-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="video-overlay__inner">
          <!-- Заголовок — вне окна с плеером, на подложке оверлея -->
          <header class="video-overlay__head">
            <h1 class="video-overlay__title color-text-stroke">{{ title }}</h1>
          </header>

          <!-- Само «окно» с плеером -->
          <div class="video-overlay__player">
            <VideoEmbed :url="url" />
            <!-- Пояснительный текст под видео -->
            <div v-if="description" class="video-overlay__desc">{{ description }}</div>
          </div>

          <!-- Кнопка закрытия. Текст задаёт вызывающий экран через closeLabel -->
          <div class="video-overlay__actions">
            <button
              type="button"
              class="btn-primary"
              @click="close"
            >
              {{ closeLabel }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import VideoEmbed from './VideoEmbed.vue'
import { useModalRegistry } from '../modules/core/composables/useModalRegistry'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  url: { type: String, required: true },
  title: { type: String, default: 'Видео о направлении' },
  breadcrumb: { type: String, default: 'Направление' },
  description: { type: String, default: '' },
  /**
   * Текст кнопки закрытия. Задаёт вызывающий экран:
   *   • RecommendationView → «Вернуться к рекомендации»
   *   • откуда-то ещё → «Закрыть» (по умолчанию)
   */
  closeLabel: { type: String, default: 'Закрыть' },
})
const emit = defineEmits(['update:modelValue'])

const { register, unregister } = useModalRegistry()

function close() {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      register(close)
      document.body.style.overflow = 'hidden'
      document.documentElement.classList.add('video-overlay-open')
    } else {
      unregister()
      document.body.style.overflow = ''
      document.documentElement.classList.remove('video-overlay-open')
    }
  },
  { immediate: false }
)

onBeforeUnmount(() => {
  unregister()
  document.body.style.overflow = ''
  document.documentElement.classList.remove('video-overlay-open')
})
</script>

<style scoped>
.video-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(255, 255, 255, .50);
  backdrop-filter: saturate(160%) blur(6px);
  -webkit-backdrop-filter: saturate(160%) blur(6px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 74px 20px 24px;   /* место под сквозную кнопку «Назад» */
  color: #fff;
}

.video-overlay__inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 16px;
  /* padding: 32px 0 10px 0; */
}

/* Заголовок — вне «окна» плеера */
.video-overlay__head {
  text-align: left;
}
.video-overlay__title {
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
}

/* «Окно» с плеером */
.video-overlay__player {
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2.5px 5px rgba(0,0,0,.45);
  animation: riseIn var(--t-slow) both;
  border: 1px solid #afe6dd;
  border-radius: 30px;
  padding: 16px 16px 24px;
  background: #FFF;
  display: grid;
  gap: 16px;
}

/* Пояснительный текст */
.video-overlay__desc {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 16px;
  line-height: 130%;
  letter-spacing: -0.01em;
  color: #21271f;
  animation: riseIn var(--t-slow) 80ms both;
}

/* Кнопка закрытия */
.video-overlay__actions {
  margin-top: auto;                 /* прижимает к нижней части */
  padding-top: 24px;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
  display: flex;
  justify-content: center;
  animation: riseIn var(--t-slow) 160ms both;
}
.video-overlay__actions .btn-primary {
  max-width: 358px;
}

/* Переходы */
.video-overlay-enter-active,
.video-overlay-leave-active {
  transition: opacity var(--t-base);
}
.video-overlay-enter-from,
.video-overlay-leave-to { opacity: 0; }

.video-overlay-enter-active .video-overlay__inner,
.video-overlay-leave-active .video-overlay__inner {
  transition: transform var(--t-base);
}
.video-overlay-enter-from .video-overlay__inner,
.video-overlay-leave-to .video-overlay__inner {
  transform: translateY(10px);
}

@media (max-width: 420px) {
  .video-overlay { padding: 76px 16px 24px; }
  .video-overlay__title { font-size: 19px; }
  .video-overlay__desc { font-size: 14px; }
}
</style>