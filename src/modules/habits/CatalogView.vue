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
          selected: habits.selectedHabitId === h.id,
          busy: habits.saving,
        }"
        :style="{ animationDelay: i * 60 + 'ms' }"
      >
        <button
          type="button"
          class="theme-main"
          :disabled="habits.saving"
          @click="pick(h.id)"
        >
          <span class="theme-check" aria-hidden="true">
            <AppIcon name="check" :size="16" />
          </span>
          <div class="theme-info">
            <span class="theme-name color-text-stroke">{{ h.title }}</span>
            <!-- <div
              v-if="habits.selectedHabitId === h.id"
              class="theme-badge"
            >✓ Выбрана</div> -->
            <span class="theme-subtitle muted">{{ h.hint }}</span>
          </div>
        </button>

        <button
          class="theme-details"
          :disabled="habits.saving"
          @click.stop="openDetails(h)"
        >
          <span>Подробнее</span>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0.830603C-2.80058e-07 0.371874 0.371873 1.34778e-06 0.830601 1.55782e-06L11.794 0C12.0143 0 12.2255 0.0875097 12.3813 0.243278C12.5371 0.399046 12.6246 0.610312 12.6246 0.830601V11.794C12.6246 12.2527 12.2527 12.6246 11.794 12.6246C11.3352 12.6246 10.9634 12.2527 10.9634 11.794V2.83585L1.41793 12.3813C1.09356 12.7057 0.567648 12.7057 0.243278 12.3813C-0.0810918 12.0569 -0.0810921 11.531 0.243278 11.2067L9.78873 1.6612L0.830601 1.6612C0.371872 1.6612 -2.97561e-07 1.28933 0 0.830603Z" fill="#21271F" />
          </svg>
        </button>
      </article>
    </div>

    <!-- PUSH -->
    <transition name="fade">
      <section
        v-if="habits.hasSelection && !habits.notificationsEnabled"
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
        :disabled="!habits.hasSelection || habits.saving"
        @click="proceed"
      >
        Продолжить
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

const loading = computed(() => habits.loading)

function pick(id) {
  if (habits.saving) return
  const already = habits.selectedHabitId === id
  if (already) return
  habits.selectHabit(id).then((ok) => {
    // if (ok) toast.success('Привычка выбрана')
    // else if (habits.error) toast.error(habits.error)
  })
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
  if (!habits.hasSelection) return
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
}

.theme-name {
  font-weight: 400;
  font-size: 17px;
  line-height: 159%;
  text-wrap: balance;
}
.theme-subtitle { font-size: 12px; }

.theme-badge {
  display: flex;
  gap: 8px;
  border-radius: 120px;
  padding: 4px 10px 5px 8px;
  background: #f1f3e9;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-align: center;
  color: #015f01;
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
  position: absolute;
  text-decoration: none;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 12px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-align: center;
  background: #FFF;
  color: #21271f;
  top: 18px;
  right: 15px;
  display: flex;
  gap: 6px;
  border: 1.5px solid #21271f;
  border-radius: 120px;
  padding: 10px 16px 11px;
  width: 117px;
  height: 40px;
  min-height: 40px;
  cursor: pointer;
  transition: background var(--t-fast);
}
.theme-details:hover { background: rgba(15, 90, 5, .18); }

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