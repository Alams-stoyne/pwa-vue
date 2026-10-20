/**
 * Утилиты работы с изображениями.
 * Сжимает картинку в браузере до разумного размера, чтобы
 * не отправлять на сервер оригиналы по 5–10 МБ.
 */

export function compressImage(
  file,
  { maxDim = 1600, quality = 0.8, mime = 'image/jpeg' } = {},
) {
  return new Promise(async (resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      return reject(new Error('not an image'))
    }
    try {
      const dataUrl = await readAsDataURL(file)
      const img = await loadImage(dataUrl)

      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL(mime, quality))
    } catch (e) {
      reject(e)
    }
  })
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}