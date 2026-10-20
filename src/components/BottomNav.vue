<template>
  <nav class="bottom-nav">

  <NavButton to="/home" label="Главная" :active="isActive({ match: ['/home'] })">
    <NavHome />
  </NavButton>

  <NavButton to="/training" label="Обучение" :active="isActive({ match: ['/training'] })">
    <NavTraining />
  </NavButton>

  <NavButton to="/dayTask" label="Задания" :active="isActive({ match: ['/dayTask'] })">
    <NavTasks />
  </NavButton>

  <NavButton to="/profile" label="Профиль" :active="isActive({ match: ['/profile'] })">
    <NavProfile />
  </NavButton>

  <NavButton to="/stats" label="Статистика" :active="isActive({ match: ['/stats'] })">
    <NavStats />
  </NavButton>

  </nav>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavButton from './nav/NavButton.vue'

import NavHome from './nav/icons/NavHome.vue'
import NavTraining from './nav/icons/NavTraining.vue'
import NavTasks from './nav/icons/NavTasks.vue'
import NavStats from './nav/icons/NavStats.vue'
import NavProfile from './nav/icons/NavProfile.vue'

import { useLecturesStore } from '../modules/lectures/store'
import { useThemeStore } from '../modules/theme/store'

const route = useRoute()
const lectures = useLecturesStore()
const theme = useThemeStore()

function isActive({ match }) {
  return match.some((p) => route.path === p || route.path.startsWith(p + '/'))
}

onMounted(() => {
  theme.load()
  lectures.initNetworkWatcher()
  if (theme.hasTheme && !lectures.loadedTheme) lectures.loadAll()
})
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 20px;
  margin: 0 18px;
  display: grid;
  /* gap: 21px; */
  background: #FFF;
  border-radius: 999px;
  padding: 6px 0;
  overflow: hidden;
  border: 2px solid var(--tabs-border, #21271f);
  box-shadow: 0 6px 0 -2px var(--tabs-shadow, #21271f);
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  justify-items: center;
  z-index: 50;
}


</style>