<template>
  <div class="page rules-page">
    <header class="head">
      <h1 class="title color-text-stroke">Правила начисления</h1>
      <p class="subtitle">Как зарабатывать яблоки и помогать своей команде</p>
    </header>

    <div class="rules-groups">
      <!-- Группа: Обучение -->
      <section class="group">
        <h2 class="group-title">Обучение</h2>
        
        <div class="rule-card">
          <div class="rc-icon"><AppIcon name="book" :size="20" /></div>
          <div class="rc-info">
            <div class="rc-title">Лекции</div>
            <div class="rc-desc">Читайте материалы и отмечайте «Просмотрено» <strong>в день публикации</strong>.</div>
          </div>
        </div>

        <div class="rule-card">
          <div class="rc-icon"><span class="emoji-icon">⚡</span></div>
          <div class="rc-info">
            <div class="rc-title">Зарядка</div>
            <div class="rc-desc">Выполняйте утреннюю разминку <strong>в день публикации</strong>.</div>
          </div>
        </div>

        <div class="rule-card">
          <div class="rc-icon"><AppIcon name="tasks" :size="20" /></div>
          <div class="rc-info">
            <div class="rc-title">Практики</div>
            <div class="rc-desc">Выполняйте задания от экспертов <strong>в день публикации</strong>.</div>
          </div>
        </div>
      </section>

      <!-- Группа: Ежедневные активности -->
      <section class="group">
        <h2 class="group-title">Активности</h2>

        <div class="rule-card">
          <div class="rc-icon"><span class="emoji-icon">👣</span></div>
          <div class="rc-info">
            <div class="rc-title">Шаги (отправка)</div>
            <div class="rc-desc">Загружайте скриншоты шагомера. Награда начисляется сразу после отправки.</div>
          </div>
        </div>

        <div class="rule-card">
          <div class="rc-icon"><AppIcon name="fading-clock" :size="20" /></div>
          <div class="rc-info">
            <div class="rc-title">Шаги (проверка)</div>
            <div class="rc-desc">Дополнительные баллы начисляются после подтверждения шагов модератором.</div>
          </div>
        </div>

        <div class="rule-card">
          <div class="rc-icon"><AppIcon name="heart-plus" :size="20" /></div>
          <div class="rc-info">
            <div class="rc-title">Привычка</div>
            <div class="rc-desc">Выполните дневную норму по вашей привычке.</div>
          </div>
        </div>

        <div class="rule-card">
          <div class="rc-icon"><span class="emoji-icon">📝</span></div>
          <div class="rc-info">
            <div class="rc-title">Рефлексия</div>
            <div class="rc-desc">Делитесь мыслями в разделе «Рефлексия» (1 раз в день).</div>
          </div>
        </div>
      </section>

      <!-- Группа: События -->
      <section class="group">
        <h2 class="group-title">События</h2>

        <div class="rule-card">
          <div class="rc-icon"><span class="emoji-icon">📅</span></div>
          <div class="rc-info">
            <div class="rc-title">Мероприятия дня</div>
            <div class="rc-desc">Участвуйте в вебинарах и активностях, подтверждайте выполнение и забирайте награду.</div>
          </div>
        </div>
      </section>
    </div>

    <div class="info-banner">
      <strong>Командный зачёт:</strong> все заработанные вами яблоки автоматически прибавляются к общему счёту вашей компании.
    </div>

    <div class="bottom-action mt-24">
      <router-link to="/stats" class="btn btn-primary btn-center">К статистике</router-link>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AppIcon from '../../components/AppIcon.vue'
import { useAppBackground } from '../core/composables/useAppBackground'

const { setBackground } = useAppBackground()

onMounted(() => {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
})
</script>

<style scoped>
.rules-page {
  padding-bottom: 32px;
}

.head {
  text-align: center;
  margin-bottom: 24px;
}
.title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 26px;
  line-height: 1.1;
  text-transform: lowercase;
  color: var(--txt-dark-green);
  margin: 0 0 8px;
}
.subtitle {
  font-family: var(--font-family);
  font-size: 14px;
  color: var(--txt-black-dark-green);
  margin: 0;
}

.rules-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-title {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 18px;
  text-transform: lowercase;
  color: var(--txt-dark-green);
  margin: 0 0 4px 4px;
}

.rule-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--border);
}

.rc-icon {
  width: 40px;
  height: 40px;
  background: #D3FF4F;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #015F01;
  flex-shrink: 0;
  font-size: 20px;
}

.rc-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rc-title {
  font-weight: 700;
  font-size: 15px;
  color: #21271f;
}
.rc-desc {
  font-size: 13.5px;
  line-height: 1.4;
  color: var(--txt-black-dark-green);
}
.rc-desc strong {
  font-weight: 600;
  color: #21271f;
}

.info-banner {
  background: #f1f3e9;
  padding: 16px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.4;
  color: #21271f;
}

.mt-24 { margin-top: 24px; }
</style>