/**
 * По ссылке определяет провайдера и тип плеера.
 * Возвращает { provider, kind, src }:
 *   provider: 'youtube' | 'vk' | 'facecast' | 'file'
 *   kind:     'iframe'  | 'video'
 */
export function parseVideoUrl(url) {
  if (!url) return null
  const u = String(url).trim()
  if (!u) return null

  // Уже готовые embed-ссылки
  if (/youtube\.com\/embed\/|youtube-nocookie\.com\/embed\//i.test(u)) {
    return { provider: 'youtube', kind: 'iframe', src: u }
  }
  if (/vk\.com\/video_ext\.php/i.test(u)) {
    return { provider: 'vk', kind: 'iframe', src: u }
  }
  if (/facecast\.net\/w\//i.test(u)) {
    return { provider: 'facecast', kind: 'iframe', src: u }
  }

  // YouTube: watch?v=…, youtu.be/…, shorts/…
  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?[^#]*\bv=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
  )
  if (yt) {
    return {
      provider: 'youtube',
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${yt[1]}`,
    }
  }

  // VK: vk.com/video-123_456 или vkvideo.ru/video-123_456
  const vk = u.match(/vk(?:video)?\.(?:com|ru)\/video(-?\d+)_(\d+)/i)
  if (vk) {
    return {
      provider: 'vk',
      kind: 'iframe',
      src: `https://vk.com/video_ext.php?oid=${vk[1]}&id=${vk[2]}&hd=2`,
    }
  }

  // Facecast: facecast.net/video/xxxxx
  const fc = u.match(/facecast\.net\/video\/([A-Za-z0-9_-]+)/i)
  if (fc) {
    return {
      provider: 'facecast',
      kind: 'iframe',
      src: `https://facecast.net/w/${fc[1]}`,
    }
  }

  // Файл (mp4/webm/ogg/mov/m4v/hls)
  if (/\.(mp4|webm|ogg|ogv|mov|m4v|m3u8)(\?.*)?$/i.test(u)) {
    return { provider: 'file', kind: 'video', src: u }
  }

  // Фоллбэк — пробуем как файл
  return { provider: 'file', kind: 'video', src: u }
}