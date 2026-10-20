<template>
  <transition name="fade" appear>
    <section v-if="store.hasToday" class="today-widget" :class="`is-${state}`">
      <header class="tw-head">
        <h2 class="tw-title">{{ today.title }}</h2>
        <span v-if="hasProgress" class="tw-counter">
          {{ progressDone }}/{{ progressTotal }}
        </span>
      </header>

      <p v-if="today.description" class="tw-desc">{{ today.description }}</p>

      <div v-if="hasProgress" class="tw-bar" role="progressbar"
           :aria-valuenow="progressDone" :aria-valuemin="0" :aria-valuemax="progressTotal">
        <div class="tw-bar-fill" :style="{ width: progressPercent + '%' }" />
      </div>

      <ul v-if="actionList.length" class="tw-list">
        <li
          v-for="a in actionList"
          :key="a.key"
          class="tw-item"
          :class="{ done: a.done, pending: a.status === 'pending' }"
        >
          <span class="tw-icon">{{ a.emoji }}</span>
          <span class="tw-label">{{ a.label }}</span>
          <span class="tw-state">{{ a.done ? '✓' : '' }}</span>
        </li>
      </ul>

      <button
        v-if="store.hasTodayButton"
        type="button"
        class="tw-btn"
        @click="onAction"
      >
        {{ today.buttonLabel }}
      </button>
    </section>
  </transition>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHomeStore } from './store'
import { useToast } from '../core/composables/useToast'

const store = useHomeStore()
const router = useRouter()
const toast = useToast()

const today = computed(() => store.today || {})
const state = computed(() => today.value.state || 'active')

const hasProgress   = computed(() => store.progressTotal > 0)
const progressDone  = computed(() => store.progressDone)
const progressTotal = computed(() => store.progressTotal)
const progressPercent = computed(() => store.progressPercent)

const actionList = computed(() => {
  const actions = today.value.actions || {}
  return Object.entries(actions)
    .filter(([, a]) => a?.exists)
    .map(([key, a]) => ({ key, ...a }))
})

function onAction() {
  const action = today.value.buttonAction
  if (!action || !action.url) return

  if (action.type === 'external') {
    try {
      window.open(action.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Не удалось открыть ссылку')
    }
    setTimeout(() => store.refreshToday().catch(() => {}), 3000)
    setTimeout(() => store.refreshToday().catch(() => {}), 30_000)
    return
  }

  router.push(action.url)
}

onMounted(() => {
  store.load()
  store.loadToday()
})
</script>

<style scoped>
.today-widget {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  margin-bottom: 20px;
  border-radius: 24px;
  background: linear-gradient(135deg, #D3FF4F 0%, #A8E85F 100%);
  border: 2px solid #015F01;
  box-shadow: 0 6px 20px rgba(1, 95, 1, .12);
  color: #21271F;
}

.today-widget.is-done {
  background: #EEF7E5;
  border-color: #AFE6DD;
  box-shadow: 0 4px 14px rgba(1, 95, 1, .06);
}

.tw-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.tw-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: #015F01;
}

.tw-counter {
  font-size: 14px;
  font-weight: 700;
  color: #015F01;
  font-variant-numeric: tabular-nums;
  background: rgba(255,255,255,.55);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.tw-desc {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.4;
  color: #21271F;
}
.today-widget.is-done .tw-desc { color: #2A3B2A; }

.tw-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.55);
  overflow: hidden;
}
.tw-bar-fill {
  height: 100%;
  background: #015F01;
  border-radius: 999px;
  transition: width 400ms cubic-bezier(.2,.7,.2,1);
}

.tw-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.tw-item {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(255,255,255,.45);
  color: #21271F;
}
.tw-item.done {
  background: rgba(255,255,255,.8);
  color: #015F01;
  font-weight: 600;
}
.tw-item.pending { opacity: .7; }

.tw-icon { font-size: 15px; line-height: 1; text-align: center; }
.tw-label { text-align: left; }
.tw-state { font-weight: 700; min-width: 14px; text-align: right; }

.tw-btn {
  align-self: flex-start;
  margin-top: 4px;
  padding: 12px 22px;
  border-radius: 999px;
  border: 2px solid #015F01;
  background: #FFFFFF;
  color: #015F01;
  font-family: var(--font-family);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 3px 0 0 #015F01;
  transition: transform var(--t-fast), box-shadow var(--t-fast), background var(--t-fast);
}
.tw-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 0 0 #015F01;
  background: #F3FBEE;
}
.tw-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 0 #015F01;
}
</style>