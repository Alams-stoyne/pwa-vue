<template>
  <div class="page gate-page">
    <div class="gate-card">

      <h1 class="color-text-stroke-error">не удалось проверить доступ</h1>

      <!-- <p class="gate-text">Откройте «День здоровья» через корпоративный канал Х5.</p> -->

      <p v-if="isMismatch" class="gate-text">
        Это устройство уже привязано к другому uid.
        Смена uid невозможна — обратитесь к администратору.
      </p>

      <p v-else-if="hasBoundUid" class="gate-text">
        Если нужно начать заново — удалите приложение и заново установите
        его по исходной персональной ссылке.
      </p>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAccess } from './useAccess'

const { uidMismatch, hasBoundUid } = useAccess()

const isMismatch = computed(() => uidMismatch.value)

const title = computed(() =>
  isMismatch.value ? 'UID не совпадает' : 'Доступ не подтверждён'
)

const message = computed(() => {
  if (isMismatch.value) {
    return 'Приложение уже активировано на этом устройстве под другим UID. ' +
           'Использовать другой UID на этом устройстве нельзя.'
  }
  return 'Чтобы установить приложение, перейдите по персональной ссылке ' +
         'с параметром uid. Обратитесь к тому, кто её выдал.'
})
</script>

<style scoped>
.gate-page {
  display: grid;
  place-items: center;
  color: var(--bg);
  font-family: var(--font-family);
  font-weight: 500;
  text-wrap: balance;
}

.gate-card {
  position: relative;
  display: grid;
  justify-content: center;
  align-items: center;
  justify-items: center;
}

.gate-card h1 {
  font-weight: 400;
  font-size: 28px;
  line-height: 96%;
  text-align: center;
}

.gate-card .gate-text {
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 120%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--white);
}

.gate-hint {
  font-family: var(--font-family);
  font-weight: 400;
  font-size: 14px;
  line-height: 120%;
  text-align: center;
  background: var(--bg);
  color: var(--text);
  border-radius: 20px;
  padding: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .gate-icon { animation: none; }
}
</style>