<template>
  <div class="page uid-recovery">
    <div class="ur-card">
      <div class="ur-icon" aria-hidden="true">🔗</div>

      <h1>Нужен код доступа</h1>

      <p class="ur-text">
        Приложение установлено, но код доступа не сохранился.
        Вставьте его из персональной ссылки, по которой вы
        устанавливали приложение.
      </p>

      <p class="ur-hint">
        Ссылка выглядит так:
        <code>/?uid=<b>ВАШ_КОД</b></code>
      </p>

      <label class="ur-field">
        <span class="ur-label">Код доступа</span>
        <input
          v-model.trim="input"
          type="text"
          inputmode="latin"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="a3f54597eab20e7f9dcd818673667e000e919708"
          @keyup.enter="submit"
        />
      </label>

      <p v-if="error" class="ur-error">{{ error }}</p>

      <button
        class="ur-button"
        type="button"
        :disabled="!canSubmit"
        @click="submit"
      >
        Продолжить
      </button>

      <button
        class="ur-link"
        type="button"
        @click="openSourceLink"
      >
        Открыть ссылку в Safari
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { setUidManually } from './useAccess'
import { track } from '../analytics'
import { EVT } from '../analytics/events'

const input = ref('')
const error = ref('')

const canSubmit = computed(() => {
  const v = input.value
  return v.length >= 8 && /^[a-zA-Z0-9_-]+$/.test(v)
})

function submit() {
  error.value = ''
  if (!canSubmit.value) {
    error.value = 'Проверьте код — он выглядит некорректно'
    return
  }

  const ok = setUidManually(input.value)
  if (!ok) {
    error.value =
      'Этот код не подходит: устройство уже привязано к другому коду'
    return
  }

  location.reload()
}

function openSourceLink() {
  location.href = 'https://v12.x5hd.ru/'
}

onMounted(() => {
  track(EVT.UID_RECOVERY_SHOWN, {})
})
</script>

<style scoped>
.uid-recovery {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 20px 40px;
}

.ur-card {
  max-width: 380px;
  width: 100%;
  display: grid;
  gap: 14px;
  text-align: center;
}

.ur-icon {
  font-size: 44px;
  line-height: 1;
  margin-bottom: 4px;
}

.ur-card h1 {
  margin: 0;
  font-family: var(--third-family, inherit);
  font-weight: 400;
  font-size: 26px;
  line-height: 1.1;
  color: #ffcdbb;
  -webkit-text-stroke: 1px #B91D0C;
}

.ur-text {
  margin: 0;
  font-weight: 500;
  font-size: 15px;
  line-height: 1.35;
  color: #21271f;
}

.ur-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #6b7268;
}

.ur-hint code {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  background: #f3f3f3;
  padding: 2px 6px;
  border-radius: 4px;
  overflow-wrap: anywhere;
}

.ur-hint b {
  color: #B91D0C;
}

.ur-field {
  display: grid;
  gap: 6px;
  text-align: left;
}

.ur-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #21271f;
}

.ur-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1px solid var(--border, #d5d5d5);
  border-radius: 10px;
  font-size: 14px;
  font-family: ui-monospace, monospace;
  background: #fff;
  color: #21271f;
  outline: none;
  transition: border-color .15s;
}

.ur-field input:focus {
  border-color: #0F5A05;
}

.ur-error {
  margin: 0;
  font-size: 13px;
  color: #B91D0C;
}

.ur-button {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: #0F5A05;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity .15s;
}

.ur-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.ur-link {
  background: none;
  border: none;
  color: #0F5A05;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 4px;
}
</style>