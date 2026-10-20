<template>
  <div class="uploader">

    <label
      v-if="modelValue.length < max"
      class="btn-min btn-white"
      :class="{ disabled: uploading }"
    >
      <input
        type="file"
        accept="image/*"
        multiple
        hidden
        :disabled="uploading"
        @change="onFiles"
      />

      <AppIcon v-if="uploading" name="archive" :size="24" />
      <AppIcon v-else name="clip" :size="24" />
    </label>  

    <div v-if="modelValue.length" class="grid">
      <div v-for="(img, i) in modelValue" :key="i" class="item">
        <img :src="img" alt="" />
        <button
          type="button"
          class="remove"
          :disabled="uploading"
          aria-label="Удалить"
          @click="remove(i)"
        >×</button>
      </div>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { compressImage } from '../modules/core/utils/image'
import AppIcon from '../components/AppIcon.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 5 },
})
const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const error = ref('')

function remove(i) {
  const next = [...props.modelValue]
  next.splice(i, 1)
  emit('update:modelValue', next)
}

async function onFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return

  const room = props.max - props.modelValue.length
  const take = files.slice(0, room)
  if (!take.length) return

  uploading.value = true
  error.value = ''
  try {
    const compressed = []
    for (const f of take) {
      try {
        const dataUrl = await compressImage(f, { maxDim: 1600, quality: 0.8 })
        if (dataUrl) compressed.push(dataUrl)
      } catch (err) {
        console.warn('[uploader] compress failed', err)
      }
    }
    emit('update:modelValue', [...props.modelValue, ...compressed])
  } catch {
    error.value = 'Не удалось обработать изображения'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>

.btn-min{
  display: flex;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  max-width: 42px;
  justify-content: center;
  align-items: center;  
  padding: 6px;
  box-shadow: 1px 2px 0 0 var(--black);
  margin-top: -68px;
  margin-left: 6px;
  z-index: 2;
}



.uploader { 
  display: grid; 
  gap: 10px; 
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}
.item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f2f2f2;
}
.item img { width: 100%; height: 100%; object-fit: cover; display: block; }

.remove {
  position: absolute;
  top: 4px; right: 4px;
  width: 22px; height: 22px;
  padding: 0;
  border: none; border-radius: 50%;
  background: rgba(0, 0, 0, .65);
  color: #fff;
  font-size: 14px; line-height: 1;
  cursor: pointer;
}
.remove:disabled { opacity: .5; cursor: default; }

.add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px dashed var(--border);
  background: #fafafa;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--accent);
  -webkit-tap-highlight-color: transparent;
}
.add-btn.disabled { opacity: .5; cursor: default; }

.err { margin: 0; font-size: 12px; color: #B91D0C; }
</style>