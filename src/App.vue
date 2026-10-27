<template>
  <AppBackground />
  <BackButton v-if="showBack" />

  <AccessDenied v-if="uidMismatch" />

  <UidRecovery v-else-if="needsUidRecovery" />

  <AccessDenied v-else-if="!hasUid" />

  <InstallGate v-else-if="!isInstalled" />

  <!-- ▼ Блокировка администратором ▼ -->
  <BlockedView
    v-else-if="auth.blocked && !isSupportRoute"
    :message="auth.blockedMessage"
  />

  <div v-else class="app-shell" :class="{ 'has-nav': showNav }">
    <ConsentBanner v-if="showConsentBanner && !showBack" />

    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="$route.fullPath" />
      </transition>
    </router-view>

    <BottomNav v-if="showNav" />
  </div>

  <ToastHost />
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useInstall } from './modules/install/useInstall'
import { useAccess } from './modules/install/useAccess'
import { useModalRegistry } from './modules/core/composables/useModalRegistry'
import { useConsentStore } from './modules/consent/store'
import { useHabitsStore } from './modules/habits/store'
import InstallGate from './modules/install/InstallGate.vue'
import AccessDenied from './modules/install/AccessDenied.vue'
import UidRecovery from './modules/install/UidRecovery.vue'
import ConsentBanner from './modules/consent/ConsentBanner.vue'
import BottomNav from './components/BottomNav.vue'
import AppBackground from './components/AppBackground.vue'
import BackButton from './components/BackButton.vue'
import ToastHost from './components/ToastHost.vue'
import BlockedView from './modules/auth/BlockedView.vue'

import { useAuthStore } from './modules/auth/store'
import { useThemeStore } from './modules/theme/store'
import { useProfileStore } from './modules/profile/store'
import { useQuizStore } from './modules/quiz/store'
import { useStatsStore } from './modules/stats/store'

const { isInstalled } = useInstall()
const { hasUid, uidMismatch } = useAccess()
const { hasOpen: hasOpenModal } = useModalRegistry()
const consent = useConsentStore()

const auth = useAuthStore()
const theme = useThemeStore()
const profile = useProfileStore()
const quiz = useQuizStore()
const stats = useStatsStore()
const habits = useHabitsStore()

const route = useRoute()

const needsUidRecovery = computed(() =>
  isInstalled.value && !hasUid.value && !uidMismatch.value
)

const isSupportRoute = computed(() => route.path.startsWith('/support'))

const showConsentBanner = computed(() => {
  if (auth.blocked) return false
  if (!auth.isAuthed) return false
  if (consent.isGranted) return false
  if (!consent.isAnswered) return false
  if (route.path === '/onboarding/consent') return false
  return true
})

const onboarded = computed(() =>
  theme.hasTheme && !!habits.selectedHabitId
)

onMounted(() => {
  // Загрузка auth / theme / profile / quiz — идемпотентные чтения из LS.
  //
  // ВАЖНО: consent.loadStatus() НЕ вызываем — это делает main.js.
  // Согласие нельзя отозвать, состояние живёт в localStorage вечно.
  // Запрос нужен только при переустановке (isAnswered = false),
  // и main.js уже обрабатывает этот кейс единожды.
  auth.load()
  theme.load()
  profile.load()
  quiz.load()
})

watch(
  () => auth.isAuthed,
  (v) => { if (v) stats.init() },
  { immediate: true },
)

const chromeVisible = computed(() =>
  isInstalled.value && hasUid.value && !uidMismatch.value
)

const isChangeTheme = computed(() =>
  route.path === '/themes' && route.query.change === '1'
)

const showBack = computed(() => {
  if (auth.blocked) return false
  if (!chromeVisible.value) return false
  if (hasOpenModal.value) return true
  if (isChangeTheme.value) return true

  const metaBack = route.meta?.back
  if (typeof metaBack === 'function') return !!metaBack(route)
  return metaBack === true
})

const showNav = computed(() => {
  if (auth.blocked) return false
  if (!chromeVisible.value) return false
  if (!auth.isAuthed) return false
  if (!consent.isAnswered) return false
  if (!onboarded.value) return false

  const metaHide = route.meta?.hideNav
  if (typeof metaHide === 'function') {
    if (metaHide(route)) return false
  } else if (metaHide) {
    return false
  }

  if (route.path.startsWith('/onboarding/')) return false
  if (route.path === '/quiz' || route.path === '/quiz/welcome') return false
  if (route.path === '/registering') return false
  if (route.path === '/training/storage') return false
  if (isChangeTheme.value) return false
  return true
})
</script>