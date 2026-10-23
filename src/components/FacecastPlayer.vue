<template>
  <div v-if="embedUrl" class="video-wrapper">
    <iframe
      :src="embedUrl"
      class="video-iframe"
      allow="autoplay; fullscreen"
      allowfullscreen
    ></iframe>
  </div>
  <div v-else class="video-error">
    Не удалось загрузить видео. <a :href="url" target="_blank" rel="noopener">Открыть в новой вкладке</a>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  url: { type: String, required: true },
  // Путь до файла относительно корня сайта (без домена)
  cssPath: { type: String, default: '/css/facecast-custom.css' }
})

// Извлекаем ID видео из ссылки
const videoId = computed(() => {
  const match = props.url.match(/facecast\.net\/w\/([\w-]+)/)
  return match ? match[1] : null
})

// Формируем URL с параметрами
const embedUrl = computed(() => {
  if (!videoId.value) return null
  
  // Берем текущий origin (например, https://v12.x5hd.ru или http://localhost:5173)
  const origin = window.location.origin
  
  // Собираем полный URL до CSS файла
  const fullCssUrl = `${origin}${props.cssPath}`

  const params = new URLSearchParams({
    autorun: 'false',
    lang: 'ru',
    nolabel: '',
    nodate: '',
    css: fullCssUrl
  })
  
  return `https://facecast.net/w/${videoId.value}?${params.toString()}`
})
</script>

<style scoped>
.video-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 */
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  border: 1px solid var(--border);
}
.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
.video-error {
  padding: 20px;
  text-align: center;
  background: #FFF8EC;
  border-radius: 12px;
}
</style>