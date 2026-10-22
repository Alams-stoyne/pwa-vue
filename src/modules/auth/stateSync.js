const API = import.meta.env.VITE_API_URL

function readLS(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v
  } catch { return fallback }
}

function readJSON(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

export function collectState() {
  const profile = readJSON('profile', {}) || {}
  const answers = readJSON('quiz.answers', [])
  return {
    PROFILE: {
      FIO: profile.fio || '',
      NICKNAME: profile.nickname || '',
      WORKPLACE: profile.workplace || '',
    },
    QUIZ: {
      DONE: readLS('quiz.done') === '1',
      RECOMMENDED: readLS('quiz.recommended') || null,
      ANSWERS: Array.isArray(answers) ? answers : [],
    },
    THEME: {
      SELECTED: readLS('theme.selected') || null,
    },
    TUTORIAL: {
      DONE: readLS('tutorial.done') === '1',
    },
    WELCOME_SEEN: readLS('onboarding.welcomeSeen') === '1',
    // ▼ ИСПРАВЛЕНО: правильный ключ, который использует habits/store.js
    HABIT_SELECTED: readLS('habits.selectedHabitId') || null,
    CONSENT: {
      ANSWERED: readLS('consent.answered') === '1',
      GRANTED: readLS('consent.granted') === '1',
      AT: readLS('consent.at') ? Number(readLS('consent.at')) : null,
    },
  }
}

export function applyState(state) {
  if (!state) return
  const { PROFILE, QUIZ, THEME, TUTORIAL, WELCOME_SEEN, HABIT_SELECTED, CONSENT } = state

  if (PROFILE) {
    const p = {
      fio: PROFILE.FIO || '',
      nickname: PROFILE.NICKNAME || '',
      workplace: PROFILE.WORKPLACE || '',
    }
    try { localStorage.setItem('profile', JSON.stringify(p)) } catch {}
  }

  if (QUIZ) {
    if (QUIZ.DONE) localStorage.setItem('quiz.done', '1')
    else localStorage.removeItem('quiz.done')

    if (QUIZ.RECOMMENDED) localStorage.setItem('quiz.recommended', QUIZ.RECOMMENDED)
    else localStorage.removeItem('quiz.recommended')

    if (Array.isArray(QUIZ.ANSWERS) && QUIZ.ANSWERS.length) {
      localStorage.setItem('quiz.answers', JSON.stringify(QUIZ.ANSWERS))
    } else {
      localStorage.removeItem('quiz.answers')
    }
  }

  if (THEME?.SELECTED) localStorage.setItem('theme.selected', THEME.SELECTED)
  else if (THEME) localStorage.removeItem('theme.selected')

  if (TUTORIAL?.DONE === true) localStorage.setItem('tutorial.done', '1')
  if (WELCOME_SEEN === true) localStorage.setItem('onboarding.welcomeSeen', '1')

  // ▼ ИСПРАВЛЕНО: пишем туда, откуда реально читает habits/store.js
  if (HABIT_SELECTED) {
    try {
      localStorage.setItem('habits.selectedHabitId', HABIT_SELECTED)
    } catch {}
  }

  if (CONSENT?.ANSWERED) {
    localStorage.setItem('consent.answered', '1')
    localStorage.setItem('consent.granted', CONSENT.GRANTED ? '1' : '0')
    if (CONSENT.AT) {
      const ts = typeof CONSENT.AT === 'number' ? CONSENT.AT : new Date(CONSENT.AT).getTime()
      if (Number.isFinite(ts)) localStorage.setItem('consent.at', String(ts))
    }
  }
}

export function applyReads(reads) {
  if (!Array.isArray(reads)) return
  try {
    localStorage.setItem('lectures.readKeys', JSON.stringify(reads))
  } catch {}
}

export function applyTasks(tasks) {
  if (!Array.isArray(tasks)) return
  try {
    localStorage.setItem('tasks.doneKeys', JSON.stringify(tasks))
  } catch {}
}

export function applyHabits(habits) {
  if (!habits || typeof habits !== 'object') return

  const today = (() => {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  })()

  const data = {}
  for (const [habitId, list] of Object.entries(habits)) {
    if (!Array.isArray(list)) continue
    const todays = list
      .filter((iso) => typeof iso === 'string' && iso.slice(0, 10) === today)
      .map((iso) => new Date(iso).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)

    data[habitId] = {
      count: todays.length,
      lastAt: todays.length ? todays[todays.length - 1] : 0,
    }
  }

  try {
    localStorage.setItem('habits.state', JSON.stringify({ date: today, data }))
  } catch {}
}

export async function pushState(uid) {
  if (!uid) return false
  try {
    const res = await fetch(`${API}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ UID: uid, STATE: collectState() }),
    })
    return res.ok
  } catch {
    return false
  }
}