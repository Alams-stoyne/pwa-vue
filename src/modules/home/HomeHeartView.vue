<template>
  <div class="page rules-page">
    <div class="heart-page-title color-text-stroke">Забота может помочь другому человеку </div>
    <div class="content-block">
      <p>На Неделе здоровья и безопасности Х5 рассказываем о донорских активностях. Посмотрите условия участия, расписание и рекомендации организаторов <a href="https://sfera.x5.ru/hrcontent/news/6ad242c82140c619d6ae337e " target="_blank" rel="noopener noreferrer">тут</a>.</p>
      <p>Участие добровольное. Возможность донации определяют специалисты службы крови.</p>
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
  position: relative;
  display: grid;
  align-items: start;
  align-content: start;
  gap: 16px;
}
.heart-page {
  position: relative;
  display: grid;
  align-items: start;
  align-content: start;
  gap: 16px;
}
.heart-page-title{
  position: relative;
  font-size: 32px;
  text-align: center;
  text-transform: lowercase;
  line-height: 120%;
}
.content-block{
  border: 1px solid #afe6dd;
  border-radius: 20px;
  padding: 24px 16px;
  background: var(--white);
}
</style>