<template>
  <div class="toast-host">
    <transition-group name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="'toast--' + t.type">
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" aria-label="Закрыть" @click="dismiss(t.id)">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToast } from '../modules/core/composables/useToast'
const { toasts, dismiss } = useToast()
</script>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  /* bottom: calc(var(--nav-h) + 16px + env(safe-area-inset-bottom, 0)); */
  top: calc(var(--nav-h) + 16px + env(safe-area-inset-bottom, 0));
  transform: translateX(-50%);
  width: min(92%, 460px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 100;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 12px 16px;
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--text);
  border-left: 4px solid var(--accent);
  box-shadow: 0 6px 24px rgba(0,0,0,.12), 0 1px 3px rgba(0,0,0,.06);
  pointer-events: auto;
  font-size: 14px;
  line-height: 1.4;
}
.toast--success { border-left-color: #2e7d32; }
.toast--error   { border-left-color: var(--danger); }
.toast--warn    { border-left-color: #b58500; }
.toast--info    { border-left-color: var(--accent); }
.toast-msg { flex: 1; }
.toast-close {
  flex-shrink: 0;
  width: 26px; height: 26px; padding: 0;
  border-radius: 50%;
  background: transparent; color: var(--muted);
  font-size: 18px; line-height: 1;
  display: grid; place-items: center;
  box-shadow: none;
}
.toast-close:hover:not(:disabled) { background: #f3f3f3; color: var(--text); box-shadow: none; }
.toast-enter-active, .toast-leave-active { transition: opacity var(--t-base), transform var(--t-base); }
.toast-enter-from { opacity: 0; transform: translateY(10px); }
.toast-leave-to   { opacity: 0; transform: translateY(6px); }
</style>