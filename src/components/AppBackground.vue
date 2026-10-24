<template>
  <div class="app-background" aria-hidden="true">
    <transition name="bg-fade">
      <div
        v-if="current"
        :key="current.key"
        class="bg-layer"
        :style="styleFor(current)"
      />
    </transition>
    <!-- <div
      v-if="current?.overlay"
      class="bg-overlay"
      :style="{ background: current.overlay }"
    /> -->
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppBackground } from '../modules/core/composables/useAppBackground'

/**
 * Фон приложения.
 *
 * Больше не читает route.meta.bg — источник истины один:
 *   • если у компонента заданы пропсы url/background — используются они;
 *   • иначе — override из useAppBackground (устанавливает активный экран);
 *   • если override нет — useAppBackground.resolved сам вернёт
 *     backgrounds/bg_default.jpg.
 *
 * Пропсы нужны для случаев, когда фон задаётся прямо в разметке
 * (например, <AppBackground url="..." /> в конкретном экране).
 */

const props = defineProps({
  url: { type: String, default: '' },
  background: { type: String, default: '' },
  overlay: { type: String, default: '' },
  position: { type: String, default: 'center' },
  size: { type: String, default: 'cover' },
  blur: { type: [Number, String], default: 0 },
})

const { override, resolved, DEFAULT_BACKGROUND } = useAppBackground()

const current = computed(() => {
  // 1. Явный фон из пропсов — приоритетнее всего
  if (props.url || props.background) {
    return {
      key: `props-${props.url || props.background}`,
      url: props.url,
      background: props.background,
      overlay: props.overlay,
      position: props.position,
      size: props.size,
      blur: props.blur,
    }
  }

  // 2. Override, установленный активным экраном
  if (override.value) {
    const o = override.value
    return {
      key: `override-${o.url || o.background || ''}`,
      position: props.position,
      size: props.size,
      blur: props.blur,
      ...o,
    }
  }

  // 3. resolved — это либо override, либо дефолт из useAppBackground.
  //    Здесь override уже отфильтрован выше, значит остался только дефолт.
  const r = resolved.value
  if (!r) return null
  return {
    key: `default-${r.url || r.background || DEFAULT_BACKGROUND}`,
    position: props.position,
    size: props.size,
    blur: props.blur,
    ...r,
  }
})

function styleFor(b) {
  // Чистая заливка/градиент без картинки
  if (!b.url) {
    return { background: b.background || 'transparent' }
  }
  // Картинка (+опционально background-подложка снизу)
  return {
    backgroundImage: `url("${b.url}")`,
    // backgroundPosition: b.position || 'center',
    // backgroundSize: b.size || 'cover',
    // backgroundRepeat: 'no-repeat',
    backgroundColor: b.background || 'transparent',
    // filter: b.blur ? `blur(${b.blur}px)` : 'none',
  }
}
</script>

<style scoped>
.app-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.bg-layer {
  position: absolute;
  inset: -12px; /* компенсируем blur по краям */
  background-repeat: no-repeat;
  background-position: top center;
  background-size: cover;
  transition: opacity var(--t-slow);
}

.bg-overlay {
  position: absolute;
  inset: 0;
}

.bg-fade-enter-active,
.bg-fade-leave-active { transition: opacity var(--t-slow); }
.bg-fade-enter-from,
.bg-fade-leave-to { opacity: 0; }
</style>