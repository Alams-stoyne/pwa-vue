<template>
  <div class="page consent-page">
    <div class="consent-content">
      <svg
        class="consent-icon"
        width="62"
        height="62"
        viewBox="0 0 62 62"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M31 2C47.0163 2 60 14.9837 60 31C60 47.0163 47.0163 60 31 60C14.9837 60 2 47.0163 2 31C2 14.9837 14.9837 2 31 2Z" fill="#F5A000"/>
        <path d="M31 2C47.0163 2 60 14.9837 60 31C60 47.0163 47.0163 60 31 60C14.9837 60 2 47.0163 2 31C2 14.9837 14.9837 2 31 2Z" stroke="white" stroke-width="4"/>
        <path d="M30.8432 27.3439C33.6866 27.3481 33.2463 30.2188 33.2443 32.211L33.2446 40.4759C33.2447 41.7479 33.4677 43.7267 32.305 44.5784C31.9415 44.8447 31.6714 44.9012 31.2452 45C28.4032 44.9578 28.7818 42.4425 28.7809 40.4205L28.7816 32.0839C28.7811 30.1904 28.3427 27.6475 30.8432 27.3439Z" fill="white"/>
        <path d="M30.6705 17.019C32.2705 16.8368 33.715 17.9871 33.8957 19.5874C34.0764 21.1877 32.9248 22.6311 31.3244 22.8104C29.726 22.9894 28.2848 21.8396 28.1044 20.2413C27.9239 18.6431 29.0724 17.2009 30.6705 17.019Z" fill="white"/>
      </svg>

      <header class="head">
        <h1>согласие<br> на обработку<br> персональных<br> данных</h1>
      </header>

      <button
        type="button"
        class="link-btn"
        @click="modalOpen = true"
      >
        Что будет, если я не дам согласие?
      </button>

      <p v-if="store.error" class="error">{{ store.error }}</p>
    </div>

    <div class="bottom-action d-grid g24">
      <button
        type="button"
        class="btn btn-secondary btn-center"
        :disabled="store.saving"
        @click="deny"
      >
        {{ store.saving ? 'Сохраняем…' : 'Пропустить' }}
      </button>
      <button
        type="button"
        class="btn btn-primary btn-center"
        :disabled="store.saving"
        @click="allow"
      >
        {{ store.saving ? 'Сохраняем…' : 'Согласен' }}
      </button>
    </div>

    <!-- Модалка. Teleport — ВНУТРИ корневого div, а не на одном уровне с ним -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
          <div class="modal" role="dialog" aria-modal="true">
            <h2>Что будет, если я не дам согласие?</h2>
            <ul class="modal-list">
              <li>Останутся доступны: главная, обучение, материалы, статистика, профиль.</li>
              <li>Не будут работать: отметки привычек, отправка рефлексии и шагов, обращения в поддержку, напоминания (PUSH).</li>
              <li>Согласие можно дать позже в любой момент — на этой же странице.</li>
            </ul>
            <button
              type="button"
              class="btn btn-primary btn-center m-auto"
              @click="modalOpen = false"
            >
              Понятно
            </button>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConsentStore } from './store'
import { resolveNextOnboardingRoute } from '../onboarding/navigation'
import { useAppBackground } from '../core/composables/useAppBackground'

const store = useConsentStore()
const router = useRouter()
const { setBackground, clearBackground } = useAppBackground()

const modalOpen = ref(false)

function goNext() {
  const next = resolveNextOnboardingRoute()
  router.replace(next).catch((err) => {
    if (err?.name !== 'NavigationDuplicated') {
      console.warn('[consent] nav error:', err)
    }
  })
}

async function allow() {
  try { await store.answer(true) }
  catch (e) { console.error('[consent] allow error:', e) }
  goNext()
}

async function deny() {
  try { await store.answer(false) }
  catch (e) { console.error('[consent] deny error:', e) }
  goNext()
}

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_start.jpg' })
  store.loadStatus()
})

onBeforeUnmount(() => {
  clearBackground()
})
</script>

<style scoped>
.consent-page {
  position: relative;
  padding-bottom: 194px;
  display: grid;
  align-content: center;
  align-items: center; 
  justify-items: center;
}

.consent-content {
  flex: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 24px;
}

.consent-icon {
  display: block;
}

.head {
  /* max-width: 340px; */
}
.head h1 {
  margin: 0;
  font-family: var(--third-family);
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
  text-align: center;
  color: var(--white);
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 20px;
  line-height: 120%;
  text-align: center;
  text-decoration: underline;
  text-decoration-skip-ink: none;
  text-transform: lowercase;
  color: #c3eb91;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  max-width: 320px;
}
.link-btn:hover { opacity: .8; }

.error {
  margin: 0;
  font-size: 13px;
  color: #B91D0C;
  padding: 8px 12px;
  background: #FDECEA;
  border-radius: 8px;
  max-width: 358px;
  text-align: center;
}

/* ─── Модалка ─── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,.5);
  display: grid;
  place-items: center;
  padding: 24px;
}
.modal {
  background: #fff;
  border-radius: var(--radius);
  padding: 24px;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}
.modal h2 { margin: 0 0 14px; font-size: 18px; line-height: 1.3; }
.modal-list {
  margin: 0 0 20px;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.55;
  color: #21271f;
}
.modal-list li { margin-bottom: 8px; }

@media (max-width: 420px) {
  .head h1 { font-size: 22px; }
  .link-btn { font-size: 17px; }
}
</style>