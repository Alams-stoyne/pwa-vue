import { idbPut, idbGet, idbAll, idbDelete } from '../core/db'

/**
 * Сохранение лекции в IDB.
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

/**
 * Удаление лекции и всех её фото из IDB.
 */
export async function deleteLecture(dbKey) {
  const lecture = await idbGet('lectures', dbKey)
  if (!lecture) return

  // Удаляем фотографии
  for (const p of lecture.photos || []) {
    if (p.key) await idbDelete('photos', p.key)
  }
  if (lecture.coverKey) {
    await idbDelete('photos', lecture.coverKey)
  }

  // Удаляем саму лекцию
  await idbDelete('lectures', dbKey)
}

/**
 * Удаление всех лекций для конкретного bucket и даты (например, при 404).
 */
export async function deleteLecturesByBucketDate(bucket, date) {
  const existing = await idbLecturesByBucket(bucket, { onlyDate: date })
  for (const ext of existing) {
    await deleteLecture(ext.dbKey)
  }
}

/**
 * Сверка: удаляет из IDB те лекции, которых больше нет в списке с сервера.
 */
export async function cleanupLectures(bucket, date, items) {
  const validIds = new Set((items || []).map(it => String(it.ID_LECTURE)))
  const existing = await idbLecturesByBucket(bucket, { onlyDate: date })
  
  for (const ext of existing) {
    if (!validIds.has(ext.id)) {
      await deleteLecture(ext.dbKey)
    }
  }
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