<template>
  <div class="page lecture-detail">
    <div v-if="!lecture" class="skeleton-wrap">
      <div class="sk-line sk-line--title pulse" />
      <div class="sk-line pulse" />
      <div class="sk-line pulse short" />
    </div>

    <article v-else class="lecture">
      <h1 @click="viewClick(lecture)">{{ lecture.title }}</h1>

      <!-- ── Медиа-превью ── -->
      <template v-if="hasVideo">
        <div v-if="video.type === 'facecast'" class="facecast-wrap">
          <FacecastPlayer :url="video.src" />
          <p v-if="!store.online" class="media-offline">Видео недоступно офлайн</p>
        </div>

        <div v-else class="media-hero">
          <div v-if="video.type === 'iframe'" class="video-embed">
            <iframe
              :src="video.src"
              :title="lecture.title"
              :allow="video.allow"
              allowfullscreen
              frameborder="0"
              loading="lazy"
            />
          </div>

          <video
            v-else-if="video.type === 'video'"
            :src="video.src"
            controls
            class="video"
          />

          <a
            v-else
            :href="video.src"
            target="_blank"
            rel="noopener noreferrer"
            class="video-link"
          >
            ▶ Открыть видео
          </a>

          <p v-if="!store.online" class="media-offline">Видео недоступно офлайн</p>
        </div>
      </template>

      <div v-else-if="heroPhoto" class="media-hero cover-wrap">
        <img :src="heroPhoto" alt="" class="cover-img" />
      </div>

      <!-- ── Текст ── -->
      <div class="lecture-text" v-html="safeText" />

      <!-- ── Галерея фото ── -->
      <template v-if="galleryPhotos.length">
        <div v-if="galleryPhotos.length === 1" class="photos">
          <img :src="galleryPhotos[0]" alt="Фото" class="photo" />
        </div>

        <div v-else class="photos-slider">
          <Swiper
            :modules="photoModules"
            :slides-per-view="1"
            :space-between="10"
            :pagination="{ clickable: true, dynamicBullets: true }"
            :a11y="{ enabled: true }"
            class="photo-swiper"
          >
            <SwiperSlide
              v-for="(u, i) in galleryPhotos"
              :key="i"
              class="photo-slide"
            >
              <img
                :src="u"
                :alt="`Фото ${i + 1}`"
                class="photo"
                loading="lazy"
              />
            </SwiperSlide>
          </Swiper>
        </div>
      </template>

      <div class="footer">
        <!-- ▼ ДОБАВЛЕНО: учёт лимита дня ▼ -->
        <transition name="fade" mode="out-in" v-if="isToday && !isRead">
          <div key="read" class="read-state">
            <template v-if="lectureLimit.reached">
              <b>Лимит дня исчерпан.</b>
              <span>Награда за действия по этому типу начнёт начисляться завтра.</span>
            </template>
            <template v-else-if="lectureLimit.limit > 0">
              <b>Внимание!</b>
              <span>
                Доступна награда за выполнение.
                Сегодня по этому типу: {{ lectureLimit.used }} из {{ lectureLimit.limit }}.
              </span>
            </template>
            <template v-else>
              Готово<span>Доступна награда за выполнение.</span>
            </template>
          </div>
        </transition>

        <transition name="fade" mode="out-in" v-if="isRead">
          <div key="done">
            <div class="read-state-done">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 7C0 3.13401 3.13401 0 7 0C10.866 0 14 3.13401 14 7C14 10.866 10.866 14 7 14C3.13401 14 0 10.866 0 7Z" fill="#015F01"/>
                <path d="M10.3052 4.66663L6.02745 8.9444L4.08301 6.99996" stroke="#D3FF4F" stroke-width="1.45833" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Просмотрено</span>
            </div>
            <div class="read-state-ok">
              <div class="read-state-ok-title">Готово • Просмотрено</div>
              <div class="read-state-ok-text">Результат сохранён</div>
            </div>
          </div>
        </transition>

        <transition name="fade" mode="out-in">
          <div v-if="!isToday && !isRead" key="old" class="muted old-note">
            Отметить прочтение можно было только в день публикации
          </div>
        </transition>
      </div>

      <transition name="fade" mode="out-in">
        <div class="bottom-action">
          <ConsentBanner
            v-if="!canMarkRead && isToday"
            :class="'relative'"
            text="Отметить просмотрено можно только после согласия на обработку персональных данных."
          />
          <button
            v-if="!isRead && isToday"
            key="btn"
            class="btn btn-primary btn-center"
            :disabled="!canMarkRead"
            @click="onRead"
          >
            <span class="text">Просмотрено</span>
            <!-- ▼ Бейдж скрываем, если лимит уже исчерпан ▼ -->
            <span
              class="badge"
              v-if="lecture.rewardPoints && !lectureLimit.reached"
            >
              +{{ lecture.rewardPoints }} <AppIcon name="apple" :size="21" />
            </span>
          </button>
        </div>
      </transition>

    </article>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Pagination, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import AppIcon from '../../components/AppIcon.vue'
import { useLecturesStore } from './store'
import { useThemeStore } from '../theme/store'
import { useConsentStore } from '../consent/store'
import ConsentBanner from '../consent/ConsentBanner.vue'
import { idbGet } from '../core/db'
import { useToast } from '../core/composables/useToast'
import { localDate } from '../core/utils/date'
import { useLimits } from '../core/limits'
import FacecastPlayer from '../../components/FacecastPlayer.vue'
import { useAppBackground } from '../core/composables/useAppBackground'
const { setBackground, clearBackground } = useAppBackground()

const props = defineProps({ dbKey: { type: String, required: true } })

const store = useLecturesStore()
const theme = useThemeStore()
const consent = useConsentStore()
const toast = useToast()
const limitsApi = useLimits()

const photoModules = [Pagination, A11y]

const lecture = ref(null)
const coverUrl = ref('')
const photoObjectUrls = ref([])

const canMarkRead = computed(() => consent.isGranted)
const isRead = computed(() => lecture.value && store.isRead(lecture.value.dbKey))
const isToday = computed(() => lecture.value?.publishedDate === localDate())

// ▼ Лимит по типу текущей лекции (lecture_theme | lecture_general | charging) ▼
const lectureLimit = computed(() => {
  if (!lecture.value) return { limit: 0, used: 0, reached: false, remaining: null }
  const type = limitsApi.bucketToRewardType(lecture.value.bucket)
  if (!type) return { limit: 0, used: 0, reached: false, remaining: null }
  return limitsApi.asMap.value[type] || { limit: 0, used: 0, reached: false, remaining: null }
})

// ── Текст ─────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitizeHtml(html) {
  if (!html) return ''
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

const safeText = computed(() => {
  const raw = lecture.value?.text || ''
  if (!raw) return ''
  const hasHtml = /<\/?[a-z][^>]*>/i.test(raw)
  if (hasHtml) return sanitizeHtml(raw)
  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const escaped = escapeHtml(block).replace(/\n/g, '<br>')
      return `<p>${escaped}</p>`
    })
    .join('')
})

// ── Видео ─────────────────────────────────────────────────────
const video = computed(() => {
  const raw = lecture.value?.videoLink
  if (!raw) return null
  const url = String(raw).trim()
  if (!url) return null
  if (url.includes('facecast.net')) return { type: 'facecast', src: url }
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (ytMatch) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
      allow:
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    }
  }
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(url)) return { type: 'video', src: url }
  return { type: 'link', src: url }
})

const hasVideo = computed(() => !!video.value)

// ── Медиа ─────────────────────────────────────────────────────
const photos = computed(() => photoObjectUrls.value.filter(Boolean))

const heroPhoto = computed(() => {
  if (hasVideo.value) return null
  if (coverUrl.value) return coverUrl.value
  return photos.value[0] || null
})

const galleryPhotos = computed(() => {
  if (!hasVideo.value && !coverUrl.value && photos.value.length) {
    return photos.value.slice(1)
  }
  return photos.value
})

// ── Загрузка лекции ───────────────────────────────────────────
async function load() {
  setBackground({ url: '/backgrounds/bg_frame.jpg' })
  const key = decodeURIComponent(props.dbKey)
  const l = await store.getLectureByKey(key)
  if (!l) return
  lecture.value = l

  if (l.coverKey) {
    const blob = await idbGet('photos', l.coverKey)
    if (blob) coverUrl.value = URL.createObjectURL(blob)
    else if (l.cover) coverUrl.value = l.cover
  } else if (l.cover) {
    coverUrl.value = l.cover
  }

  const urls = []
  const sourcePhotos = Array.isArray(l.photos) ? l.photos : []
  for (const p of sourcePhotos) {
    if (typeof p === 'string') { urls.push(p); continue }
    if (!p || typeof p !== 'object') continue
    const photoKey = p.key || p.idbKey || p.name
    const photoUrl = p.url || p.src || p.link
    if (photoKey) {
      const blob = await idbGet('photos', photoKey)
      if (blob) { urls.push(URL.createObjectURL(blob)); continue }
    }
    if (photoUrl) { urls.push(photoUrl); continue }
    if (!store.online) urls.push(null)
  }
  photoObjectUrls.value = urls
}

// ▼ ДОБАВЛЕНО: обработка нового формата результата markRead ▼
async function onRead() {
  if (!lecture.value) return
  if (!canMarkRead.value) {
    toast.warn('Отметить прочитанное можно только после согласия на обработку данных')
    return
  }
  if (!isToday.value) {
    toast.warn('Отметить можно только в день публикации')
    return
  }

  const result = await store.markRead(lecture.value)
  if (!result?.done) {
    if (result?.reason === 'ALREADY_READ') toast.info('Уже отмечено')
    return
  }
  if (result.queued) {
    toast.info('Отмечено. Награда будет зачислена после подключения к сети.')
    return
  }
  if (result.limitReached) {
    toast.warn(
      'Дневной лимит наград по этому типу исчерпан. Награда за действия начнёт начисляться завтра.',
      { duration: 6000 },
    )
    return
  }
  if (result.rewardPoints > 0) {
    toast.success(`+${result.rewardPoints} яблок`)
    return
  }
  toast.success('Отмечено как прочитанное')
}

onMounted(load)
onBeforeUnmount(() => {
  if (coverUrl.value?.startsWith('blob:')) URL.revokeObjectURL(coverUrl.value)
  photoObjectUrls.value.forEach((u) => {
    if (u && u.startsWith('blob:')) URL.revokeObjectURL(u)
  })
})

function viewClick(event) {
  console.log(event)
}
</script>

<style scoped>
/* … стили из оригинала без изменений … */
.crumb { margin: 6px 0 6px; font-size: 13px; }
.lecture h1 {
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 20px;
  line-height: 120%;
  letter-spacing: -0.01em;
  text-wrap: balance;
  color: #21271f;
}
.lead { font-size: 15px; margin: 0 0 14px; }

.facecast-wrap { margin: 0 0 16px; }
.media-hero {
  margin: 0 0 16px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #000;
}
.media-hero.cover-wrap { background: #f2f2f2; aspect-ratio: 16 / 10; }
.cover-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.video-embed { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; }
.video-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.video { width: 100%; display: block; background: #000; }
.video-link {
  display: flex; align-items: center; justify-content: center;
  padding: 40px 20px; background: #21271f; color: #fff;
  font-weight: 600; text-decoration: none; font-size: 16px;
}
.video-link:hover { background: #2c332a; }
.media-offline {
  margin: 0; padding: 10px 14px; background: #FFF8EC;
  color: #b58500; font-size: 13px; text-align: center;
}

.lecture-text {
  font-family: var(--font-family); font-weight: 400;
  font-size: 14px; line-height: 130%; letter-spacing: -0.01em;
  color: #21271f;
}
.lecture-text :deep(p) { margin: 0 0 12px; }
.lecture-text :deep(p:last-child) { margin-bottom: 0; }
.lecture-text :deep(h2) {
  font-size: 19px; font-weight: 700; margin: 18px 0 8px;
  line-height: 1.25; letter-spacing: -0.01em;
}
.lecture-text :deep(h3) {
  font-size: 16px; font-weight: 700; margin: 14px 0 6px; line-height: 1.3;
}
.lecture-text :deep(h2:first-child),
.lecture-text :deep(h3:first-child) { margin-top: 0; }
.lecture-text :deep(ul),
.lecture-text :deep(ol) { margin: 0 0 12px; padding-left: 22px; }
.lecture-text :deep(li) { margin-bottom: 4px; }
.lecture-text :deep(li:last-child) { margin-bottom: 0; }
.lecture-text :deep(a) {
  color: var(--accent); text-decoration: underline;
  text-underline-offset: 2px; overflow-wrap: anywhere;
}
.lecture-text :deep(strong),
.lecture-text :deep(b) { font-weight: 700; }
.lecture-text :deep(em),
.lecture-text :deep(i) { font-style: italic; }
.lecture-text :deep(img) {
  max-width: 100%; height: auto; border-radius: var(--radius);
  margin: 12px 0; display: block;
}
.lecture-text :deep(blockquote) {
  margin: 12px 0; padding: 4px 0 4px 12px;
  border-left: 3px solid var(--accent);
  color: var(--muted); font-style: italic;
}
.lecture-text :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em; background: #f2f2f2;
  padding: 2px 6px; border-radius: 4px;
}
.lecture-text :deep(pre) {
  background: #f2f2f2; padding: 12px; border-radius: 8px;
  overflow-x: auto; font-size: 13px; line-height: 1.5;
}
.lecture-text :deep(pre code) { background: transparent; padding: 0; }
.lecture-text :deep(hr) {
  border: none; border-top: 1px solid var(--border); margin: 16px 0;
}

.photos { margin: 16px 0; display: grid; gap: 10px; }
.photo { width: 100%; border-radius: var(--radius); display: block; }
.photos-slider { margin: 16px 0; border-radius: var(--radius); overflow: hidden; }
.photo-swiper {
  --swiper-pagination-color: #fff;
  --swiper-pagination-bullet-inactive-color: rgba(255, 255, 255, .55);
  --swiper-pagination-bullet-inactive-opacity: 1;
  --swiper-pagination-bullet-size: 7px;
  --swiper-pagination-bottom: 10px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #f2f2f2;
}
.photo-slide {
  display: flex; align-items: center; justify-content: center;
  background: #f2f2f2;
}
.photo-slide .photo {
  width: 100%; height: auto; max-height: 70vh;
  object-fit: contain; border-radius: 0;
}
.photo-swiper :deep(.swiper-pagination) {
  text-shadow: 0 1px 3px rgba(0,0,0,.5);
}

.footer { margin-top: 24px; text-transform: lowercase; }
.read-state {
  font-family: var(--second-family); font-weight: 700;
  font-size: 14px; line-height: 100%; color: #21271f; margin-bottom: 8px;
}
.read-state-done {
  display: flex; gap: 4px;
  font-family: var(--second-family); font-weight: 700;
  font-size: 14px; line-height: 100%; color: #21271f; margin-bottom: 8px;
}
.read-state-ok {
  display: grid; gap: 4px; border-radius: 14px;
  padding: 14px; background: #f1fbd6;
}
.read-state-ok-title {
  font-family: var(--font-family); font-weight: 500;
  font-size: 14px; line-height: 130%;
  letter-spacing: -0.01em; color: #015f01;
}
.read-state-ok-text {
  font-family: var(--font-family); font-weight: 400;
  font-size: 12px; line-height: 130%;
  letter-spacing: -0.01em; color: #015f01;
}
.read-btn { width: 100%; max-width: unset; }
.old-note { font-size: 13px; }

.skeleton-wrap { margin-top: 16px; }
.sk-line { height: 14px; background: #eee; border-radius: 6px; margin-bottom: 10px; }
.sk-line--title { height: 20px; width: 45%; }
.sk-line.short { width: 60%; }
</style>