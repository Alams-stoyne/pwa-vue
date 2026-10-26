<template>
  <div class="page rules-page">
    <div class="content-block d-grid g16">
      <div class="rating-badge">
        <span class="text">250</span>
        <span class="apple"><AppIcon name="apple" :size="24" /></span>
      </div>
      <div class="subtitle text-center"><b>ваши результаты в яблочках</b></div>
      <p>Смотрите лекции, проходите практики и собирайте <b>яблочки</b>.</p>
      <p>Повторное выполнение задания и смена трека <b>не дают повторную наград</b> у за тот же день.</p>
      <p><b>Ваша эффективность</b> показывает, сколько яблочек вы собрали из доступных за все открытые дни. Например, заработали 80 из 100 — ваша эффективность 80%.</p>
      <p>В личной статистике также видны ваше место в рейтинге, просмотренные лекции, выполненные практики, дни привычки и подтверждённые шаги.</p>
      <div class="subtitle text-center"><b>а что у команды?</b></div>
      <p>На общей вкладке собраны наши совместные результаты.</p>
      <p>Например, 10 участников одной компании могли собрать 1 000 яблочек, а собрали 700 — результат команды 70%.</p>
      <p>Яблочки и рейтинги обновляются раз в сутки. Если результат пока не появился, немного подождите.</p>
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
.heart-page-title{
  position: relative;
  font-size: 32px;
  text-align: center;
}
.content-block{
  border: 1px solid #afe6dd;
  border-radius: 20px;
  padding: 24px 16px;
  background: var(--white);
}
.content-block p{
  margin: 0;
}
.content-block .subtitle{
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 20px;
  line-height: 100%;
  text-align: center;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}
.rating-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 100px;
  background: #fff;
  border: 1.5px solid #21271f;
  color: #21271f;
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 0 auto;
}
.rating-badge .text {
  /* font-variant-numeric: tabular-nums; */
  font-family: var(--font-family);
  font-weight: 500;
  font-size: 18px;
  line-height: 87%;
  text-transform: lowercase;
  text-wrap: balance;
  color: var(--txt-black-dark-green);
}
.rating-badge svg{
  color: transparent;
}
</style>