<template>
  <div class="page onboarding-page page--bottom-action">
    <transition name="fade" appear>
      <header class="head_style text-center">
        <h1 class="title color-text-stroke">завершим настройку</h1>
        <div class="subtitle">заполните обязательные данные для участия</div>
      </header>
    </transition>

    <form @submit.prevent="onContinue" class="form">
      <label>
        <input
          v-model.trim="store.nickname"
          type="text"
          autocomplete="nickname"
          maxlength="32"
          placeholder="никнейм например: ivan_x5"
        />
      </label>

      <label>
        <select
          v-model="store.workplace"
          class="select"
          required
        >
          <option value="" disabled>бизнес-единица / магазин* выберите из списка…</option>
          <!-- ▼ ИСПОЛЬЗУЕМ id и name ▼ -->
          <option
            v-for="w in store.workplaces"
            :key="w.id"
            :value="w.id"
          >{{ w.name }}</option>
        </select>
      </label>
    </form>

    <div class="bottom-action">
      <button
        type="button"
        class="btn btn-primary btn-center"
        :disabled="!canContinue || store.isSyncing"
        @click="onContinue"
      >
        {{ store.isSyncing ? 'Сохранение…' : 'Продолжить' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from './store'
import { useQuizStore } from '../quiz/store'
import { useToast } from '../core/composables/useToast'
import { resolveNextOnboardingRoute } from '../onboarding/navigation'

const store = useProfileStore()
const quiz = useQuizStore()
const router = useRouter()
const toast = useToast()

const canContinue = computed(() => store.isComplete)

onMounted(() => { store.load() })
watch(() => store.error, (v) => { if (v) toast.error(v) })

async function onContinue() {
  if (!canContinue.value) return
  await store.save()
  const next = await resolveNextOnboardingRoute()
  router.replace(next)
}
</script>

<style scoped>
.onboarding-page { 
  display: grid;
    gap: 24px;
  align-items: center;
  align-content: center;
}
.req { color: var(--accent); font-weight: 700; }
</style>