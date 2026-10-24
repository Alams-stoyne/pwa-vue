<template>
  <div class="page theme-page page--bottom-action">
    <transition name="fade" appear>
      <header>
        <h1 class="color-text-stroke">Выберите привычку</h1>
      </header>
    </transition>

    <p class="muted intro">
      У вас будет одна привычка. Всего одна — зато каждый день.
    </p>

    <div v-if="loading" class="theme-grid">
      <div v-for="n in 3" :key="n" class="theme-card skeleton-card pulse">
        <div class="sk-line sk-line--title" />
        <div class="sk-line sk-line--text" />
      </div>
    </div>

    <div v-else-if="!habits.catalog.length" class="empty">
      <span class="empty-emoji">📭</span>
      <h3>Привычки не найдены</h3>
      <p class="muted">Для этого направления пока нет привычек.</p>
    </div>

    <div v-else class="theme-grid">
      <article
        v-for="(h, i) in habits.catalog"
        :key="h.id"
        class="theme-card rise"
        :class="{
          selected: chosenId === h.id,
          busy: habits.saving,
        }"
        :style="{ animationDelay: i * 60 + 'ms' }"
      >
        <div
          type="button"
          class="theme-main"
        >
          <span class="theme-check" aria-hidden="true"
            :disabled="habits.saving"
            @click="pick(h.id)"        
          >
            <AppIcon name="check" :size="16" />
          </span>
          <div class="theme-info">
            <div class="theme-name color-text-stroke" v-html="h.title" />
            <button
              class="theme-details"
              :disabled="habits.saving"
              @click.stop="openDetails(h)"
            >
              <span>Подробнее</span>
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.75 1.5806C3.75 1.12187 4.12187 0.750001 4.5806 0.750002L15.544 0.75C15.7643 0.75 15.9755 0.83751 16.1313 0.993278C16.2871 1.14905 16.3746 1.36031 16.3746 1.5806V12.544C16.3746 13.0027 16.0027 13.3746 15.544 13.3746C15.0852 13.3746 14.7134 13.0027 14.7134 12.544V3.58585L5.16793 13.1313C4.84356 13.4557 4.31765 13.4557 3.99328 13.1313C3.66891 12.8069 3.66891 12.281 3.99328 11.9567L13.5387 2.4112L4.5806 2.4112C4.12187 2.4112 3.75 2.03933 3.75 1.5806Z" fill-rule="evenodd" clip-rule="evenodd" fill="#21271F" />
              </svg>
            </button>             
          </div>
        </div>
      </article>
    </div>

    <!-- PUSH -->
    <transition name="fade">
      <section
        v-if="chosenId && !habits.notificationsEnabled"
        class="push-block"
      >
        <h3 class="push-title">🔔 Напоминания</h3>
        <p class="push-text muted">
          Включите напоминания, чтобы не забывать о привычке.
          Мы будем мягко напоминать в подходящее время.
        </p>
        <button
          type="button"
          class="btn btn-secondary btn-center"
          @click="enableNotifications"
        >
          Включить напоминания
        </button>
      </section>
    </transition>

    <div class="bottom-action d-grid g8">
      <button
        type="button"
        class="btn btn-primary btn-center"
        :disabled="!chosenId || habits.saving"
        @click="proceed"
      >
        {{ habits.saving ? 'Сохранение…' : 'Продолжить' }}
      </button>
    </div>

    <HabitDetailModal
      v-model="detailsOpen"
      :habit="currentHabit"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../../components/AppIcon.vue'
import HabitDetailModal from './HabitDetailModal.vue'
import { useHabitsStore } from './store'
import { useToast } from '../core/composables/useToast'
import { useAppBackground } from '../core/composables/useAppBackground'
import { resolveNextOnboardingRoute } from '../onboarding/navigation'

const habits = useHabitsStore()
const router = useRouter()
const toast = useToast()
const { setBackground } = useAppBackground()

const detailsOpen = ref(false)
const currentHabit = ref(null)

// ▼ ЛОКАЛЬНЫЙ ВЫБОР (не отправляем на сервер до нажатия "Продолжить") ▼
const chosenId = ref(habits.selectedHabitId || null)

const loading = computed(() => habits.loading)

function pick(id) {
  if (habits.saving) return
  // Меняем только локальное состояние
  chosenId.value = id
}

function openDetails(habit) {
  currentHabit.value = habit
  detailsOpen.value = true
}

async function enableNotifications() {
  const ok = await habits.enableNotifications()
  if (ok) toast.success('Напоминания включены')
  else toast.warn('Уведомления не разрешены')
}

async function proceed() {
  if (!chosenId.value || habits.saving) return

  // Отправляем на сервер только если выбор изменился
  if (chosenId.value !== habits.selectedHabitId) {
    const ok = await habits.selectHabit(chosenId.value)
    if (!ok) {
      toast.error(habits.error || 'Не удалось сохранить выбор')
      return
    }
  }

  const next = await resolveNextOnboardingRoute()
  router.replace(next)
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  habits.loadHabits()
})
</script>

<style scoped>
.theme-page {
  position: relative;
}

.theme-page h1 {
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
}

.intro {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.4;
}

.theme-grid {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}
@media (max-width: 420px) {
  .theme-grid { grid-template-columns: 1fr; }
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  overflow: hidden;
  transition: transform var(--t-base), border-color var(--t-base),
              box-shadow var(--t-base), background var(--t-base), opacity var(--t-base);
}
.theme-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-1);
}
.theme-card.selected {
  border-color: #015f01;
  box-shadow: 0 0 0 1px var(--accent-soft);
}
.theme-card.busy { opacity: .6; pointer-events: none; }

.theme-main {
  position: relative;
  display: flex;
  gap: 16px;
  padding: 18px 15px;
  text-align: left;
  background: transparent;
  color: var(--text);
  font-weight: 500;
  border: none;
  border-radius: 0;
  box-shadow: none;
  cursor: pointer;
}
.theme-main:hover:not(:disabled) { background: transparent; box-shadow: none; }
.theme-main:active:not(:disabled) { transform: none; }

.theme-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
}

.theme-name {
  font-size: 18px;
  line-height: 150%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-brand-limon);
}

.theme-check {
  background: #d1efea;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
  transition: opacity var(--t-base), transform var(--t-base);
}
.theme-card.selected .theme-check {
  background: #015f01;
  color: #D3FF4F;
}

.theme-details {
  border: 2px solid var(--txt-black-dark-green);
  border-radius: 120px;
  padding: 5px 16px;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-align: center;
  text-transform: lowercase;
  color: var(--txt-black-dark-green);
  cursor: pointer;
  transition: background var(--t-fast);
  background: var(--white);
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.theme-details:hover {
  background: var(--white);
}

/* ─── PUSH ─── */
.push-block {
  margin: 20px 0 0;
  padding: 16px;
  border: 1px solid #FBE5C6;
  background: #FFF8EC;
  border-radius: var(--radius);
}
.push-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
}
.push-text {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
}
.push-block .btn {
  width: 100%;
}

/* ─── Пустое состояние ─── */
.empty {
  text-align: center;
  padding: 40px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.empty-emoji { font-size: 44px; }
.empty h3 { margin: 4px 0 0; }

/* ─── Скелетон ─── */
.skeleton-card {
  padding: 18px 15px;
}
.sk-line {
  height: 12px;
  border-radius: 6px;
  background: #eee;
  margin-bottom: 8px;
}
.sk-line--title { width: 60%; height: 16px; }
.sk-line--text { width: 40%; margin-bottom: 0; }
</style>