<template>
  <div class="page heart-page">
    <div class="heart-page-title color-text-stroke"> донорство </div>
    <div class="content-block">
      <p>тут текст</p>
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
}
.content-block{
  border: 1px solid #afe6dd;
  border-radius: 20px;
  padding: 24px 16px;
  background: var(--white);
}
</style>