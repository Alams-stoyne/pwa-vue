<template>
  <div class="page blocked-page">
    <div class="blocked-icon">🚫</div>
    <h1 class="blocked-title">Доступ приостановлен</h1>
    <p class="blocked-message">{{ message }}</p>
    <p class="blocked-hint">
      Если вы не согласны с блокировкой — напишите в поддержку.
    </p>
    <router-link to="/support" class="btn btn-primary btn-center">
      написать в поддержку
    </router-link>
  </div>
</template>

<script setup>
defineProps({ message: { type: String, default: 'Доступ приостановлен.' } })
</script>

<style scoped>
.blocked-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 100dvh;
  padding: 32px 24px;
  text-align: center;
}
.blocked-icon { font-size: 64px; line-height: 1; }
.blocked-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 24px;
  color: #B91D0C;
  margin: 0;
}
.blocked-message {
  font-size: 15px;
  color: #21271f;
  margin: 0;
  max-width: 480px;
}
.blocked-hint {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 16px;
}
.blocked-page .btn { max-width: 320px; width: 100%; }
</style>