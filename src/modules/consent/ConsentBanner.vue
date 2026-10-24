<template>
  <div v-if="!store.isGranted && store.isAnswered" class="consent-banner">
    <div class="cb-text">
      <strong>Режим просмотра.</strong>
      {{ resolvedText }}
    </div>
    <router-link to="/onboarding/consent" class="cb-btn">
      Дать согласие
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConsentStore } from './store'

const DEFAULT_TEXT = 'Действия недоступны без согласия на обработку данных.'

const props = defineProps({
  /**
   * Текст-пояснение после «Режим просмотра.».
   * Если не передан или пустой — используется текст по умолчанию.
   */
  text: {
    type: String,
    default: '',
  },
})

const store = useConsentStore()

const resolvedText = computed(() => props.text || DEFAULT_TEXT)
</script>

<style scoped>
.consent-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  padding: 12px 16px;  
  margin-bottom: 14px;
  margin-top: 14px;
  margin-left: 18px;
  margin-right: 18px;
  position: fixed;
  background: #FFF8EC;
  border: 1px solid #FBE5C6;
  border-radius: var(--radius);
  font-size: 13px;
  color: #21271f;
  z-index: 1000;
}
.consent-banner.relative{
  position: relative;
  margin: 0;
  z-index: 1;
}
.cb-text { line-height: 1.4; }
.cb-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

@media (max-width: 420px) {
  .consent-banner { flex-direction: column; align-items: stretch; }
  .cb-btn { text-align: center; }
}
</style>