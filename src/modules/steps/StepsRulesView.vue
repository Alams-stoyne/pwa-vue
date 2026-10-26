<template>
  <div class="page rules-page">
    <div class="heart-page-title color-text-stroke">шагаем вместе </div>
    <div class="content-block">
      <p><b>С 26 октября по 1 ноября</b> участвуйте в марафоне шагов Х5. Прогулка в обед, дорога до магазина или вечерний круг по парку — каждый шаг идёт в зачёт.</p>
      <p>Используйте удобное приложение-шагомер. Каждый день открывайте вкладку «Шагомер» в разделе рефлексии, указывайте количество шагов за вчера и <b>прикрепляйте скриншот</b>. На нём должны быть видны дата и результат. Не забудьте нажать «Отправить»: автоматически данные на платформу не передаются.</p>
      <p>Первую загрузку, за 26 октября, добавьте 27 октября. Последние шаги, за воскресенье, 1 ноября, отправьте в понедельник, 2 ноября.</p>
      <p>Шаги за дни марафона складываются. Подтверждённый результат можно посмотреть в статистике. <b>Рейтинг обновляется раз в сутки</b>, поэтому новая загрузка может отобразиться не сразу.</p>
      <p>После проверки определим количество участников с наибольшей суммой подтверждённых шагов. Их ждут призы. <b>Победителей и порядок получения подарков опубликуем в Сфере</b>.</p>
      <p>Ну что, прогуляемся?</p>
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
  line-height: 100%;
}
.content-block{
  border: 1px solid #afe6dd;
  border-radius: 20px;
  padding: 24px 16px;
  background: var(--white);
}
</style>