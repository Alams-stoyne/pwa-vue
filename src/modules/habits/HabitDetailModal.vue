<template>
  <Teleport to="body">
    <transition name="video-overlay">
      <div
        v-if="modelValue && habit"
        class="habit-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="habit.title"
        @click.self="close"
      >
        <div class="habit-modal__inner">
          <div class="habit-modal__card">
            <div class="habit-modal__image-wrap">
              <img
                v-if="habit.image"
                :src="habit.image"
                :alt="habit.title"
                class="habit-modal__image"
              />
              <div
                v-else
                class="habit-modal__emoji"
                aria-hidden="true"
              >{{ habit.emoji || '✨' }}</div>
              <h1 class="habit-modal__title color-text-stroke">{{ habit.title }}</h1>
            </div>

            <p
              v-if="description"
              class="habit-modal__desc"
            >{{ description }}</p>

            <div class="habit-modal__meta">
              <span>{{ habit.timesPerDay }} {{ plural(habit.timesPerDay, ['раз', 'раза', 'раз']) }} в день</span>
              <span class="dot">·</span>
              <span>интервал {{ formatInterval(habit.minIntervalMin) }}</span>
            </div>
          </div>

          <div class="habit-modal__actions">
            <button
              type="button"
              class="btn btn-primary btn-center"
              @click="close"
            >
              Вернуться к выбору
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { useModalRegistry } from '../core/composables/useModalRegistry'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  habit: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const { register, unregister } = useModalRegistry()

const description = computed(() => {
  if (!props.habit) return ''
  return props.habit.description || props.habit.hint || ''
})

function close() {
  emit('update:modelValue', false)
}

function formatInterval(min) {
  const m = Number(min) || 0
  if (m <= 0) return '—'
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} ч ${r} мин` : `${h} ч`
}

function plural(n, forms) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      register(close)
      document.body.style.overflow = 'hidden'
      document.documentElement.classList.add('habit-modal-open')
    } else {
      unregister()
      document.body.style.overflow = ''
      document.documentElement.classList.remove('habit-modal-open')
    }
  }
)

onBeforeUnmount(() => {
  unregister()
  document.body.style.overflow = ''
  document.documentElement.classList.remove('habit-modal-open')
})
</script>

<style scoped>
.habit-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(255, 255, 255, .50);
  backdrop-filter: saturate(160%) blur(6px);
  -webkit-backdrop-filter: saturate(160%) blur(6px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 74px 20px 64px;
  color: #fff;
}

.habit-modal__inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  gap: 16px;
  padding: 32px 0 10px;
}

.habit-modal__head {
  text-align: left;
}

.habit-modal__title {
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
}

.habit-modal__card {
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 2.5px 5px rgba(0, 0, 0, .45);
  animation: riseIn var(--t-slow) both;
  border: 1px solid #afe6dd;
  padding: 16px 16px 24px;
  background: #FFF;
  display: grid;
  gap: 16px;
}

.habit-modal__image-wrap {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--grey-light);
  display: grid;
  place-items: center;
}

.habit-modal__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.habit-modal__emoji {
  font-size: 96px;
  line-height: 1;
  user-select: none;
}

.habit-modal__desc {
  margin: 0;
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 16px;
  line-height: 130%;
  letter-spacing: -0.01em;
  color: #21271f;
  white-space: pre-line;
}

.habit-modal__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-family: var(--font-family);
  font-size: 13px;
  color: #6b7268;
}

.habit-modal__meta .dot {
  color: #21271f;
  opacity: .5;
}

.habit-modal__actions {
  margin-top: auto;
  padding-top: 24px;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0));
  display: flex;
  justify-content: center;
  animation: riseIn var(--t-slow) 160ms both;
}
.habit-modal__actions .btn {
  width: 100%;
  max-width: 358px;
}

.video-overlay-enter-active,
.video-overlay-leave-active {
  transition: opacity var(--t-base);
}
.video-overlay-enter-from,
.video-overlay-leave-to { opacity: 0; }

.video-overlay-enter-active .habit-modal__inner,
.video-overlay-leave-active .habit-modal__inner {
  transition: transform var(--t-base);
}
.video-overlay-enter-from .habit-modal__inner,
.video-overlay-leave-to .habit-modal__inner {
  transform: translateY(10px);
}

@media (max-width: 420px) {
  .habit-modal { padding: 76px 16px 24px; }
  .habit-modal__title { font-size: 19px; }
  .habit-modal__desc { font-size: 14px; }
  .habit-modal__emoji { font-size: 72px; }
}
</style>