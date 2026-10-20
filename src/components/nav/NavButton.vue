<template>
  <router-link
    :to="to"
    class="nav-button"
    :class="{ active }"
    :aria-label="label"
  >
    <span class="nav-button__plate">
      <slot />
    </span>
  </router-link>
</template>

<script setup>
defineProps({
  to: { type: String, required: true },
  label: { type: String, required: true },
  active: { type: Boolean, default: false },
})
</script>

<style scoped>
.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--t-fast);
}
.nav-button:active { transform: scale(.96); }

.nav-button__plate {
  /* Цвет линий, обводки и текста внутри SVG */
  /* --nav-icon-color: #21271F; */
  /* Фон плашки */
  /* --nav-bg: #FFFFFF; */
  /* Цвет обводки */
  /* --nav-stroke: #21271F; */
  /* Тень */
  /* --nav-shadow: 0 2px 0 0 rgba(33, 39, 31, .35); */

  display: block;
  width: 48px;
  height: 48px;
  border-radius: 100%;
  /* filter: drop-shadow(0 2px 0 rgba(33, 39, 31, .25));
  transition:
    filter var(--t-base),
    transform var(--t-base);
  color: var(--nav-icon-color); */
}

.nav-button.active .nav-button__plate {
  background-color: #D3FF4F;
  /* --nav-icon-color: #0F5A05;
  --nav-bg: #EEFFDA;
  --nav-stroke: #0F5A05;
  filter: drop-shadow(0 3px 0 rgba(15, 90, 5, .35)); */
}

.nav-button__plate > :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>