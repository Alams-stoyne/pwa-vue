<template>
  <div class="page home-page">
    <transition name="fade" appear>
      <div class="mascot_block">
        <Mascot
          ref="mascotRef"
          body-src="/maskot/body_sport.png"
          :typewriter-speed="40"
        />        
        <div class="bottom_panel">
          <router-link to="/heart" class="btn-short btn-40">
            <AppIcon name="heart" :size="21" />
          </router-link>
          <!-- ▼ ЗАМЕНЕНО НА КОМПОНЕНТ ▼ -->
          <ApplesBadge to="/stats/rules" />
        </div>             
      </div>
    </transition>
    <div class="widgets_block">
      <transition name="fade" appear>  
        <HabitWidget />
      </transition>
      <transition name="fade" appear>  
        <EventsWidget />
      </transition>
    </div>
    <!-- Виджет «Сегодня» отключается через FEATURES.HOME_TODAY_WIDGET -->
    <!-- <TodayWidget v-if="todayWidgetEnabled" /> -->
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useHomeStore } from './store'
import { FEATURES } from '../core/features'
import { useThemeStore } from '../theme/store'
import Mascot from '../../components/Mascot.vue'
import HabitWidget from '../habits/HabitWidget.vue'
import EventsWidget from '../events/EventsWidget.vue'
import ApplesBadge from '../stats/ApplesBadge.vue' // <-- ИМПОРТ
import { useAppBackground } from '../core/composables/useAppBackground'
import AppIcon from '../../components/AppIcon.vue'

const { setBackground } = useAppBackground()
const theme = useThemeStore()
const home = useHomeStore()

const mascotRef = ref(null)
const todayWidgetEnabled = FEATURES.HOME_TODAY_WIDGET

let hideTimer = null

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
  if (!todayWidgetEnabled) {
    return {
      text: 'Привет! Я Зефирчик. Рад тебя видеть на Неделе здоровья и безопасности Х5!',
      emotion: '',
      hideAfterMs: 6000,
    }
  }

  const { newlyDone, newlyVerified, allDone, progressDone, progressTotal } = home

  if (newlyDone.length) {
    return { text: formatNewlyDone(newlyDone), emotion: 'happy', hideAfterMs: 5500 }
  }
  if (newlyVerified.length) {
    return { text: 'Шаги проверены и зачтены.', emotion: 'happy', hideAfterMs: 4500 }
  }
  if (allDone && progressTotal > 0) {
    return { text: 'Все действия дня выполнены. Отличная работа!', emotion: 'happy', hideAfterMs: 6000 }
  }
  if (progressDone > 0 && progressTotal > 0) {
    return { text: `Сегодня ${progressDone} из ${progressTotal}. Продолжаем!`, emotion: '', hideAfterMs: 5000 }
  }
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

  if (todayWidgetEnabled) {
    await home.refreshToday({ commitSnapshot: true })
  }

  const { text, emotion, hideAfterMs } = pickMessage()
  say(text, emotion, hideAfterMs)
})

onBeforeUnmount(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
/* Стили остаются без изменений */
.home-page{ position: relative; }
.mascot_block { position: relative; display: grid; }
.bottom_panel { 
  display: flex;
  position: absolute;
  width: 100%;
  justify-content: space-between;
  bottom: 28px;
  align-items: flex-end;
  z-index: 10;
}
.widgets_block{
    position: relative;
    display: grid;
    gap: 16px;
    margin-bottom: 16px;
}
.widgets_block::-webkit-scrollbar { display: none; }
</style>