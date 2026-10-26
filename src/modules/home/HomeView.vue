<template>
  <div class="page home-page">
    <transition name="fade" appear>
      <div class="mascot_block">
        <MascotAnim
          ref="mascotRef"
          :scenes="SCENES"
          body-src="/maskot/body_sport.png"
          :typewriter-speed="40"
          @scene-complete="onSceneComplete"
          @scene-error="onSceneError"
          @click="onMascotClick"
        />
        <div class="bottom_panel">
          <router-link to="/heart" class="btn-short btn-40">
            <AppIcon name="heart" :size="21" />
          </router-link>
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
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useHomeStore } from './store'
import { useMascotStore } from '../mascot/store'
import { SCENES } from '../mascot/events'
import { useThemeStore } from '../theme/store'
import { useHabitsStore } from '../habits/store'
import { useTasksStore } from '../tasks/store'
import { useLecturesStore } from '../lectures/store'
import { useStepsStore } from '../steps/store'
import MascotAnim from '../../components/MascotAnim.vue'
import HabitWidget from '../habits/HabitWidget.vue'
import EventsWidget from '../events/EventsWidget.vue'
import ApplesBadge from '../stats/ApplesBadge.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
import AppIcon from '../../components/AppIcon.vue'

const { setBackground } = useAppBackground()
const theme = useThemeStore()
const home = useHomeStore()
const mascotStore = useMascotStore()

const habits = useHabitsStore()
const tasks = useTasksStore()
const lectures = useLecturesStore()
const steps = useStepsStore()

const mascotRef = ref(null)

// ── Обработка currentEvent ──────────────────────────────────
// immediate: true — важно! При mount обработаем существующий
// currentEvent (например, если событие пришло на другой странице).
watch(
  () => mascotStore.currentEvent,
  (ev) => {
    const m = mascotRef.value
    if (!m) return

    // Скрываем предыдущий пузырь — не должен «залипать»
    m.hideBubble()

    if (!ev) {
      // Очередь пуста — играем idle
      m.playScene('idle', { loop: true }).catch(() => { /* silent */ })
      return
    }

    // Играем сцену события. .catch пустой — при ошибке
    // onSceneError уже вызвал mascotStore.finish().
    m.playScene(ev.scene, { loop: false }).catch(() => { /* handled */ })

    // Пузырь показываем синхронно со стартом Lottie
    if (ev.bubble) m.showBubble(ev.bubble)
  },
  { immediate: true },
)

function onSceneComplete() {
  mascotStore.finish()
}

function onSceneError() {
  // Ошибка Lottie (404/битый JSON) — не блокируем очередь
  mascotStore.finish()
}

function onMascotClick() {
  // Тап по маскоту — пропуск текущей анимации
  mascotStore.skip()
  mascotRef.value?.hideBubble()
}

// ── Проверка «всё ли выполнено» ─────────────────────────────
function checkAllDone() {
  if (mascotStore.isPlaying || mascotStore.queue.length) return

  const hDone =
    habits.totalProgress.total > 0 &&
    habits.totalProgress.done >= habits.totalProgress.total
  const tDone =
    tasks.progress.total > 0 &&
    tasks.progress.done >= tasks.progress.total
  const lDone =
    lectures.generalList.length + lectures.themeList.length + lectures.chargingList.length > 0 &&
    lectures.totalUnread === 0
  const sDone = steps.isConfirmedToday

  if (hDone && tDone && lDone && sDone) {
    mascotStore.trigger('all_done')
  }
}

watch(
  () => [
    habits.totalProgress.done,
    tasks.progress.done,
    lectures.totalUnread,
    steps.isConfirmedToday,
  ],
  () => checkAllDone(),
)

// ── Lifecycle ───────────────────────────────────────────────
onMounted(async () => {
  setBackground({ url: '/backgrounds/bg_home.jpg' })
  theme.load()
  home.load()

  // Приветствие (oncePerDay — если уже было, не сработает)
  mascotStore.trigger('greeting')

  // Если после trigger() очередь всё ещё пуста — играем idle.
  // (Если greeting сработал, watch уже включил анимацию.)
  if (!mascotStore.currentEvent && mascotRef.value) {
    mascotRef.value.playScene('idle', { loop: true }).catch(() => { /* silent */ })
  }

  // Проверка all_done при входе
  setTimeout(checkAllDone, 2000)
})

onBeforeUnmount(() => {
  // Скрываем пузырь — не должен «залипать» после возврата
  mascotRef.value?.hideBubble()
  // Останавливаем Lottie
  mascotRef.value?.stopScene()
  // Сбрасываем состояние маскота: isPlaying, currentEvent, queue.
  // Без этого при возврате currentEvent останется «старым»,
  // isPlaying = true, и все новые события будут уходить в queue,
  // но не проигрываться (watch не сработает — currentEvent не меняется).
  mascotStore.clear()
})
</script>

<style scoped>
.home-page {
  position: relative;
  display: grid;
  max-height: 100dvh;
}
.mascot_block {
  position: relative;
  z-index: 2;
}
.bottom_panel {
  display: flex;
  position: absolute;
  width: 100%;
  justify-content: space-between;
  bottom: 28px;
  align-items: flex-end;
  z-index: 10;
}
.widgets_block {
  position: relative;
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
  height: 100%;
  max-height: calc(100dvh - 100dvw - 168px);
  border-radius: 20px;
  overflow: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}
.widgets_block::-webkit-scrollbar {
  display: none;
}
</style>