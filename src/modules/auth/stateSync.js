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
  }
}

export function applyState(state) {
  if (!state) return
  const { PROFILE, QUIZ, THEME } = state

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
  else localStorage.removeItem('theme.selected')
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

/**
 * Применить привычки с сервера.
 * Формат: { habitId: [ISO, ISO, ...] }
 * Оставляем только сегодняшние времена.
 */
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