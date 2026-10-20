<template>
  <div class="page home-page">
    <transition name="fade" appear>
      <Mascot
        ref="mascotRef"
        body-src="/maskot/body_sport.png"
        :typewriter-speed="40"
      />
    </transition>

    <transition name="fade" appear>
      <HabitWidget />
    </transition>

    <TodayWidget />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useThemeStore } from '../theme/store'
import Mascot from '../../components/Mascot.vue'
import HabitWidget from '../habits/HabitWidget.vue'
import TodayWidget from './TodayWidget.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
import { useHomeStore } from './store'

const { setBackground } = useAppBackground()
const theme = useThemeStore()
const home = useHomeStore()

const mascotRef = ref(null)

let hideTimer = null

/**
 * Показать фразу в облаке. hideAfterMs > 0 — скрыть через N мс.
 * Отменяет предыдущий hide-таймер, если был.
 */
function say(text, emotion = '', hideAfterMs = 5500) {
  const m = mascotRef.value
  if (!m) return
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  if (emotion) m.setEmotion(emotion)
  m.showBubble(text)
  if (hideAfterMs > 0) {
    hideTimer = setTimeout(() => {
      m.hideBubble()
      hideTimer = null
    }, hideAfterMs)
  }
}

function formatNewlyDone(items) {
  const labels = items.map(x => x.label).filter(Boolean)
  if (!labels.length) return 'Новое действие зачтено!'
  if (labels.length === 1) return `Зачтено: ${labels[0]}. Так держать!`
  return `Зачтено: ${labels.join(', ')}. Так держать!`
}

function pickMessage() {
  const { newlyDone, newlyVerified, allDone, progressDone, progressTotal } = home

  // 1. Что-то новое сделано за этот заход
  if (newlyDone.length) {
    return { text: formatNewlyDone(newlyDone), emotion: 'happy', hideAfterMs: 5500 }
  }

  // 2. Шаги подтверждены (актуально при переходе pending → approved)
  if (newlyVerified.length) {
    return { text: 'Шаги проверены и зачтены.', emotion: 'happy', hideAfterMs: 4500 }
  }

  // 3. Все действия дня
  if (allDone && progressTotal > 0) {
    return { text: 'Все действия дня выполнены. Отличная работа!', emotion: 'happy', hideAfterMs: 6000 }
  }

  // 4. Часть дня — счётчики из фактического прогресса
  if (progressDone > 0 && progressTotal > 0) {
    return { text: `Сегодня ${progressDone} из ${progressTotal}. Продолжаем!`, emotion: '', hideAfterMs: 5000 }
  }

  // 5. Приветствие — если ничего не сделано
  return {
    text: 'Привет! Я Зефирчик. Рад тебя видеть на Неделе здоровья и безопасности Х5!',
    emotion: '',
    hideAfterMs: 6000,
  }
}

onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_home.jpg' })
  theme.load()
  home.load()

  // Загружаем данные, СЧИТАЕМ ДИФФ с прошлого снимка, ПЕРЕЗАПИСЫВАЕМ снимок.
  await home.refreshToday({ commitSnapshot: true })

  const { text, emotion, hideAfterMs } = pickMessage()
  say(text, emotion, hideAfterMs)
})

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: 8px 0 22px;
}
.hero-title { font-size: 26px; margin: 14px 0 0; letter-spacing: -0.02em; }
</style>