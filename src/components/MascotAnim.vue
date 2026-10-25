<template>
  <div
    class="maskot-anim"
    :class="{ 'is-fixed': fixed }"
    :style="containerStyle"
  >
    <!-- Слой 1: стандартный маскот (всегда в DOM, видимость через opacity/visibility) -->
    <div
      class="maskot-anim__layer maskot-anim__layer--static"
      :class="{ 'is-hidden': currentMode !== 'static' }"
    >
      <Mascot
        ref="mascotRef"
        v-bind="mascotProps"
        bubble-text=""
        :typewriter-speed="0"
        @click="onMascotClick"
      />
    </div>

    <!-- Слой 2: Lottie-сцена (монтируется при первом playScene, дальше живёт) -->
    <div
      class="maskot-anim__layer maskot-anim__layer--lottie"
      :class="{ 'is-hidden': currentMode !== 'lottie' }"
    >
      <Vue3Lottie
        v-if="currentLottieData"
        ref="lottiePlayerRef"
        :key="sceneKey"
        :animation-data="currentLottieData"
        :loop="lottieLoopRef"
        :autoplay="true"
        :speed="lottieSpeed"
        class="maskot-anim__lottie-player"
        @on-complete="onLottieComplete"
      />
    </div>

    <!-- Слой 3: пузырь — единая точка для обоих режимов -->
    <MascotBubble
      ref="bubbleRef"
      :text="bubbleText"
      :speed="typewriterSpeed"
      @complete="onBubbleComplete"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Mascot from './Mascot.vue'
import MascotBubble from './MascotBubble.vue'
import { Vue3Lottie } from 'vue3-lottie'

const props = defineProps({
  mode: { type: String, default: 'static' },
  scenes: { type: Object, default: () => ({}) },

  lottieLoop: { type: Boolean, default: false },
  lottieSpeed: { type: Number, default: 1 },
  returnToStaticOnComplete: { type: Boolean, default: true },

  // Проброс в Mascot.vue
  backgroundSrc: { type: String, default: '' },
  bodySrc: { type: String, default: '/maskot/empty_body.png' },
  size: { type: [Number, String], default: '' },
  fixed: { type: Boolean, default: false },
  fixedPosition: {
    type: Object,
    default: () => ({ top: 'auto', right: '20px', bottom: '20px', left: 'auto' }),
  },
  zIndex: { type: [Number, String], default: 50 },
  emotion: { type: String, default: '' },
  autoBlink: { type: Boolean, default: true },
  winkOnClick: { type: Boolean, default: false },
  bubbleText: { type: String, default: '' },
  typewriterSpeed: { type: Number, default: 35 },
  hideFace: { type: Boolean, default: false },
  effect: { type: String, default: 'none' },
  arrows: { type: Boolean, default: false },
  check: { type: Boolean, default: false },
  effects: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'click',
  'bubble-complete',
  'scene-start',
  'scene-complete',
  'scene-error',
  'mode-change',
])

const mascotRef = ref(null)
const bubbleRef = ref(null)
const lottiePlayerRef = ref(null)

// ── Режим ─────────────────────────────────────────────────
const currentMode = ref(props.mode === 'lottie' ? 'lottie' : 'static')
watch(() => props.mode, (v) => {
  if (v === 'static' || v === 'lottie') {
    currentMode.value = v
    emit('mode-change', v)
  }
})

// ── Loop: prop как initial, дальше рулим внутренним ref ──
const lottieLoopRef = ref(props.lottieLoop)
watch(() => props.lottieLoop, (v) => { lottieLoopRef.value = !!v })
function setLoop(v) {
  lottieLoopRef.value = !!v
}

// ── Кеш сцен ──────────────────────────────────────────────
const sceneCache = new Map()
const currentSceneName = ref(null)
const currentLottieData = ref(null)
const sceneKey = ref(0)

// ── Проброс в Mascot (без управляющих + без дублирования пузыря) ──
const mascotProps = computed(() => {
  const {
    mode, scenes, lottieLoop, lottieSpeed, returnToStaticOnComplete,
    bubbleText, typewriterSpeed,
    ...rest
  } = props
  return rest
})

// ── Стиль контейнера ──────────────────────────────────────
const containerStyle = computed(() => {
  const style = {}
  if (props.size !== '' && props.size != null) {
    style['--maskot-size'] = typeof props.size === 'number' ? `${props.size}px` : props.size
  }
  if (props.fixed) {
    style.zIndex = props.zIndex
    const p = props.fixedPosition || {}
    if (p.top != null) style.top = p.top
    if (p.right != null) style.right = p.right
    if (p.bottom != null) style.bottom = p.bottom
    if (p.left != null) style.left = p.left
  }
  return style
})

// ── Обработчики ───────────────────────────────────────────
function onMascotClick(e) { emit('click', e) }
function onBubbleComplete() { emit('bubble-complete') }

function onLottieComplete() {
  // В loop-режиме on-complete срабатывает на каждой итерации — не считаем это «финишем»
  if (lottieLoopRef.value) return

  const finished = currentSceneName.value
  emit('scene-complete', finished)

  if (props.returnToStaticOnComplete) {
    currentMode.value = 'static'
    // currentLottieData НЕ обнуляем — Lottie остаётся смонтированным, fade работает корректно
    emit('mode-change', 'static')
  }
}

// ── Загрузка сцены (с in-memory кешем) ────────────────────
async function loadSceneData(name) {
  const src = props.scenes?.[name]
  if (!src) throw new Error(`Scene "${name}" не найдена в props.scenes`)
  if (typeof src === 'object') return src
  if (sceneCache.has(src)) return sceneCache.get(src)

  const res = await fetch(src, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`Не удалось загрузить ${src}: ${res.status}`)
  const json = await res.json()
  sceneCache.set(src, json)
  return json
}

// ── Публичный API ─────────────────────────────────────────
let activeToken = 0

async function playScene(name, options = {}) {
  if (options.loop !== undefined) lottieLoopRef.value = !!options.loop

  // Пузырь скрываем сразу — не должен висеть поверх Lottie
  bubbleRef.value?.hideBubble()

  const token = ++activeToken
  const isSameScene = currentSceneName.value === name && !!currentLottieData.value

  emit('scene-start', name)

  try {
    const data = await loadSceneData(name)
    if (token !== activeToken) return

    currentSceneName.value = name

    if (currentLottieData.value !== data) {
      currentLottieData.value = data
      sceneKey.value++ // force remount для новой сцены
    }

    currentMode.value = 'lottie'
    emit('mode-change', 'lottie')
    await nextTick()

    // Если та же сцена — рестартим через императивный API (без переинициализации JSON)
    if (isSameScene && lottiePlayerRef.value) {
      try {
        lottiePlayerRef.value.stop?.()
        lottiePlayerRef.value.play?.()
      } catch (e) {
        // fallback — force remount
        sceneKey.value++
      }
    }
  } catch (err) {
    emit('scene-error', { name, error: err })
    currentMode.value = 'static'
    emit('mode-change', 'static')
    throw err
  }
}

function stopScene() {
  activeToken++
  currentMode.value = 'static'
  emit('mode-change', 'static')
}

async function preloadScene(name) {
  try { await loadSceneData(name) } catch { /* silent */ }
}
function preloadAll() {
  Object.keys(props.scenes || {}).forEach(preloadScene)
}

function getCurrentScene() {
  return currentMode.value === 'lottie' ? currentSceneName.value : null
}

// ── Прокси API ────────────────────────────────────────────
function proxyToMascot(method) {
  return (...args) => mascotRef.value?.[method]?.(...args)
}
function showBubble(text) { bubbleRef.value?.showBubble(text) }
function hideBubble() { bubbleRef.value?.hideBubble() }

onBeforeUnmount(() => {
  activeToken++
  sceneCache.clear()
})

defineExpose({
  playScene,
  stopScene,
  preloadScene,
  preloadAll,
  getCurrentScene,
  setLoop,
  lottieLoopRef,
  mascotRef,
  bubbleRef,
  lottiePlayerRef,
  showBubble,
  hideBubble,
  blink: proxyToMascot('blink'),
  wink: proxyToMascot('wink'),
  setEmotion: proxyToMascot('setEmotion'),
  showArrows: proxyToMascot('showArrows'),
  hideArrows: proxyToMascot('hideArrows'),
  showCheck: proxyToMascot('showCheck'),
  hideCheck: proxyToMascot('hideCheck'),
  setEffect: proxyToMascot('setEffect'),
})
</script>

<style scoped>
.maskot-anim {
  --maskot-size: 100%;
  position: relative;
  display: block;
  width: var(--maskot-size);
  max-width: 100%;
  aspect-ratio: 1 / 1;
}
.maskot-anim.is-fixed {
  position: fixed;
  pointer-events: none;
}

/* ── Слои: оба абсолютные, видимость = opacity + visibility ── */
.maskot-anim__layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* visible → hidden: fade 150мс, затем visibility через задержку */
  transition: opacity 0.15s ease, visibility 0s linear 0s;
  visibility: visible;
  opacity: 1;
}
.maskot-anim__layer.is-hidden {
  transition: opacity 0.15s ease, visibility 0s linear 0.15s;
  visibility: hidden;
  opacity: 0;
}

.maskot-anim__lottie-player {
  width: 100% !important;
  height: 100% !important;
}

@media (prefers-reduced-motion: reduce) {
  .maskot-anim__layer,
  .maskot-anim__layer.is-hidden {
    transition: none;
  }
}
</style>