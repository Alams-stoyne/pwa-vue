import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'

import {
  articlesForThemeDate,
  generalForDate,
  usefulForDate,
  archiveForTheme,
  tasksForThemeDate,
  personalStats,
  globalStats,
  generalLectures,
  themeLectures,
  chargingLectures,
} from './data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─────────────── Файлы хранилищ ───────────────
const BINDINGS_FILE         = path.join(__dirname, '.bindings.json')
const UID_BINDINGS_FILE     = path.join(__dirname, '.uid_bindings.json')
const STATES_FILE           = path.join(__dirname, '.states.json')
const READS_FILE            = path.join(__dirname, '.reads.json')
const TASKS_FILE            = path.join(__dirname, '.tasks.json')
const HABITS_FILE           = path.join(__dirname, '.habits.json')
const SUBSCRIPTIONS_FILE    = path.join(__dirname, '.subscriptions.json')
const NOTIFICATIONS_FILE    = path.join(__dirname, '.notifications_log.json')
const PUSH_HISTORY_FILE     = path.join(__dirname, '.push_history.json')
const SUPPORT_FILE          = path.join(__dirname, '.support_tickets.json')
const REFLECTIONS_FILE      = path.join(__dirname, '.reflections.json')
const STEPS_LOG_FILE        = path.join(__dirname, '.steps_log.json')
const CONSENT_FILE          = path.join(__dirname, '.consent.json')
const HABIT_SELECTIONS_FILE = path.join(__dirname, '.habit_selections.json')

// ─────────────── VAPID-ключи ───────────────
const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const VAPID_PRIVATE_KEY =
  'I0_d0vnesxbBSUmlDdOKibGo6vEXRO-Vu88QlSlm5j0'
const VAPID_SUBJECT = 'mailto:admin@x5hd.ru'

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  console.log('[MOCK] web-push: VAPID set, public =', VAPID_PUBLIC_KEY.slice(0, 20), '…')
} catch (e) {
  console.warn('[MOCK] web-push setup failed:', e.message)
}

// ─────────────── Конфиг привычек по темам ───────────────
const HABITS_BY_THEME = {
  energy: [
    { id: 'water-energy',   icon: 'water',   title: 'Стакан воды',      emoji: '💧', hint: 'Выпейте стакан чистой воды',         timesPerDay: 3, minIntervalMin: 90 },
    { id: 'workout-energy', icon: 'workout', title: 'Разминка',         emoji: '🤸', hint: 'Потянитесь, разомните шею и плечи', timesPerDay: 3, minIntervalMin: 120 },
    { id: 'eyes-energy',    icon: 'eyes',    title: 'Отдохнуть глазам', emoji: '👀', hint: 'Посмотрите в даль 20 секунд',         timesPerDay: 3, minIntervalMin: 60 },
  ],
  antistress: [
    { id: 'water-antistress', icon: 'water', title: 'Стакан воды',      emoji: '💧', hint: 'Выпейте стакан чистой воды',         timesPerDay: 2, minIntervalMin: 120 },
    { id: 'eyes-antistress',  icon: 'eyes',  title: 'Отдохнуть глазам', emoji: '👀', hint: 'Посмотрите в даль 20 секунд',         timesPerDay: 3, minIntervalMin: 60 },
  ],
  body: [
    { id: 'workout-body', icon: 'workout', title: 'Разминка',    emoji: '🤸', hint: 'Потянитесь, разомните шею и плечи', timesPerDay: 3, minIntervalMin: 120 },
    { id: 'water-body',   icon: 'water',   title: 'Стакан воды', emoji: '💧', hint: 'Выпейте стакан чистой воды',         timesPerDay: 2, minIntervalMin: 90 },
  ],
  balance: [
    { id: 'eyes-balance',  icon: 'eyes',  title: 'Отдохнуть глазам', emoji: '👀', hint: 'Посмотрите в даль 20 секунд',           timesPerDay: 2, minIntervalMin: 60 },
    { id: 'water-balance', icon: 'water', title: 'Стакан воды',      emoji: '💧', hint: 'Выпейте стакан чистой воды',           timesPerDay: 2, minIntervalMin: 90 },
  ],
}

const HABITS_FLAT = {}
for (const arr of Object.values(HABITS_BY_THEME)) {
  for (const h of arr) if (!HABITS_FLAT[h.id]) HABITS_FLAT[h.id] = h
}

const NIGHT_START_HOUR = 22
const NIGHT_END_HOUR   = 8
const FIRST_REMINDER_DELAY_H = 2

// ─────────────── Утилиты хранилищ ───────────────
function loadMap(file, { valueAsSet = false } = {}) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const obj = JSON.parse(raw)
    if (!obj || typeof obj !== 'object') return new Map()
    const map = new Map()
    for (const [key, value] of Object.entries(obj)) {
      if (valueAsSet) map.set(key, new Set(Array.isArray(value) ? value : []))
      else map.set(key, value)
    }
    return map
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn('[MOCK] read error in', path.basename(file), ':', e.message)
    }
    return new Map()
  }
}
function saveMap(file, map, { valueAsSet = false } = {}) {
  try {
    const obj = {}
    for (const [key, value] of map.entries()) {
      obj[key] = valueAsSet ? [...value] : value
    }
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8')
  } catch (e) {
    console.warn('[MOCK] write error in', path.basename(file), ':', e.message)
  }
}
function loadArray(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}
function saveArray(file, arr) {
  try {
    fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8')
  } catch (e) {
    console.warn('[MOCK] write error in', path.basename(file), ':', e.message)
  }
}

// ─────────────── Загрузка хранилищ ───────────────
const deviceBindings    = loadMap(BINDINGS_FILE)
const uidBindings       = loadMap(UID_BINDINGS_FILE)
const userStates        = loadMap(STATES_FILE)
const userReads         = loadMap(READS_FILE, { valueAsSet: true })
const userTasks         = loadMap(TASKS_FILE, { valueAsSet: true })
const userHabits        = loadMap(HABITS_FILE)
const pushSubscriptions = loadMap(SUBSCRIPTIONS_FILE)
const notificationLog   = loadMap(NOTIFICATIONS_FILE)
const userReflections   = loadMap(REFLECTIONS_FILE)
const userConsents      = loadMap(CONSENT_FILE)
const habitSelections   = loadMap(HABIT_SELECTIONS_FILE)

if (deviceBindings.size)    console.log('[MOCK] загружено привязок устройств:', deviceBindings.size)
if (pushSubscriptions.size) console.log('[MOCK] загружено push-подписок:', pushSubscriptions.size)
if (userConsents.size)      console.log('[MOCK] загружено согласий:', userConsents.size)
if (habitSelections.size)   console.log('[MOCK] загружено выборов привычек:', habitSelections.size)

// ─────────────── HTTP-утилиты ───────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => resolve(body))
  })
}
function json(res, obj, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(obj))
}
function serverNow() { return new Date().toISOString() }
function localDateStr(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function lastNDates(n) {
  const out = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    out.push(localDateStr(d))
  }
  return out
}

const UID_RE = /^[a-f0-9]{40}$/i
function isValidUid(uid) { return typeof uid === 'string' && UID_RE.test(uid) }

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 10
const rateBuckets = new Map()
function checkRate(key) {
  const now = Date.now()
  const bucket = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (bucket.length >= RATE_MAX) {
    const retryAfterMs = RATE_WINDOW_MS - (now - bucket[0])
    rateBuckets.set(key, bucket)
    return { ok: false, retryAfterMs }
  }
  bucket.push(now)
  rateBuckets.set(key, bucket)
  return { ok: true }
}

function reconcileBindings() {
  for (const [uid, binding] of uidBindings.entries()) {
    const known = deviceBindings.get(binding.deviceId)
    if (known !== uid) deviceBindings.set(binding.deviceId, uid)
  }
  for (const [deviceId, uid] of deviceBindings.entries()) {
    if (!uidBindings.has(uid)) {
      uidBindings.set(uid, {
        deviceId, idUser: uid,
        createdAt: Date.now(), lastSeenAt: Date.now(),
      })
    }
  }
}

function addPushHistory(entry) {
  const history = loadArray(PUSH_HISTORY_FILE)
  history.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    ts: Date.now(),
    ...entry,
  })
  if (history.length > 200) history.length = 200
  saveArray(PUSH_HISTORY_FILE, history)
}

async function sendPushTo(userId, subscription, payload) {
  try {
    const result = await webpush.sendNotification(subscription, payload)
    console.log('[MOCK] push ok →', String(userId).slice(0, 8), '…', 'status =', result.statusCode)
    return { ok: true, statusCode: result.statusCode }
  } catch (err) {
    console.error('[MOCK] push send error:', {
      userId: String(userId).slice(0, 8) + '…',
      statusCode: err.statusCode,
      body: err.body,
      message: err.message,
      endpoint: String(subscription.endpoint || '').slice(0, 60) + '…',
    })
    return {
      ok: false,
      statusCode: err.statusCode,
      body: err.body,
      message: err.message,
      gone: err.statusCode === 404 || err.statusCode === 410,
    }
  }
}

// ─────────────── Планировщик напоминаний ───────────────
let schedulerStarted = false
let schedulerTimer = null

function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime() }
function isNightTime() {
  const h = new Date().getHours()
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR
}

async function checkHabitReminders() {
  if (isNightTime()) return
  const now = Date.now()
  const today = localDateStr()
  const dayStart = startOfDay(now)
  const firstReminderAt = dayStart + FIRST_REMINDER_DELAY_H * 60 * 60 * 1000
  if (now < firstReminderAt) return

  for (const [uid, habitsData] of userHabits.entries()) {
    const subscription = pushSubscriptions.get(uid)
    if (!subscription) continue

    const selectedId = habitSelections.get(uid)
    if (!selectedId) continue
    const cfg = HABITS_FLAT[selectedId]
    if (!cfg) continue

    const consent = userConsents.get(uid)
    if (consent && consent.granted === false) continue

    const list = Array.isArray(habitsData[selectedId]) ? habitsData[selectedId] : []
    const todayList = list.filter((iso) => String(iso).slice(0, 10) === today)
    if (todayList.length >= cfg.timesPerDay) continue

    const lastDoneAt = todayList.length
      ? new Date(todayList[todayList.length - 1]).getTime()
      : 0
    const baseline = lastDoneAt || firstReminderAt
    const minIntervalMs = cfg.minIntervalMin * 60 * 1000
    if (now - baseline < minIntervalMs) continue

    const logKey = `${uid}:${selectedId}`
    const lastNotifiedAt = Number(notificationLog.get(logKey) || 0)
    if (lastNotifiedAt && now - lastNotifiedAt < minIntervalMs) continue

    const payload = JSON.stringify({
      title: cfg.title, body: cfg.hint,
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
      url: '/', tag: `habit-${selectedId}`,
    })
    const result = await sendPushTo(uid, subscription, payload)
    if (result.ok) {
      notificationLog.set(logKey, now)
      saveMap(NOTIFICATIONS_FILE, notificationLog)
      addPushHistory({
        type: 'habit-auto', target: uid, habitId: selectedId,
        title: cfg.title, body: cfg.hint, url: '/',
        status: result.statusCode,
      })
    } else if (result.gone) {
      pushSubscriptions.delete(uid)
      saveMap(SUBSCRIPTIONS_FILE, pushSubscriptions)
    }
  }
}

function startHabitScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true
  setTimeout(() => {
    checkHabitReminders().catch((e) => console.warn('[MOCK] scheduler error:', e.message))
  }, 30_000)
  schedulerTimer = setInterval(() => {
    checkHabitReminders().catch((e) => console.warn('[MOCK] scheduler error:', e.message))
  }, 60_000)
  console.log('[MOCK] планировщик напоминаний запущен (интервал 60 с)')
}

// ─────────────── AUTH ───────────────
function handleAuthRegister(req, res, payload) {
  const uid = String(payload.UID || '').trim()
  const deviceId = String(payload.DEVICE_ID || '').trim()
  const deviceIdCreatedAt = Number(payload.DEVICE_ID_CREATED_AT || 0) || 0
  const deviceRotatedAt = Number(payload.DEVICE_ROTATED_AT || 0) || 0
  const ip = (req.socket && req.socket.remoteAddress) || 'unknown'

  console.log('[MOCK] /auth UID =', uid.slice(0, 12), '… DEVICE_ID =', deviceId.slice(0, 12), '…')

  if (!uid || !deviceId) return json(res, { RESULT: 'ERROR', ID_USER: null })
  if (!isValidUid(uid)) return json(res, { RESULT: 'UID_NOT_FOUND', ID_USER: null })

  const rl1 = checkRate(`device:${deviceId}`)
  const rl2 = checkRate(`ip:${ip}`)
  if (!rl1.ok || !rl2.ok) {
    const retryAfterMs = Math.max(rl1.retryAfterMs || 0, rl2.retryAfterMs || 0)
    return json(res, { RESULT: 'RATE_LIMITED', RETRY_AFTER_MS: retryAfterMs, ID_USER: null })
  }

  const uidBinding = uidBindings.get(uid)
  if (uidBinding && uidBinding.deviceId !== deviceId) {
    const rotatedRecently = deviceRotatedAt > 0 && Date.now() - deviceRotatedAt < 60_000
    if (rotatedRecently) {
      return json(res, { RESULT: 'DEVICE_ROTATED', TAKEN_UID: uid, ID_USER: null })
    }
    return json(res, { RESULT: 'UID_TAKEN', TAKEN_UID: uid, ID_USER: null })
  }

  const deviceBoundUid = deviceBindings.get(deviceId)
  if (deviceBoundUid && deviceBoundUid !== uid) {
    return json(res, { RESULT: 'UID_LOCKED', LOCKED_UID: deviceBoundUid, ID_USER: null })
  }

  const now = Date.now()
  if (!uidBinding) {
    uidBindings.set(uid, {
      deviceId, idUser: uid, createdAt: now, lastSeenAt: now,
      deviceCreatedAt: deviceIdCreatedAt || now,
    })
  } else {
    uidBinding.lastSeenAt = now
  }
  if (!deviceBoundUid) deviceBindings.set(deviceId, uid)
  saveMap(BINDINGS_FILE, deviceBindings)
  saveMap(UID_BINDINGS_FILE, uidBindings)

  const state = userStates.get(uid) || null
  const reads = userReads.get(uid) ? [...userReads.get(uid)] : []
  const tasks = userTasks.get(uid) ? [...userTasks.get(uid)] : []
  const habits = userHabits.get(uid) || {}
  const consent = userConsents.get(uid) || null
  const habitId = habitSelections.get(uid) || null

  return json(res, {
    RESULT: 'OK', ID_USER: uid,
    STATE: state, READS: reads, TASKS: tasks, HABITS: habits,
    CONSENT: consent, HABIT_ID: habitId,
  })
}

// ─────────────── ADMIN ───────────────
function handleAdmin(req, res, pathname, payload) {
  if (pathname === '/mock/admin/reset-uid') {
    const uid = String(payload.UID || '').trim()
    if (!uid) return json(res, { RESULT: 'ERROR', MESSAGE: 'UID required' }, 400)
    const binding = uidBindings.get(uid)
    if (binding) {
      deviceBindings.delete(binding.deviceId)
      uidBindings.delete(uid)
      saveMap(BINDINGS_FILE, deviceBindings)
      saveMap(UID_BINDINGS_FILE, uidBindings)
    }
    return json(res, { RESULT: 'OK' })
  }
  if (pathname === '/mock/admin/reset-device') {
    const deviceId = String(payload.DEVICE_ID || '').trim()
    if (!deviceId) return json(res, { RESULT: 'ERROR', MESSAGE: 'DEVICE_ID required' }, 400)
    const uid = deviceBindings.get(deviceId)
    if (uid) {
      deviceBindings.delete(deviceId)
      uidBindings.delete(uid)
      saveMap(BINDINGS_FILE, deviceBindings)
      saveMap(UID_BINDINGS_FILE, uidBindings)
    }
    return json(res, { RESULT: 'OK' })
  }
  if (pathname === '/mock/admin/reset-all') {
    deviceBindings.clear()
    uidBindings.clear()
    saveMap(BINDINGS_FILE, deviceBindings)
    saveMap(UID_BINDINGS_FILE, uidBindings)
    return json(res, { RESULT: 'OK' })
  }
  if (pathname === '/mock/admin/state') {
    return json(res, {
      RESULT: 'OK',
      DEVICES: deviceBindings.size,
      UIDS: uidBindings.size,
      SUBSCRIPTIONS: pushSubscriptions.size,
      CONSENTS: userConsents.size,
      SELECTIONS: habitSelections.size,
      BINDINGS: [...uidBindings.entries()].map(([uid, b]) => ({
        uid: uid.slice(0, 12) + '…',
        fullUid: uid,
        deviceId: String(b.deviceId).slice(0, 12) + '…',
        createdAt: b.createdAt,
        lastSeenAt: b.lastSeenAt,
      })),
    })
  }
  if (pathname === '/mock/admin/subscribers' && req.method === 'GET') {
    return json(res, {
      RESULT: 'OK',
      SUBSCRIBERS: [...pushSubscriptions.entries()].map(([uid, sub]) => ({
        uid,
        shortUid: uid.slice(0, 12) + '…',
        endpoint: String(sub.endpoint || '').slice(0, 60) + '…',
        lastSeenAt: uidBindings.get(uid)?.lastSeenAt || 0,
        hasHabits: !!userHabits.get(uid),
        habitsCount: userHabits.get(uid)
          ? Object.values(userHabits.get(uid)).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0)
          : 0,
        consent: userConsents.get(uid)?.granted ?? null,
        selectedHabit: habitSelections.get(uid) || null,
      })),
    })
  }
  if (pathname === '/mock/admin/push-history' && req.method === 'GET') {
    return json(res, { RESULT: 'OK', HISTORY: loadArray(PUSH_HISTORY_FILE) })
  }
  if (pathname === '/mock/admin/clear-history' && req.method === 'POST') {
    saveArray(PUSH_HISTORY_FILE, [])
    return json(res, { RESULT: 'OK' })
  }
  if (pathname === '/mock/admin/support-tickets' && req.method === 'GET') {
    return json(res, { RESULT: 'OK', TICKETS: loadArray(SUPPORT_FILE) })
  }
  if (pathname === '/mock/admin/reflections' && req.method === 'GET') {
    return json(res, {
      RESULT: 'OK',
      REFLECTIONS: [...userReflections.entries()].map(([uid, list]) => ({
        uid,
        shortUid: uid.slice(0, 12) + '…',
        count: Array.isArray(list) ? list.length : 0,
        lastSentAt: Array.isArray(list) && list.length ? list[list.length - 1] : null,
      })),
    })
  }
  if (pathname === '/mock/admin/steps-log' && req.method === 'GET') {
    return json(res, { RESULT: 'OK', STEPS: loadArray(STEPS_LOG_FILE) })
  }
  if (pathname === '/mock/admin/consent' && req.method === 'GET') {
    return json(res, {
      RESULT: 'OK',
      CONSENTS: [...userConsents.entries()].map(([uid, c]) => ({
        uid,
        shortUid: uid.slice(0, 12) + '…',
        granted: !!c.granted,
        at: c.at,
      })),
    })
  }
  if (pathname === '/mock/admin/habit-selections' && req.method === 'GET') {
    return json(res, {
      RESULT: 'OK',
      SELECTIONS: [...habitSelections.entries()].map(([uid, id]) => ({
        uid,
        shortUid: uid.slice(0, 12) + '…',
        habitId: id,
      })),
    })
  }
  return json(res, { RESULT: 'ERROR', MESSAGE: 'Unknown admin endpoint' }, 404)
}

// ─────────────── Плагин ───────────────
export function mockServerPlugin() {
  reconcileBindings()
  startHabitScheduler()

  const middleware = async (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    const method = req.method

    // ═══════════════════════════════════════════════════════════
    // CDN CONFIG — статические JSON-файлы
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/cdn/config/themes.json' && method === 'GET') {
      console.log('[MOCK] /cdn/config/themes.json')
      return json(res, [
        {
          id: 'energy', name: 'Энергия', subtitle: 'Заряд и продуктивность',
          description: 'Как восстанавливать силы, держать тонус и продуктивно работать весь день без выгорания.',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          videoDescription: 'Короткий обзор направления «Энергия».',
          backgroundImage: '/backgrounds/theme-energy.jpg',
          ThemeMascot: '',
        },
        {
          id: 'antistress', name: 'Антистресс', subtitle: 'Спокойствие и устойчивость',
          description: 'Практики и короткие материалы для управления стрессом.',
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
          videoDescription: 'О направлении «Антистресс».',
          backgroundImage: '/backgrounds/theme-antistress.jpg',
          ThemeMascot: '',
        },
        {
          id: 'body', name: 'Тело', subtitle: 'Движение и здоровье',
          description: 'Физическая активность, восстановление и забота о теле.',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          videoDescription: 'О направлении «Тело».',
          backgroundImage: '/backgrounds/theme-body.jpg',
          ThemeMascot: '_v2',
        },
        {
          id: 'balance', name: 'Баланс', subtitle: 'Работа и жизнь',
          description: 'Как совмещать работу и личные интересы без выгорания.',
          videoUrl: 'https://www.w3schools.com/html/movie.mp4',
          videoDescription: 'О направлении «Баланс».',
          backgroundImage: '/backgrounds/theme-balance.jpg',
          ThemeMascot: '_balance',
        },
      ])
    }

    if (pathname === '/mock/cdn/config/habits.json' && method === 'GET') {
      console.log('[MOCK] /cdn/config/habits.json')
      return json(res, HABITS_BY_THEME)
    }

    if (pathname === '/mock/cdn/config/quiz_theme.json' && method === 'GET') {
      console.log('[MOCK] /cdn/config/quiz_theme.json')
      return json(res, {
        QUESTIONS: [
          {
            id: 'q1', text: 'Как вы обычно проводите свободное время?',
            answers: [
              { text: 'Разбираюсь в новом, читаю, учусь',  weights: { energy: 2, antistress: 1 } },
              { text: 'Планирую, думаю о работе и целях',  weights: { balance: 2 } },
              { text: 'Спорт, прогулки, забота о теле',    weights: { body: 2 } },
              { text: 'Отдыхаю, медитирую, замедляюсь',    weights: { antistress: 2 } },
            ],
          },
          {
            id: 'q2', text: 'Что чаще всего привлекает ваше внимание в новостях?',
            answers: [
              { text: 'Новые открытия и идеи',       weights: { energy: 2 } },
              { text: 'Работа, карьера, отношения',  weights: { balance: 2 } },
              { text: 'Здоровье и физическая форма', weights: { body: 2 } },
              { text: 'Психология и спокойствие',    weights: { antistress: 2 } },
            ],
          },
          {
            id: 'q3', text: 'Что для вас важнее в работе?',
            answers: [
              { text: 'Интересные задачи и развитие',     weights: { energy: 2 } },
              { text: 'Гармония с личной жизнью',         weights: { balance: 2 } },
              { text: 'Хорошее самочувствие',             weights: { body: 2 } },
              { text: 'Спокойная атмосфера, без стресса', weights: { antistress: 2 } },
            ],
          },
          {
            id: 'q4', text: 'Идеальные выходные — это…',
            answers: [
              { text: 'Почитать, разобраться в новой теме', weights: { energy: 2 } },
              { text: 'Разложить планы и навести порядок',  weights: { balance: 2 } },
              { text: 'Тренировка и прогулка',              weights: { body: 2 } },
              { text: 'Тишина, книги, отдых',               weights: { antistress: 2 } },
            ],
          },
          {
            id: 'q5', text: 'Какой вопрос вызвал бы у вас любопытство?',
            answers: [
              { text: 'Как успевать больше без выгорания?',    weights: { energy: 2 } },
              { text: 'Как совместить работу и личную жизнь?', weights: { balance: 2 } },
              { text: 'Как улучшить сон и энергию тела?',      weights: { body: 2 } },
              { text: 'Как снизить тревогу и стресс?',         weights: { antistress: 2 } },
            ],
          },
          {
            id: 'q6', text: 'Какую проблему хотели бы решить в первую очередь?',
            answers: [
              { text: 'Больше сил и продуктивности',       weights: { energy: 2 } },
              { text: 'Навести порядок в делах и времени', weights: { balance: 2 } },
              { text: 'Поправить здоровье и привычки',     weights: { body: 2 } },
              { text: 'Найти спокойствие и равновесие',    weights: { antistress: 2 } },
            ],
          },
        ],
      })
    }

    if (pathname === '/mock/cdn/config/tutorial.json' && method === 'GET') {
      console.log('[MOCK] /cdn/config/tutorial.json')
      return json(res, {
        SLIDES: [
          {
            id: 'welcome',
            title: 'Добро пожаловать!',
            text: 'День здоровья — это ежедневные практики и материалы для заботы о себе. Всё в одном приложении, работает даже без интернета.',
            image: 'https://cdn.x5hd.ru/tutorial/welcome.jpg',
          },
          {
            id: 'habits',
            title: 'Ежедневные привычки',
            text: 'Отмечайте маленькие победы каждый день — мы напомним, когда придёт время. Прогресс сохраняется и доступен в статистике.',
            image: 'https://cdn.x5hd.ru/tutorial/habits.jpg',
          },
          {
            id: 'themes',
            title: 'Направления',
            text: 'Выберите то, что откликается — материалы, лекции и практики подстроятся под вас.',
            image: 'https://cdn.x5hd.ru/tutorial/themes.jpg',
          },
        ],
      })
    }

    if (pathname === '/mock/cdn/config/steps_rules.json' && method === 'GET') {
      console.log('[MOCK] /cdn/config/steps_rules.json')
      return json(res, {
        TITLE: 'Правила шагомера',
        INTRO: 'Записывайте шаги, чтобы участвовать в общем рейтинге и видеть свой прогресс.',
        SECTIONS: [
          { id: 'how', title: 'Как учитываются шаги', text: 'В зачёт идут только подтверждённые шаги. Данные принимаются один раз в сутки — вечером, когда вы уже знаете итог за день.' },
          { id: 'screens', title: 'Как приложить скриншоты', text: 'Сделайте скриншот из приложения-шагомера (Apple Health, Google Fit и т.п.) и приложите до 3 файлов. Они помогут модератору подтвердить данные.' },
          { id: 'limits', title: 'Ограничения', text: 'Максимум за один раз — 99 999 шагов. Явно завышенные значения могут быть отклонены.' },
          { id: 'update', title: 'Как быстро обновляется рейтинг', text: 'После отправки данные проверяются на стороне сервера. Обычно это занимает несколько минут.' },
          { id: 'consent', title: 'Согласие на обработку данных', text: 'Отправляя шаги, вы подтверждаете согласие на обработку персональных данных в рамках программы «День здоровья».' },
        ],
      })
    }

    if (pathname === '/mock/cdn/config/reflection.json' && method === 'GET') {
      console.log('[MOCK] /cdn/config/reflection.json')
      const phrases = [
        'Что сегодня получилось?',
        'За что вы себе благодарны?',
        'Что было сложным и почему?',
        'Что нового вы узнали о себе?',
        'Какое маленькое достижение сегодня?',
        'О чём вы думали чаще всего?',
        'Что помогло вам сегодня?',
      ]
      const titles = []
      const base = new Date()
      for (let i = -3; i <= 7; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() + i)
        titles.push({
          date: localDateStr(d),
          title: phrases[(i + 3 + phrases.length) % phrases.length],
        })
      }
      return json(res, { TITLES: titles })
    }

    // ═══════════════════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/auth' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      return handleAuthRegister(req, res, p)
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════

    if (pathname.startsWith('/mock/admin/')) {
      if (method === 'GET') return handleAdmin(req, res, pathname, {})
      if (method === 'POST') {
        const body = await readBody(req)
        let p = {}
        try { p = JSON.parse(body) } catch {}
        return handleAdmin(req, res, pathname, p)
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CONSENT
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/consent/status' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)
      const c = userConsents.get(uid) || null
      return json(res, { RESULT: 'OK', CONSENT: c })
    }

    if (pathname === '/mock/consent' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      const granted = !!p.GRANTED
      if (!uid) return json(res, { RESULT: 'ERROR', MESSAGE: 'no user' }, 400)
      const at = serverNow()
      userConsents.set(uid, { granted, at })
      saveMap(CONSENT_FILE, userConsents)
      console.log('[MOCK] /consent UID =', String(uid).slice(0, 8), '… granted =', granted)
      return json(res, { RESULT: 'OK', AT: at })
    }

    // ═══════════════════════════════════════════════════════════
    // HABITS: выбор и состояние
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/habits/selection' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)
      const habitId = habitSelections.get(uid) || null
      return json(res, { RESULT: 'OK', HABIT_ID: habitId })
    }

    if (pathname === '/mock/habits/select' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      const habitId = String(p.HABIT_ID || '').trim()
      if (!uid || !habitId) return json(res, { RESULT: 'ERROR', MESSAGE: 'invalid' }, 400)
      if (!HABITS_FLAT[habitId]) return json(res, { RESULT: 'ERROR', MESSAGE: 'unknown habit' }, 400)
      habitSelections.set(uid, habitId)
      saveMap(HABIT_SELECTIONS_FILE, habitSelections)
      console.log('[MOCK] /habits/select UID =', String(uid).slice(0, 8), '… →', habitId)
      return json(res, { RESULT: 'OK' })
    }

    if (pathname === '/mock/habits' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || p.UID || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)
      const habits = userHabits.get(uid) || {}
      console.log('[MOCK] /habits UID =', uid.slice(0, 12), '…')
      return json(res, { RESULT: 'OK', HABITS: habits })
    }

    if (pathname === '/mock/habit/complete' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      const habitId = p.HABIT_ID || ''
      const srv = serverNow()
      if (!uid || !habitId) return json(res, { RESULT: 'ERROR' }, 400)

      const userData = userHabits.get(uid) || {}
      const list = userData[habitId] || []
      const cfg = HABITS_FLAT[habitId]
      const today = localDateStr()
      const todayCount = list.filter((iso) => String(iso).slice(0, 10) === today).length

      if (cfg && todayCount >= cfg.timesPerDay) {
        console.log('[MOCK] /habit/complete LIMIT reached for', habitId)
        return json(res, { RESULT: 'LIMIT_REACHED', DONE_TODAY: todayCount, SERVER_DATETIME: srv })
      }

      list.push(srv)
      userData[habitId] = list
      userHabits.set(uid, userData)
      saveMap(HABITS_FILE, userHabits)

      notificationLog.set(`${uid}:${habitId}`, Date.now())
      saveMap(NOTIFICATIONS_FILE, notificationLog)

      const newCount = list.filter((iso) => String(iso).slice(0, 10) === today).length
      console.log('[MOCK] /habit/complete', habitId, '→ done today:', newCount)
      return json(res, { RESULT: 'OK', DONE_TODAY: newCount, SERVER_DATETIME: srv })
    }

    // ═══════════════════════════════════════════════════════════
    // TODAY — расширенное состояние действий дня
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/today' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)

      const today = localDateStr()

      const userState = userStates.get(uid) || null
      const theme = userState?.theme || userState?.THEME || 'default'

      const reads = userReads.get(uid) ? [...userReads.get(uid)] : []
      const themeReadsToday = reads.filter((k) => {
        const parts = String(k).split(':')
        return parts[0] === `lecture-${theme}` && parts[1] === today
      })
      const chargingReadsToday = reads.filter((k) => {
        const parts = String(k).split(':')
        return parts[0] === 'lecture-charging' && parts[1] === today
      })

      const tasks = userTasks.get(uid) ? [...userTasks.get(uid)] : []
      const tasksToday = tasks.filter((k) => String(k).split(':')[0] === today)

      const reflLog = Array.isArray(userReflections.get(uid)) ? userReflections.get(uid) : []
      const reflectionToday = reflLog.some((iso) => String(iso).slice(0, 10) === today)

      const stepsLog = loadArray(STEPS_LOG_FILE).filter(
        (e) => e.uid === uid && e.date === today
      )
      const stepsDone = stepsLog.length > 0
      const stepsApproved = stepsDone && stepsLog.every((e) => e.verified === true)
      const stepsRejected = stepsDone && stepsLog.some((e) => e.verified === false)

      const selectedId = habitSelections.get(uid)
      const habitCfg = selectedId ? HABITS_FLAT[selectedId] : null
      const habitsData = userHabits.get(uid) || {}
      let habitCount = 0
      if (habitCfg && selectedId) {
        const list = Array.isArray(habitsData[selectedId]) ? habitsData[selectedId] : []
        habitCount = list.filter((iso) => String(iso).slice(0, 10) === today).length
      }

      const actions = {
        lecture: {
          done: themeReadsToday.length > 0,
          exists: true,
          label: 'Лекция',
          emoji: '📖',
        },
        practice: {
          done: tasksToday.length > 0,
          exists: true,
          label: 'Практика',
          emoji: '🎯',
        },
        charging: {
          done: chargingReadsToday.length > 0,
          exists: true,
          label: 'Зарядка',
          emoji: '⚡',
        },
        reflection: {
          done: reflectionToday,
          exists: true,
          label: 'Рефлексия',
          emoji: '✍️',
        },
        steps: {
          done: stepsDone,
          exists: true,
          label: 'Шаги',
          emoji: '🚶',
          status: !stepsDone
            ? 'none'
            : stepsApproved
              ? 'approved'
              : stepsRejected
                ? 'rejected'
                : 'pending',
        },
        habit: {
          done: habitCount >= 1,
          exists: !!habitCfg,
          label: 'Привычка',
          emoji: '✨',
        },
      }

      const entries = Object.values(actions).filter((a) => a.exists)
      const total = entries.length
      const done = entries.filter((a) => a.done).length
      const percent = total > 0 ? Math.round((done / total) * 100) : 0
      const allDone = total > 0 && done === total

      let title = 'Продолжайте в том же духе'
      let description = `Выполнено ${done} из ${total} действий дня`

      if (allDone) {
        title = 'Все дела на сегодня закрыты'
        description = 'Отличная работа! Возвращайтесь завтра.'
      } else if (done === 0) {
        title = 'Доброе утро!'
        description = 'Начните день с маленького шага.'
      }

      console.log('[MOCK] /today UID =', String(uid).slice(0, 8),
                  '… theme =', theme, 'done =', done, '/', total)

      return json(res, {
        RESULT: 'OK',
        TODAY: {
          id: `day-${today}`,
          date: today,
          state: allDone ? 'done' : 'active',
          title,
          description,
          progress: { done, total, percent },
          actions,
        },
      })
    }

    // ═══════════════════════════════════════════════════════════
    // PUSH
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/push/subscribe' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER, subscription } = p
      if (!ID_USER || !subscription || !subscription.endpoint) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'Invalid payload' }, 400)
      }
      pushSubscriptions.set(ID_USER, subscription)
      saveMap(SUBSCRIPTIONS_FILE, pushSubscriptions)
      console.log('[MOCK] /push/subscribe', String(ID_USER).slice(0, 8), '…')
      return json(res, { RESULT: 'OK' })
    }

    if (pathname === '/mock/push/unsubscribe' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER } = p
      if (!ID_USER) return json(res, { RESULT: 'ERROR' }, 400)
      pushSubscriptions.delete(ID_USER)
      saveMap(SUBSCRIPTIONS_FILE, pushSubscriptions)
      return json(res, { RESULT: 'OK' })
    }

    if (pathname === '/mock/push/send' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER, title, body: msgBody, url, tag } = p
      if (!ID_USER || !title || !msgBody) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'Invalid payload' }, 400)
      }
      const subscription = pushSubscriptions.get(ID_USER)
      if (!subscription) {
        return json(res, { RESULT: 'NOT_FOUND', MESSAGE: 'User not subscribed' }, 404)
      }
      const payload = JSON.stringify({
        title, body: msgBody,
        icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
        url: url || '/', tag: tag || 'admin-push',
      })
      const result = await sendPushTo(ID_USER, subscription, payload)
      addPushHistory({
        type: 'send', target: ID_USER, title, body: msgBody,
        url: url || '/', status: result.statusCode,
      })
      if (!result.ok && result.gone) {
        pushSubscriptions.delete(ID_USER)
        saveMap(SUBSCRIPTIONS_FILE, pushSubscriptions)
      }
      return json(res, {
        RESULT: result.ok ? 'OK' : 'ERROR',
        STATUS: result.statusCode, MESSAGE: result.message,
      }, result.ok ? 200 : 500)
    }

    if (pathname === '/mock/push/broadcast' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { title, body: msgBody, url, tag } = p
      if (!title || !msgBody) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'Invalid payload' }, 400)
      }
      const payload = JSON.stringify({
        title, body: msgBody,
        icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
        url: url || '/', tag: tag || 'admin-broadcast',
      })
      let ok = 0, failed = 0
      const toRemove = []
      const errors = []
      for (const [userId, subscription] of pushSubscriptions.entries()) {
        const result = await sendPushTo(userId, subscription, payload)
        if (result.ok) ok++
        else {
          failed++
          errors.push({
            userId: String(userId).slice(0, 12) + '…',
            statusCode: result.statusCode,
            message: result.message,
          })
          if (result.gone) toRemove.push(userId)
        }
      }
      for (const u of toRemove) pushSubscriptions.delete(u)
      if (toRemove.length) saveMap(SUBSCRIPTIONS_FILE, pushSubscriptions)

      addPushHistory({
        type: 'broadcast', target: '*', title, body: msgBody, url: url || '/',
        sent: ok, failed, removed: toRemove.length,
      })
      console.log(`[MOCK] /push/broadcast → ok=${ok}, failed=${failed}, removed=${toRemove.length}`)
      return json(res, {
        RESULT: 'OK', SENT: ok, FAILED: failed, REMOVED: toRemove.length, ERRORS: errors,
      })
    }

    if (pathname === '/mock/push/vapid' && method === 'GET') {
      return json(res, {
        RESULT: 'OK', VAPID_PUBLIC_KEY, VAPID_SUBJECT,
        SUBSCRIPTIONS: pushSubscriptions.size,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // READS / TASKS
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/reads' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || p.UID || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)
      const reads = userReads.get(uid) ? [...userReads.get(uid)] : []
      console.log('[MOCK] /reads UID =', uid.slice(0, 12), '… count =', reads.length)
      return json(res, { RESULT: 'OK', READS: reads })
    }

    if (pathname === '/mock/tasks' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || p.UID || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)
      const tasks = userTasks.get(uid) ? [...userTasks.get(uid)] : []
      console.log('[MOCK] /tasks UID =', uid.slice(0, 12), '… count =', tasks.length)
      return json(res, { RESULT: 'OK', TASKS: tasks })
    }

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/state' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.UID || ''
      if (!uid) return json(res, { RESULT: 'ERROR' }, 400)
      console.log('[MOCK] /state UID =', uid.slice(0, 12), '…')
      userStates.set(uid, p.STATE || null)
      saveMap(STATES_FILE, userStates)
      return json(res, { RESULT: 'OK' })
    }

    // ═══════════════════════════════════════════════════════════
    // LECTURE READ / TASK COMPLETE
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/lecture/read' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      const idLecture = p.ID_LECTURE || ''
      const srv = serverNow()
      console.log('[MOCK] /lecture/read UID =', uid.slice(0, 12), '… ID_LECTURE =', idLecture)
      if (!uid || !idLecture) return json(res, { RESULT: 'ERROR' }, 400)
      const set = userReads.get(uid) || new Set()
      set.add(idLecture)
      userReads.set(uid, set)
      saveMap(READS_FILE, userReads, { valueAsSet: true })
      return json(res, { RESULT: 'OK', ID_READ: Date.now(), SERVER_DATETIME: srv })
    }

    if (pathname === '/mock/task/complete' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || ''
      const taskKey = p.ID_TASK || ''
      const srv = serverNow()
      console.log('[MOCK] /task/complete UID =', uid.slice(0, 12), '… ID_TASK =', taskKey)
      if (!uid || !taskKey) return json(res, { RESULT: 'ERROR' }, 400)
      const set = userTasks.get(uid) || new Set()
      set.add(taskKey)
      userTasks.set(uid, set)
      saveMap(TASKS_FILE, userTasks, { valueAsSet: true })
      return json(res, { RESULT: 'OK', ID_COMPLETE: Date.now(), SERVER_DATETIME: srv })
    }

    // ═══════════════════════════════════════════════════════════
    // STATS SYNC
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/stats/sync' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const uid = p.ID_USER || 'unknown'
      console.log('[MOCK] /stats/sync', uid.slice(0, 12), '…')

      const reads = userReads.get(uid) ? [...userReads.get(uid)] : []
      const byTheme = { energy: 0, antistress: 0, body: 0, balance: 0, general: 0, charging: 0 }
      const activeCounts = {}

      for (const dbKey of reads) {
        const m = String(dbKey).match(/^lecture-([a-z0-9_-]+):(\d{4}-\d{2}-\d{2}):/)
        if (!m) continue
        const bucket = m[1]
        if (bucket in byTheme) byTheme[bucket]++
        activeCounts[m[2]] = (activeCounts[m[2]] || 0) + 1
      }

      const taskKeys = userTasks.get(uid) ? [...userTasks.get(uid)] : []
      for (const k of taskKeys) {
        const d = String(k).split(':')[0]
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) activeCounts[d] = (activeCounts[d] || 0) + 1
      }

      const habitData = userHabits.get(uid) || {}
      let habitsTotal = 0
      const byHabit = {}
      for (const [habitId, list] of Object.entries(habitData)) {
        if (!Array.isArray(list)) continue
        habitsTotal += list.length
        byHabit[habitId] = (byHabit[habitId] || 0) + list.length
        for (const iso of list) {
          const d = String(iso).slice(0, 10)
          activeCounts[d] = (activeCounts[d] || 0) + 1
        }
      }

      const activeDays = Object.keys(activeCounts)
      let streak = 0
      const set = new Set(activeDays)
      const cursor = new Date()
      while (true) {
        if (set.has(localDateStr(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
        else break
      }

      const weekActivity = lastNDates(7).map((date) => ({
        date, count: activeCounts[date] || 0,
      }))

      return json(res, {
        RESULT: 'OK',
        LECTURES_READ: reads.length,
        TASKS_DONE: taskKeys.length,
        HABITS_DONE: habitsTotal,
        DAYS_ACTIVE: activeDays.length,
        STREAK: streak,
        BY_THEME: byTheme,
        BY_HABIT: byHabit,
        WEEK_ACTIVITY: weekActivity,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // CDN: общая статистика + контент
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/cdn/stats/global.json') {
      console.log('[MOCK] /stats/global')
      return json(res, globalStats())
    }

    const mTheme = pathname.match(/^\/mock\/cdn\/article\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mTheme) {
      console.log('[MOCK] /article', mTheme[1], mTheme[2])
      return json(res, articlesForThemeDate(mTheme[1], mTheme[2]))
    }
    if (/^\/mock\/cdn\/article\/\d{4}-\d{2}-\d{2}\.json$/.test(pathname)) {
      return json(res, { RESULT: 'NOT_FOUND' }, 404)
    }
    const mGen = pathname.match(/^\/mock\/cdn\/general\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mGen) return json(res, generalForDate(mGen[1]))
    const mUse = pathname.match(/^\/mock\/cdn\/useful\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mUse) return json(res, usefulForDate(mUse[1]))
    const mArch = pathname.match(/^\/mock\/cdn\/archive\/([a-z0-9_-]+)\.json$/)
    if (mArch) return json(res, archiveForTheme(mArch[1]))
    const mTaskContent = pathname.match(/^\/mock\/cdn\/tasks\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mTaskContent) {
      console.log('[MOCK] /tasks content', mTaskContent[1], mTaskContent[2])
      return json(res, tasksForThemeDate(mTaskContent[1], mTaskContent[2]))
    }

    const mLectCharging = pathname.match(/^\/mock\/cdn\/lectures\/charging\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mLectCharging) {
      console.log('[MOCK] /lectures charging', mLectCharging[1])
      return json(res, chargingLectures(mLectCharging[1]))
    }
    const mLectGeneral = pathname.match(/^\/mock\/cdn\/lectures\/general\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mLectGeneral) {
      console.log('[MOCK] /lectures general', mLectGeneral[1])
      return json(res, generalLectures(mLectGeneral[1]))
    }
    const mLectTheme = pathname.match(/^\/mock\/cdn\/lectures\/([a-z0-9_-]+)\/(\d{4}-\d{2}-\d{2})\.json$/)
    if (mLectTheme && !['general', 'charging'].includes(mLectTheme[1])) {
      console.log('[MOCK] /lectures', mLectTheme[1], mLectTheme[2])
      return json(res, themeLectures(mLectTheme[1], mLectTheme[2]))
    }

    // ═══════════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/profile' && method === 'POST') {
      const body = await readBody(req)
      console.log('[MOCK] /profile', body)
      return json(res, { RESULT: 'OK' })
    }

    // ═══════════════════════════════════════════════════════════
    // SUPPORT
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/support' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER, TEXT, IMAGES, CONSENT } = p
      if (!ID_USER) return json(res, { RESULT: 'ERROR', MESSAGE: 'no user' }, 400)
      if (!CONSENT) return json(res, { RESULT: 'ERROR', MESSAGE: 'consent required' }, 400)
      if (!TEXT || String(TEXT).trim().length === 0) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'empty text' }, 400)
      }
      if (String(TEXT).length > 5000) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'text too long' }, 400)
      }
      if (Array.isArray(IMAGES) && IMAGES.length > 5) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'too many images' }, 400)
      }
      const ticket = {
        id: 'ticket-' + Date.now(), ts: Date.now(),
        uid: ID_USER, text: String(TEXT).slice(0, 5000),
        imagesCount: Array.isArray(IMAGES) ? IMAGES.length : 0,
      }
      const tickets = loadArray(SUPPORT_FILE)
      tickets.unshift(ticket)
      if (tickets.length > 500) tickets.length = 500
      saveArray(SUPPORT_FILE, tickets)
      console.log('[MOCK] /support UID =', String(ID_USER).slice(0, 8), '…')
      return json(res, { RESULT: 'OK', TICKET_ID: ticket.id })
    }

    // ═══════════════════════════════════════════════════════════
    // REFLECTION
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/reflection/send' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER, TEXT } = p
      if (!ID_USER) return json(res, { RESULT: 'ERROR', MESSAGE: 'no user' }, 400)
      if (!TEXT || String(TEXT).trim().length === 0) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'empty text' }, 400)
      }
      if (String(TEXT).length > 2500) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'text too long' }, 400)
      }
      const today = localDateStr()
      const userLog = Array.isArray(userReflections.get(ID_USER))
        ? userReflections.get(ID_USER) : []
      const sentToday = userLog.some((iso) => String(iso).slice(0, 10) === today)
      if (sentToday) return json(res, { RESULT: 'ALREADY_SENT' })
      const iso = serverNow()
      userLog.push(iso)
      userReflections.set(ID_USER, userLog)
      saveMap(REFLECTIONS_FILE, userReflections)
      console.log('[MOCK] /reflection/send UID =', String(ID_USER).slice(0, 8), '…')
      return json(res, { RESULT: 'OK', SERVER_DATETIME: iso })
    }

    if (pathname === '/mock/reflection/status' && method === 'POST') {
      
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER } = p
      if (!ID_USER) return json(res, { RESULT: 'ERROR', MESSAGE: 'no user' }, 400)
      const today = localDateStr()
      const userLog = Array.isArray(userReflections.get(ID_USER))
        ? userReflections.get(ID_USER) : []
      const sentToday = userLog.some((iso) => String(iso).slice(0, 10) === today)
      const lastSentAt = userLog.length ? userLog[userLog.length - 1] : null
      return json(res, {
        RESULT: 'OK', SENT_TODAY: sentToday, LAST_SENT_AT: lastSentAt,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // STEPS: сводка
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/steps/summary' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER } = p
      if (!ID_USER) return json(res, { RESULT: 'ERROR', MESSAGE: 'no user' }, 400)

      const log = loadArray(STEPS_LOG_FILE)
      const userEntries = log.filter((e) => e.uid === ID_USER)
      const totalSteps = userEntries.reduce((s, e) => s + (Number(e.steps) || 0), 0)

      const today = localDateStr()
      const todaySteps = userEntries
        .filter((e) => e.date === today)
        .reduce((s, e) => s + (Number(e.steps) || 0), 0)

      const GOAL = 100000

      const totalsByUser = new Map()
      for (const e of log) {
        const cur = totalsByUser.get(e.uid) || 0
        totalsByUser.set(e.uid, cur + (Number(e.steps) || 0))
      }
      const sorted = [...totalsByUser.entries()].sort((a, b) => b[1] - a[1])
      const rank = sorted.findIndex(([uid]) => uid === ID_USER) + 1
      const totalUsers = sorted.length

      console.log('[MOCK] /steps/summary UID =', String(ID_USER).slice(0, 8),
                  '… total =', totalSteps, 'rank =', rank, '/', totalUsers)

      return json(res, {
        RESULT: 'OK',
        TOTAL_STEPS: totalSteps,
        GOAL,
        RANK: rank,
        TOTAL_USERS: totalUsers,
        TODAY_STEPS: todaySteps,
        TOP_PERCENT: 0,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // STEPS: отправка (авто-верификация)
    // ═══════════════════════════════════════════════════════════

    if (pathname === '/mock/steps' && method === 'POST') {
      const body = await readBody(req)
      let p = {}
      try { p = JSON.parse(body) } catch {}
      const { ID_USER, STEPS, IMAGES, CONSENT } = p
      if (!ID_USER) return json(res, { RESULT: 'ERROR', MESSAGE: 'no user' }, 400)
      if (!CONSENT) return json(res, { RESULT: 'ERROR', MESSAGE: 'consent required' }, 400)
      const steps = Number(STEPS)
      if (!Number.isFinite(steps) || steps < 0 || steps > 99999) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'invalid steps' }, 400)
      }
      if (Array.isArray(IMAGES) && IMAGES.length > 3) {
        return json(res, { RESULT: 'ERROR', MESSAGE: 'too many images' }, 400)
      }
      const entry = {
        id: 'steps-' + Date.now(),
        ts: Date.now(),
        date: localDateStr(),
        uid: ID_USER,
        steps: Math.round(steps),
        imagesCount: Array.isArray(IMAGES) ? IMAGES.length : 0,
        verified: true,             // авто-верификация
      }
      const list = loadArray(STEPS_LOG_FILE)
      list.unshift(entry)
      if (list.length > 1000) list.length = 1000
      saveArray(STEPS_LOG_FILE, list)
      console.log('[MOCK] /steps UID =', String(ID_USER).slice(0, 8), '… steps =', entry.steps)
      return json(res, { RESULT: 'OK', ENTRY_ID: entry.id })
    }

    next()
  }

  return {
    name: 'mock-server',
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}