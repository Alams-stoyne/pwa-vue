<template>
  <transition name="bubble">
    <svg
      v-if="visible"
      class="maskot__bubble"
      viewBox="0 0 520 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M390.295 34.2441C315.984 34.2441 247.454 57.6159 250.379 98.7599C250.379 119.175 263.063 137.948 288.894 149.155C293.816 151.291 299.194 153.121 305.061 154.646C303.505 160.136 298.886 160.956 283.329 165.694C310.595 170.557 337.993 163.804 345.462 160.093C349.685 160.267 354.064 160.354 358.606 160.354C411.277 164.007 451.112 157.898 476.584 146.234C502.036 134.578 513.146 117.377 513.146 98.7599C513.146 75.853 490.738 53.2237 453.67 42.0348C435.69 36.6078 414.566 34.2441 390.295 34.2441Z"
        fill="#21271F"
      />
      <path
        d="M387.088 29.4417C312.777 29.4417 244.248 52.8135 247.173 93.9574C247.173 114.372 259.856 133.145 285.687 144.353C290.609 146.488 295.988 148.318 301.854 149.843C300.299 155.334 298.224 160.143 282.667 164.881C312.412 166.116 334.786 159.002 342.255 155.29C346.478 155.465 350.858 155.552 355.399 155.552C408.07 159.205 447.905 153.095 473.377 141.431C498.83 129.776 509.94 112.575 509.94 93.9574C509.94 71.0505 487.532 48.4212 450.463 37.2323C432.484 31.8053 411.359 29.4417 387.088 29.4417Z"
        fill="white"
        stroke-width="1.24"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke="#21271F"
      />
      <foreignObject x="260" y="45" width="235" height="100">
        <div xmlns="http://www.w3.org/1999/xhtml" class="maskot__bubble-text-wrap">
          <p class="maskot__bubble-text">
            {{ displayedText }}<span v-if="typing" class="maskot__caret" aria-hidden="true">|</span>
          </p>
        </div>
      </foreignObject>
    </svg>
  </transition>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  speed: { type: Number, default: 35 },
})

const emit = defineEmits(['complete'])

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
    emit('complete')
    return
  }

  visible.value = true
  typing.value = true
  let i = 0

  const step = () => {
    if (i < text.length) {
      displayedText.value += text[i]
      i++
      typingTimer = setTimeout(step, props.speed)
    } else {
      typing.value = false
      typingTimer = null
      emit('complete')
    }
  }

  step()
}

watch(
  () => props.text,
  (val) => { startTyping(val || '') },
  { immediate: true },
)

function showBubble(text) {
  startTyping(String(text || ''))
}

function hideBubble() {
  stopTyping()
  displayedText.value = ''
  visible.value = false
}

onBeforeUnmount(stopTyping)

defineExpose({ showBubble, hideBubble })
</script>

<style>
/* Стили пузыря — как были в Mascot.vue, теперь самодостаточны */
.maskot__bubble {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.08));
}
.maskot__bubble-text-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: auto;
  padding: 4px 10px;
  box-sizing: border-box;
}
.maskot__bubble-text {
  margin: 0;
  font-family: var(--font-family, sans-serif);
  font-size: 16px;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: #21271f;
  font-weight: 500;
  word-break: break-word;
  white-space: pre-wrap;
}
.maskot__caret {
  display: inline-block;
  margin-left: 1px;
  color: #015f01;
  animation: maskotCaret 0.8s steps(2) infinite;
}
@keyframes maskotCaret {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .maskot__caret {
    animation: none;
    opacity: 0.8;
  }
}
</style>