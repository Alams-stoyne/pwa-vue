import { idbPut, idbGet, idbAll } from '../core/db'

/**
 * Сохранение лекции в IDB.
 *
 * dbKey формируется как `${bucket}:${date}:${id}` — это гарантирует,
 * что лекция с одинаковым ID_LECTURE, но за разные дни, не перезатрёт
 * предыдущую.
 */
export async function persistLecture(bucket, item, fallbackDate) {
  const id = String(item.ID_LECTURE)
  const publishedDate = item.DATE || fallbackDate || ''
  const dbKey = `${bucket}:${publishedDate}:${id}`

  const photoUrls = Array.isArray(item.PHOTOS) ? item.PHOTOS : []
  const photoKeys = []
  for (let i = 0; i < photoUrls.length; i++) {
    const url = photoUrls[i]
    const key = `${dbKey}#${i}`
    photoKeys.push({ key, url })
    const existing = await idbGet('photos', key)
    if (existing) continue
    try {
      const r = await fetch(url)
      if (!r.ok) continue
      await idbPut('photos', key, await r.blob())
    } catch { /* офлайн — докачаем позже */ }
  }

  if (item.COVER) {
    const coverKey = `${dbKey}#cover`
    const existing = await idbGet('photos', coverKey)
    if (!existing) {
      try {
        const r = await fetch(item.COVER)
        if (r.ok) await idbPut('photos', coverKey, await r.blob())
      } catch {}
    }
  }

  await idbPut('lectures', dbKey, {
    dbKey,
    id,
    bucket,
    publishedDate,
    title: item.TITLE || '',
    description: item.DESCRIPTION || '',
    cover: item.COVER || '',
    coverKey: item.COVER ? `${dbKey}#cover` : '',
    text: item.TEXT || '',
    videoLink: item.VIDEO_LINK || null,
    photos: photoKeys,
    rewardPoints: item.REWARD_POINTS || false,    
    savedAt: Date.now(),
  })
}

export async function idbLecturesByBucket(bucket, opts = {}) {
  const all = await idbAll('lectures')
  return all
    .filter((l) => l.bucket === bucket)
    .filter((l) => !opts.onlyDate || l.publishedDate === opts.onlyDate)
    .sort((a, b) => b.savedAt - a.savedAt)
}

export async function idbAllLectures() {
  const all = await idbAll('lectures')
  return all.sort((a, b) => {
    const byDate = (b.publishedDate || '').localeCompare(a.publishedDate || '')
    return byDate !== 0 ? byDate : b.savedAt - a.savedAt
  })
}

export async function getLecture(dbKey) {
  return idbGet('lectures', dbKey)
}