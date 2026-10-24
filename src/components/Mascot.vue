<template>
  <div
    class="maskot"
    :class="{ 'is-fixed': fixed }"
    :style="containerStyle"
  >
    <!-- ── Слой 1: фон (520×520) ── -->
    <img
      v-if="backgroundSrc"
      :src="backgroundSrc"
      class="maskot__bg"
      alt=""
      draggable="false"
      aria-hidden="true"
    />

    <!-- ── Слой 2: тело (390×390) ── -->
    <img
      v-if="bodySrc"
      :src="bodySrc"
      class="maskot__body"
      alt=""
      draggable="false"
      aria-hidden="true"
    />

    <!-- ── Слой 3: лицо (SVG 520×520 viewBox) ── -->
    <svg
      v-if="!hideFace"
      ref="faceEl"
      class="maskot__face"
      :class="faceClasses"
      viewBox="0 0 520 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      @click="onFaceClick"
      aria-hidden="true"
    >
      <!-- ГЛАЗА: открытые -->
      <template v-if="activeEmotion !== 'laughing'">
        <g class="eye eye-left">
          <path d="M229.287 270.075C227.635 269.641 224.796 268.446 223.426 266.39" stroke="#512B35" stroke-width="1.90244" stroke-linecap="round"/>
          <path d="M225.024 272.622C223.333 272.375 220.379 271.503 218.788 269.612" stroke="#512B35" stroke-width="1.90244" stroke-linecap="round"/>
          <path d="M222.267 276.623C220.559 276.588 217.519 276.09 215.705 274.412" stroke="#512B35" stroke-width="1.90244" stroke-linecap="round"/>
          <circle cx="231.297" cy="281.071" r="13.7715" fill="white"/>
          <circle cx="231.296" cy="281.072" r="11.5205" fill="#240007"/>
          <ellipse cx="228.288" cy="276.669" rx="3.55825" ry="2.66886" fill="white"/>
          <path d="M238.278 290.237C236.341 291.715 233.921 292.592 231.297 292.592C228.672 292.592 226.253 291.715 224.316 290.237C225.812 288.629 228.38 287.569 231.297 287.569C234.214 287.569 236.782 288.629 238.278 290.237Z" fill="#512B35"/>
          <circle cx="225.289" cy="284.754" r="1.42683" fill="#512B35"/>
        </g>
        <g class="eye eye-right">
          <path d="M290.715 270.075C292.368 269.641 295.206 268.446 296.577 266.39" stroke="#512B35" stroke-width="1.90244" stroke-linecap="round"/>
          <path d="M294.978 272.622C296.668 272.375 299.623 271.503 301.213 269.612" stroke="#512B35" stroke-width="1.90244" stroke-linecap="round"/>
          <path d="M297.735 276.623C299.443 276.588 302.483 276.09 304.297 274.412" stroke="#512B35" stroke-width="1.90244" stroke-linecap="round"/>
          <circle cx="288.704" cy="281.071" r="13.7715" fill="white"/>
          <circle cx="288.704" cy="281.072" r="11.5205" fill="#240007"/>
          <ellipse cx="285.696" cy="276.668" rx="3.55825" ry="2.66886" fill="white"/>
          <path d="M295.684 290.237C293.747 291.714 291.328 292.592 288.703 292.592C286.079 292.592 283.659 291.714 281.722 290.237C283.218 288.629 285.786 287.568 288.703 287.568C291.62 287.568 294.189 288.629 295.684 290.237Z" fill="#512B35"/>
          <circle cx="282.695" cy="284.752" r="1.42683" fill="#512B35"/>
        </g>
      </template>
      <!-- ГЛАЗА: закрытые -->
      <template v-else>
        <path class="eye eye-left" d="M215.101 277.103C218.929 288.402 235.483 288.442 238.975 277.103" stroke-width="4.45725" stroke-linecap="round" stroke="#1B0303" />
        <path class="eye eye-right" d="M279.391 277.103C283.219 288.402 299.773 288.442 303.265 277.103" stroke-width="4.45725" stroke-linecap="round" stroke="#1B0303" />
      </template>
      <!-- ЩЕКИ -->
      <g class="cheek cheek-left">
        <circle cx="214.727" cy="298.405" r="7.55402" fill="#FF98B3"/>
        <ellipse cx="212.225" cy="294.224" rx="3.07162" ry="1.61292" transform="rotate(-33.4755 212.225 294.224)" fill="#FFC3D5"/>
      </g>
      <g class="cheek cheek-right">
        <circle cx="305.275" cy="298.405" r="7.55402" fill="#FF98B3"/>
        <ellipse cx="302.774" cy="294.224" rx="3.07162" ry="1.61292" transform="rotate(-33.4755 302.774 294.224)" fill="#FFC3D5"/>
      </g>
      <!-- РОТ -->
      <path class="mouth" d="M250.233 286.697C253.365 297.541 266.91 297.58 269.768 286.697" stroke="#EA7E9A" stroke-width="3.80488" stroke-linecap="round" />
      <ellipse class="mouth-o" cx="260" cy="292" rx="6" ry="8.5" fill="none" stroke="#EA7E9A" stroke-width="3.80488" />
    </svg>

    <!-- ── Слой 3.5: Эффекты (Звезды, Снег, Дождь, Туман, Ветер) ── -->
    <div v-if="internalEffect !== 'none'" class="maskot__particles" aria-hidden="true">
      
      <!-- ЗВЕЗДЫ -->
      <svg v-if="internalEffect.includes('stars')" viewBox="0 0 520 520" fill="none" class="stars-svg" :class="`is-${internalEffect}`">
        <path class="star s1" d="M171.318 120.44L167.542 135.718L182.259 141.292L166.981 137.516L161.406 152.233L165.183 136.955L150.466 131.381L165.743 135.157L171.318 120.44Z" fill="#FFEB45"/>
        <path class="star s2" d="M399.708 134.466L397.032 147.147L409.303 151.319L396.622 148.643L392.45 160.914L395.126 148.233L382.855 144.061L395.536 146.737L399.708 134.466Z" fill="#FEFBE2"/>
        <path class="star s3" d="M429.321 201.857L426.646 214.538L438.916 218.71L426.235 216.034L422.063 228.304L424.739 215.623L412.469 211.451L425.15 214.127L429.321 201.857Z" fill="#FFEB45"/>
        <path class="star s4" d="M103.284 341.027L124.682 370.575L156.575 352.86L127.027 374.259L144.741 406.151L123.343 376.604L91.4503 394.318L120.998 372.92L103.284 341.027Z" fill="#FEFBE2"/>
        <path class="star s5" d="M108.528 255.871L110.211 283.936L138.276 285.619L110.211 287.302L108.528 315.367L106.846 287.302L78.7803 285.619L106.846 283.936L108.528 255.871Z" fill="#FFF183"/>
        <path class="star s6" d="M174.582 45.8038L185 60.9995L203.422 61.2219L188.227 71.64L188.004 90.0627L177.586 74.867L159.163 74.6446L174.359 64.2265L174.582 45.8038Z" fill="#FFEB45"/>
        <path class="star s7" d="M422.818 366.734L419.604 392.396L438.744 409.79L413.082 406.576L395.688 425.717L398.901 400.054L379.761 382.66L405.424 385.874L422.818 366.734Z" fill="#FEFBE2"/>
      </svg>

      <!-- СНЕГ -->
      <div v-else-if="internalEffect === 'snow'" class="effect-snow">
        <div
          v-for="p in particles.snow"
          :key="p.id"
          class="snowflake"
          :style="{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size
          }"
        />
      </div>

      <!-- ДОЖДЬ -->
      <div v-else-if="internalEffect === 'rain'" class="effect-rain">
        <div
          v-for="p in particles.rain"
          :key="p.id"
          class="raindrop"
          :style="{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration
          }"
        />
      </div>

      <!-- ТУМАН -->
      <div v-else-if="internalEffect === 'fog'" class="effect-fog">
        <div class="fog-cloud f1" />
        <div class="fog-cloud f2" />
        <div class="fog-cloud f3" />
      </div>

      <!-- ВЕТЕР -->
      <div v-else-if="internalEffect === 'wind'" class="effect-wind">
        <div
          v-for="p in particles.wind"
          :key="p.id"
          class="wind-line"
          :style="{
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration
          }"
        />
      </div>
    </div>

    <!-- ── Слой 4: стрелки (летят вверх) ── -->
    <svg v-if="arrowsVisible" class="maskot__arrows" viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g class="arrow arrow-1">
        <path d="M128.53 182.416C129.267 181.815 130.354 181.858 131.041 182.545L139.484 190.988C140.217 191.721 140.217 192.909 139.484 193.641C138.752 194.374 137.564 194.374 136.831 193.641L131.536 188.346C131.511 191.876 131.513 196.04 131.528 199.754C131.538 202.478 131.554 204.953 131.567 206.747C131.573 207.644 131.579 208.371 131.583 208.873C131.586 209.124 131.588 209.319 131.589 209.451C131.59 209.518 131.59 209.568 131.59 209.602C131.59 209.619 131.591 209.632 131.591 209.64V209.653C131.6 210.689 130.768 211.537 129.732 211.547C128.696 211.556 127.848 210.724 127.838 209.688V209.637C127.838 209.602 127.837 209.552 127.836 209.485C127.835 209.353 127.834 209.156 127.832 208.905C127.827 208.401 127.821 207.673 127.814 206.774C127.801 204.977 127.785 202.498 127.775 199.769C127.761 196.107 127.759 191.984 127.783 188.455L122.598 193.641C121.865 194.374 120.677 194.374 119.945 193.641C119.212 192.909 119.212 191.721 119.945 190.988L128.388 182.545L128.53 182.416Z" fill="#097802"/>
      </g>
      <g class="arrow arrow-2">
        <path d="M391.518 283.436C392.255 282.835 393.342 282.878 394.029 283.565L402.473 292.009C403.205 292.741 403.205 293.929 402.473 294.662C401.74 295.395 400.552 295.395 399.819 294.662L394.524 289.367C394.499 292.896 394.502 297.061 394.516 300.774C394.526 303.498 394.542 305.973 394.555 307.768C394.562 308.665 394.567 309.392 394.572 309.894C394.574 310.145 394.576 310.34 394.577 310.472C394.578 310.538 394.578 310.588 394.578 310.622C394.578 310.639 394.579 310.652 394.579 310.661V310.674C394.589 311.71 393.756 312.558 392.72 312.567C391.684 312.577 390.836 311.744 390.826 310.708V310.657C390.826 310.623 390.825 310.572 390.825 310.506C390.823 310.373 390.822 310.177 390.82 309.925C390.816 309.421 390.809 308.693 390.803 307.795C390.79 305.998 390.774 303.518 390.763 300.789C390.749 297.127 390.747 293.004 390.771 289.476L385.586 294.662C384.853 295.395 383.666 295.395 382.933 294.662C382.2 293.929 382.2 292.741 382.933 292.009L391.376 283.565L391.518 283.436Z" fill="#097802"/>
      </g>
      <g class="arrow arrow-3">
        <path d="M176.842 140.573C177.392 140.125 178.202 140.156 178.714 140.668L185.008 146.963C185.554 147.509 185.554 148.395 185.008 148.941C184.462 149.487 183.576 149.487 183.03 148.941L179.082 144.993C179.064 147.624 179.066 150.729 179.077 153.497C179.085 155.527 179.096 157.372 179.106 158.71C179.111 159.378 179.115 159.92 179.118 160.295C179.12 160.482 179.121 160.628 179.122 160.726C179.122 160.775 179.122 160.813 179.123 160.838C179.123 160.851 179.124 160.86 179.124 160.866V160.877C179.131 161.649 178.51 162.281 177.737 162.288C177.013 162.295 176.413 161.75 176.335 161.045L176.326 160.902V160.864C176.325 160.838 176.325 160.8 176.325 160.751C176.324 160.652 176.323 160.506 176.321 160.319C176.318 159.943 176.313 159.401 176.308 158.731C176.298 157.391 176.287 155.542 176.279 153.508C176.268 150.779 176.267 147.706 176.284 145.076L172.42 148.941C171.874 149.487 170.987 149.487 170.441 148.941C169.895 148.395 169.895 147.509 170.441 146.963L176.736 140.668L176.842 140.573Z" fill="#097802"/>
      </g>
    </svg>

    <!-- ── Слой 5: галочка «Успех» ── -->
    <svg v-if="checkVisible" class="maskot__check" viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g class="check-group">
        <circle cx="357.029" cy="201.657" r="32.6984" transform="rotate(-9.55958 357.029 201.657)" fill="#015F01"/>
        <path d="M354.854 168.206C372.127 168.206 386.129 182.209 386.129 199.481C386.129 216.754 372.127 230.757 354.854 230.757C337.581 230.757 323.579 216.754 323.579 199.481C323.579 182.209 337.581 168.206 354.854 168.206Z" fill="#D3FF4F"/>
        <path d="M354.854 168.206C372.127 168.206 386.129 182.209 386.129 199.481C386.129 216.754 372.127 230.757 354.854 230.757C337.581 230.757 323.579 216.754 323.579 199.481C323.579 182.209 337.581 168.206 354.854 168.206Z" stroke="#015F01" stroke-width="2.45"/>
        <path d="M370.202 188.647L350.341 208.509L341.313 199.481" stroke-width="6.77083" stroke-linecap="round" stroke-linejoin="round" stroke="#015F01"/>
        <use xlink:href="#stroke0_362_22311" fill="#D3FF4F"/>
        <mask id="stroke1_362_22311" maskUnits="userSpaceOnUse" x="294.026" y="137.935" width="123.284" height="123.284" fill="black">
        <rect fill="white" x="294.026" y="137.935" width="123.284" height="123.284"/>
        <use xlink:href="#stroke0_362_22311"/>
        </mask>
        <path d="M405.857 191.31C410.506 218.912 391.898 245.057 364.296 249.706C336.693 254.354 310.549 235.746 305.9 208.144C301.251 180.541 319.859 154.397 347.462 149.748C375.064 145.099 401.209 163.707 405.857 191.31ZM313.397 206.881C317.348 230.343 339.571 246.16 363.033 242.209C386.495 238.257 402.312 216.034 398.361 192.572C394.409 169.11 372.186 153.294 348.724 157.245C325.262 161.196 309.445 183.419 313.397 206.881Z" stroke-width="4.90477" stroke="#097802" mask="url(#stroke1_362_22311)"/>
        <defs>
        <path id="stroke0_362_22311" d="M405.857 191.31C410.506 218.912 391.898 245.057 364.296 249.706C336.693 254.354 310.549 235.746 305.9 208.144C301.251 180.541 319.859 154.397 347.462 149.748C375.064 145.099 401.209 163.707 405.857 191.31ZM313.397 206.881C317.348 230.343 339.571 246.16 363.033 242.209C386.495 238.257 402.312 216.034 398.361 192.572C394.409 169.11 372.186 153.294 348.724 157.245C325.262 161.196 309.445 183.419 313.397 206.881Z"/>
        </defs>
      </g>
    </svg>

    <!-- ── Слой 6: кастомные эмодзи-эффекты ── -->
    <div v-if="effects && effects.length" class="maskot__effects" aria-hidden="true">
      <span v-for="(fx, i) in effects" :key="fx.id || i" class="maskot__effect" :class="`is-${fx.type || 'default'}`" :style="fx.style || {}">{{ fx.emoji || '✨' }}</span>
    </div>

    <!-- ── Слой 7: облако с текстом ── -->
    <transition name="bubble">
      <svg v-if="visible" class="maskot__bubble" viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M390.295 34.2441C315.984 34.2441 247.454 57.6159 250.379 98.7599C250.379 119.175 263.063 137.948 288.894 149.155C293.816 151.291 299.194 153.121 305.061 154.646C303.505 160.136 298.886 160.956 283.329 165.694C310.595 170.557 337.993 163.804 345.462 160.093C349.685 160.267 354.064 160.354 358.606 160.354C411.277 164.007 451.112 157.898 476.584 146.234C502.036 134.578 513.146 117.377 513.146 98.7599C513.146 75.853 490.738 53.2237 453.67 42.0348C435.69 36.6078 414.566 34.2441 390.295 34.2441Z" fill="#21271F" />
        <path d="M387.088 29.4417C312.777 29.4417 244.248 52.8135 247.173 93.9574C247.173 114.372 259.856 133.145 285.687 144.353C290.609 146.488 295.988 148.318 301.854 149.843C300.299 155.334 298.224 160.143 282.667 164.881C312.412 166.116 334.786 159.002 342.255 155.29C346.478 155.465 350.858 155.552 355.399 155.552C408.07 159.205 447.905 153.095 473.377 141.431C498.83 129.776 509.94 112.575 509.94 93.9574C509.94 71.0505 487.532 48.4212 450.463 37.2323C432.484 31.8053 411.359 29.4417 387.088 29.4417Z" fill="white" stroke-width="1.24" stroke-linecap="round" stroke-linejoin="round" stroke="#21271F" />
        <foreignObject x="260" y="45" width="235" height="100">
          <div xmlns="http://www.w3.org/1999/xhtml" class="maskot__bubble-text-wrap">
            <p class="maskot__bubble-text">
              {{ displayedText }}<span v-if="typing" class="maskot__caret" aria-hidden="true">|</span>
            </p>
          </div>
        </foreignObject>
      </svg>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, useAttrs } from 'vue'

const props = defineProps({
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

const emit = defineEmits(['click', 'bubble-complete'])
const attrs = useAttrs()

// ▼ Слушатель для управления из консоли ▼
function onGlobalSetEffect(e) {
  const targetId = e.detail?.targetId
  // Если targetId не указан — применяем ко всем маскотам на странице.
  // Если указан — только к тому, у которого совпадает id
  if (!targetId || targetId === attrs.id) {
    if (e.detail && e.detail.effect) {
      setEffect(e.detail.effect)
    }
  }
}

// ── Внутренний стейт для эффекта ──
const internalEffect = ref(props.effect)

watch(() => props.effect, (v) => {
  internalEffect.value = v
})

// ── Контейнер ────────────────────────────────────────────────
const containerStyle = computed(() => {
  const style = {}
  if (props.size !== '' && props.size !== null && props.size !== undefined) {
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

// ── Генератор частиц (выполняется 1 раз) ────────────────────
const particles = {
  snow: Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + '%',
    delay: (Math.random() * 5).toFixed(2) + 's',
    duration: (4 + Math.random() * 4).toFixed(2) + 's',
    size: (4 + Math.random() * 8).toFixed(0) + 'px'
  })),
  rain: Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + '%',
    delay: (Math.random() * 2).toFixed(2) + 's',
    duration: (0.6 + Math.random() * 0.4).toFixed(2) + 's'
  })),
  wind: Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    top: Math.random() * 100 + '%',
    delay: (Math.random() * 4).toFixed(2) + 's',
    duration: (2 + Math.random() * 3).toFixed(2) + 's'
  }))
}

// ── Стрелки и галочка ────────────────────────────────────────
const arrowsVisible = ref(props.arrows)
const checkVisible = ref(props.check)

watch(() => props.arrows, (v) => { arrowsVisible.value = !!v })
watch(() => props.check, (v) => { checkVisible.value = !!v })

function showArrows() { arrowsVisible.value = true }
function hideArrows() { arrowsVisible.value = false }
function showCheck() { checkVisible.value = true }
function hideCheck() { checkVisible.value = false }

// ── Face ref и эмоции ────────────────────────────────────────
const faceEl = ref(null)
const blinkActive = ref(false)
const winkActive = ref(false)
const internalEmotion = ref('')

const activeEmotion = computed(() => props.emotion || internalEmotion.value)

const faceClasses = computed(() => ({
  blink: blinkActive.value,
  wink: winkActive.value,
  happy: activeEmotion.value === 'happy',
  sad: activeEmotion.value === 'sad',
  surprised: activeEmotion.value === 'surprised',
  blush: activeEmotion.value === 'blush',
  laughing: activeEmotion.value === 'laughing', 
}))

async function blink() {
  if (winkActive.value || activeEmotion.value === 'laughing' || props.hideFace) return
  blinkActive.value = false
  await nextTick()
  blinkActive.value = true
  setTimeout(() => { blinkActive.value = false }, 220)
}

async function wink() {
  if (activeEmotion.value === 'laughing' || props.hideFace) return
  winkActive.value = false
  await nextTick()
  winkActive.value = true
  setTimeout(() => { winkActive.value = false }, 720)
}

function setEmotion(name) {
  internalEmotion.value = name || ''
}

function onFaceClick(e) {
  emit('click', e)
  if (props.winkOnClick) wink()
}

/* ---------- Автоматическое моргание ---------- */
let blinkTimer = null

function scheduleBlink() {
  if (!props.autoBlink || props.hideFace) return
  const delay = 2200 + Math.random() * 3800
  blinkTimer = setTimeout(() => {
    if (!winkActive.value && activeEmotion.value !== 'surprised' && activeEmotion.value !== 'laughing') blink()
    scheduleBlink()
  }, delay)
}

/* ---------- Typewriter для облака ---------- */
const visible = ref(false)
const displayedText = ref('')
const typing = ref(false)
let typingTimer = null

function stopTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
  typing.value = false
}

function startTyping(text) {
  stopTyping()
  displayedText.value = ''

  if (!text) {
    visible.value = false
    emit('bubble-complete')
    return
  }

  visible.value = true
  typing.value = true
  let i = 0

  const step = () => {
    if (i < text.length) {
      displayedText.value += text[i]
      i++
      typingTimer = setTimeout(step, props.typewriterSpeed)
    } else {
      typing.value = false
      typingTimer = null
      emit('bubble-complete')
    }
  }

  step()
}

watch(
  () => props.bubbleText,
  (val) => { startTyping(val || '') },
  { immediate: true },
)

/* ---------- Lifecycle ---------- */
onMounted(() => {
  scheduleBlink()
  window.addEventListener('maskot:set-effect', onGlobalSetEffect)
})

onBeforeUnmount(() => {
  if (blinkTimer) clearTimeout(blinkTimer)
  stopTyping()
  window.removeEventListener('maskot:set-effect', onGlobalSetEffect)
})

/* ---------- Публичный API ---------- */
function showBubble(text) {
  startTyping(String(text || ''))
}
function hideBubble() {
  stopTyping()
  displayedText.value = ''
  visible.value = false
}

function setEffect(effectName) {
  internalEffect.value = effectName
}

defineExpose({
  blink,
  wink,
  setEmotion,
  showBubble,
  hideBubble,
  showArrows,
  hideArrows,
  showCheck,
  hideCheck,
  faceEl,
  setEffect,
})
</script>

<style>
/* ─────────────────────────────────────────────────────────
   Стили не scoped: внутри SVG и для @keyframes.
   Все селекторы префиксованы `.maskot` — конфликтов нет.
   ───────────────────────────────────────────────────────── */

.maskot {
  --maskot-size: 100%;
  --maskot-body-size: 100%;
  --maskot-body-x: 50%;
  --maskot-body-y: 50%;
  position: relative;
  display: block;
  width: var(--maskot-size);
  max-width: 100%;
  aspect-ratio: 1 / 1;
  user-select: none;
}
.maskot.is-fixed { position: fixed; pointer-events: none; }
.maskot.is-fixed .maskot__face,
.maskot.is-fixed .maskot__bubble,
.maskot.is-fixed .maskot__effects { pointer-events: auto; }

.maskot__bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; display: block; z-index: 1; }
.maskot__body { position: absolute; top: var(--maskot-body-y); left: var(--maskot-body-x); width: var(--maskot-body-size); height: var(--maskot-body-size); transform: translate(-50%, -50%); object-fit: contain; pointer-events: none; display: block; z-index: 2; }
.maskot__face { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 3; cursor: pointer; -webkit-tap-highlight-color: transparent; overflow: visible; }

.maskot__face .eye,
.maskot__face .cheek,
.maskot__face .mouth,
.maskot__face .mouth-o {
  transform-box: fill-box; transform-origin: center;
  transition: transform 0.32s cubic-bezier(.34, 1.56, .64, 1), opacity 0.28s ease;
}
.maskot__face .mouth-o { opacity: 0; transform: scale(0.6); }
@keyframes maskotBlink { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.06); } }
.maskot__face.blink .eye { animation: maskotBlink 0.2s ease-in-out; }
@keyframes maskotWink { 0%, 100% { transform: scaleY(1); } 22%, 72% { transform: scaleY(0.06); } }
.maskot__face.wink .eye-right { animation: maskotWink 0.7s ease-in-out; }
.maskot__face.happy .mouth { transform: scaleY(1.35) translateY(1px); }
.maskot__face.happy .eye   { transform: scaleY(0.93); }
.maskot__face.happy .cheek { transform: scale(1.18); }
.maskot__face.sad .mouth { transform: scaleY(-1) translateY(2px) scaleX(0.92); }
.maskot__face.sad .eye   { transform: translateY(1.5px) scaleY(0.88); }
.maskot__face.sad .cheek { opacity: 0.28; transform: scale(0.9); }
.maskot__face.surprised .mouth   { opacity: 0; }
.maskot__face.surprised .mouth-o { opacity: 1; transform: scale(1); }
.maskot__face.surprised .eye     { transform: scale(1.13); }
.maskot__face.surprised .cheek   { opacity: 0.65; transform: scale(0.88); }
@keyframes maskotBlush { 0%, 100% { transform: scale(1.05); opacity: 0.85; } 50% { transform: scale(1.30); opacity: 1; } }
.maskot__face.blush .cheek { animation: maskotBlush 1.6s ease-in-out infinite; }

/* ═══════════════════════════════════════════════════════
   Слой 3.5: Эффекты (Звезды, Снег, Дождь, Туман, Ветер)
   ═══════════════════════════════════════════════════════ */

.maskot__particles {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  overflow: hidden;
}

/* --- ЗВЕЗДЫ --- */
.stars-svg { width: 100%; height: 100%; overflow: visible; }
.star { transform-box: fill-box; transform-origin: center; will-change: transform, opacity; }

.s1, .s3, .s6 { filter: drop-shadow(0 0 6px rgba(255, 235, 69, 0.8)); }
.s2, .s4, .s7 { filter: drop-shadow(0 0 8px rgba(254, 251, 226, 0.9)); }
.s5 { filter: drop-shadow(0 0 5px rgba(255, 241, 131, 0.8)); }

/* Обычные звезды (спокойные) */
.is-stars .s1 { animation: floatStar1 6s ease-in-out infinite alternate, twinkle 3s ease-in-out infinite; }
.is-stars .s2 { animation: floatStar2 7s ease-in-out infinite alternate, twinkle 4s ease-in-out infinite 1s; }
.is-stars .s3 { animation: floatStar3 5s ease-in-out infinite alternate, twinkle 2.5s ease-in-out infinite 0.5s; }
.is-stars .s4 { animation: floatStar1 8s ease-in-out infinite alternate, twinkle 5s ease-in-out infinite 2s; }
.is-stars .s5 { animation: floatStar2 6.5s ease-in-out infinite alternate, twinkle 3.5s ease-in-out infinite 1.5s; }
.is-stars .s6 { animation: floatStar3 7.5s ease-in-out infinite alternate, twinkle 4.5s ease-in-out infinite 0.8s; }
.is-stars .s7 { animation: floatStar1 9s ease-in-out infinite alternate, twinkle 4s ease-in-out infinite 2.5s; }

/* Быстрые звезды (праздник, динамика) */
.is-stars-fast .s1, .is-stars-fast .s2, .is-stars-fast .s3,
.is-stars-fast .s4, .is-stars-fast .s5, .is-stars-fast .s6, .is-stars-fast .s7 {
  animation-duration: 2s, 1s;
  filter: drop-shadow(0 0 12px rgba(255, 255, 255, 1));
}
.is-stars-fast .s1 { animation-name: floatStarFast, twinkle; }
.is-stars-fast .s2 { animation-name: floatStarFast, twinkle; animation-delay: 0.2s, 0.5s; }
.is-stars-fast .s3 { animation-name: floatStarFast, twinkle; animation-delay: 0.4s, 0.1s; }
.is-stars-fast .s4 { animation-name: floatStarFast, twinkle; animation-delay: 0.1s, 0.7s; }
.is-stars-fast .s5 { animation-name: floatStarFast, twinkle; animation-delay: 0.5s, 0.3s; }
.is-stars-fast .s6 { animation-name: floatStarFast, twinkle; animation-delay: 0.3s, 0.9s; }
.is-stars-fast .s7 { animation-name: floatStarFast, twinkle; animation-delay: 0.6s, 0.4s; }

@keyframes floatStar1 { 0% { transform: translate(0, 0) scale(1) rotate(0deg); } 100% { transform: translate(-10px, -15px) scale(1.1) rotate(15deg); } }
@keyframes floatStar2 { 0% { transform: translate(0, 0) scale(1) rotate(0deg); } 100% { transform: translate(12px, -10px) scale(0.9) rotate(-15deg); } }
@keyframes floatStar3 { 0% { transform: translate(0, 0) scale(1) rotate(0deg); } 100% { transform: translate(-8px, 12px) scale(1.05) rotate(10deg); } }
@keyframes floatStarFast { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 50% { transform: translate(5px, -5px) scale(1.3); } 100% { transform: translate(0, 0) scale(1); } }
@keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }

/* --- СНЕГ --- */
.effect-snow { position: absolute; inset: 0; }
.snowflake {
  position: absolute; top: -10px; background: #fff; border-radius: 50%;
  box-shadow: 0 0 4px rgba(255,255,255,0.8);
  animation-name: fallSnow; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes fallSnow {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(550px) translateX(20px); opacity: 0; }
}

/* --- ДОЖДЬ --- */
.effect-rain { position: absolute; inset: 0; }
.raindrop {
  position: absolute; top: -20px; width: 1px; height: 15px;
  background: linear-gradient(to bottom, transparent, rgba(173, 216, 230, 0.8));
  animation-name: fallRain; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes fallRain {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(550px) translateX(-30px); opacity: 0.4; }
}

/* --- ТУМАН --- */
.effect-fog { position: absolute; inset: 0; overflow: hidden; }
.fog-cloud {
  position: absolute; width: 150%; height: 150%;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);
  filter: blur(20px); border-radius: 50%;
  animation: driftFog 15s ease-in-out infinite alternate;
}
.f1 { top: -20%; left: -20%; }
.f2 { bottom: -20%; right: -20%; animation-duration: 20s; animation-delay: -5s; }
.f3 { top: 20%; left: 30%; width: 100%; height: 100%; animation-duration: 25s; animation-delay: -10s; }
@keyframes driftFog {
  0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  50% { transform: translate(40px, -20px) scale(1.1); opacity: 0.8; }
  100% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.5; }
}

/* --- ВЕТЕР --- */
.effect-wind { position: absolute; inset: 0; }
.wind-line {
  position: absolute; left: -50px; width: 50px; height: 2px;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.6));
  border-radius: 2px;
  animation-name: blowWind; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
}
@keyframes blowWind {
  0% { transform: translateX(0); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateX(550px); opacity: 0; }
}

/* ═══════════════════════════════════════════════════════
   Слой 4: стрелки и галочка
   ═══════════════════════════════════════════════════════ */
.maskot__arrows { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; overflow: visible; }
.maskot__arrows .arrow { transform-box: fill-box; transform-origin: center; will-change: transform, opacity; animation: maskotArrowFlyUp 1.8s ease-out infinite; }
.maskot__arrows .arrow-1 { animation-delay: 0s; }
.maskot__arrows .arrow-2 { animation-delay: 0.55s; }
.maskot__arrows .arrow-3 { animation-delay: 1.1s; }
@keyframes maskotArrowFlyUp { 0% { transform: translateY(8px); opacity: 0; } 25% { opacity: 1; } 70% { transform: translateY(-18px); opacity: 1; } 100% { transform: translateY(-32px); opacity: 0; } }

.maskot__check { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; overflow: visible; }
.maskot__check .check-group { transform-box: fill-box; transform-origin: center; animation: maskotCheckAppear 0.65s cubic-bezier(.34, 1.56, .64, 1) both; will-change: transform, opacity; }
@keyframes maskotCheckAppear { 0% { transform: scale(0.35) rotate(-12deg); opacity: 0; } 60% { transform: scale(1.1) rotate(3deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }

.maskot__effects { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.maskot__effect {
  position: absolute; font-size: 24px; line-height: 1; user-select: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, .15));
  animation: maskotEffectFloat 2.6s ease-in-out infinite;
  will-change: transform, opacity;
}
.maskot__effect.is-sparkle { animation-name: maskotEffectPulse; animation-duration: 1.8s; }
.maskot__effect.is-heart   { animation-name: maskotEffectFloat; animation-duration: 2.6s; }
.maskot__effect.is-arrow   { animation-name: maskotEffectArrow; animation-duration: 2s; }
.maskot__effect.is-star    { animation-name: maskotEffectTwinkle; animation-duration: 2.2s; }
@keyframes maskotEffectFloat { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.85; } 50% { transform: translateY(-8px) scale(1.06); opacity: 1; } }
@keyframes maskotEffectPulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.25); opacity: 1; } }
@keyframes maskotEffectArrow { 0%, 100% { transform: translateX(0); opacity: 0.9; } 50% { transform: translateX(6px); opacity: 1; } }
@keyframes maskotEffectTwinkle { 0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; } 50% { transform: scale(1.15) rotate(8deg); opacity: 1; } }

/* ═══════════════════════════════════════════════════════
   Слой 5: облако
   ═══════════════════════════════════════════════════════ */
.maskot__bubble { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 10; pointer-events: none; filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.08)); }
.maskot__bubble-text-wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: auto; padding: 4px 10px; box-sizing: border-box; }
.maskot__bubble-text { margin: 0; font-family: var(--font-family, sans-serif); font-size: 16px; line-height: 1.3; letter-spacing: -0.01em; color: #21271f; font-weight: 500; word-break: break-word; white-space: pre-wrap; }
.maskot__caret { display: inline-block; margin-left: 1px; color: #015f01; animation: maskotCaret 0.8s steps(2) infinite; }
@keyframes maskotCaret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

.bubble-enter-active, .bubble-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.bubble-enter-from, .bubble-leave-to { opacity: 0; transform: translateY(6px) scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .maskot__face .eye, .maskot__face .cheek, .maskot__face .mouth, .maskot__face .mouth-o { transition: none; }
  .maskot__face.blush .cheek { animation: none; }
  .maskot__face.blink .eye, .maskot__face.wink .eye-right { animation-duration: 0.01ms; }
  .maskot__effect, .maskot__caret, .maskot__arrows .arrow, .star, .snowflake, .raindrop, .fog-cloud, .wind-line { animation: none; opacity: 0.8; }
  .maskot__check .check-group { animation-duration: 0.01ms; }
}
</style>