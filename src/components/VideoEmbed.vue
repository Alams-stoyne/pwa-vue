<template>
  <div class="video-embed">
    <template v-if="!online">
      <div class="video-offline">
        Воспроизведение видео недоступно без подключения к интернету.
      </div>
    </template>
    <template v-else-if="parsed?.kind === 'iframe'">
      <iframe
        :src="parsed.src"
        class="video-frame"
        title="Видео"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      />
    </template>
    <template v-else-if="parsed?.kind === 'video'">
      <video
        :src="parsed.src"
        class="video-frame"
        controls
        playsinline
        preload="metadata"
      />
    </template>
    <template v-else>
      <div class="video-offline">Видео недоступно</div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { parseVideoUrl } from '../modules/core/utils/video'

const props = defineProps({
  url: { type: String, required: true },
})

const online = computed(() =>
  typeof navigator === 'undefined' ? true : navigator.onLine
)
const parsed = computed(() => parseVideoUrl(props.url))
</script>

<style scoped>
.video-embed {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
.video-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
.video-offline {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 14px;
  padding: 20px;
  text-align: center;
  line-height: 1.5;
}
</style>