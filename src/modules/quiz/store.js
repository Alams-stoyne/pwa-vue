import { defineStore } from 'pinia'
import { fetchQuestions } from './api'
import { questionsList, FALLBACK_QUESTIONS } from './questions'
import { getThemes } from '../theme/themes'
import { pushState } from '../auth/stateSync'
import { isOffline } from '../core/utils/network'

const LS_DONE  = 'quiz.done'
const LS_REC   = 'quiz.recommended'
const LS_ANSW  = 'quiz.answers'
const SS_STARTED = 'quiz.started'
const LS_QUESTIONS_CACHE = 'quiz.questionsCache'
const LS_QUESTIONS_CACHE_AT = 'quiz.questionsCacheAt'
const CACHE_TTL = 24 * 60 * 60 * 1000

function readLS(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v
  } catch { return fallback }
}
function readSS(key, fallback = null) {
  try {
    const v = sessionStorage.getItem(key)
    return v === null ? fallback : v
  } catch { return fallback }
}

export const useQuizStore = defineStore('quiz', {
  state: () => ({
    step: 0,
    answers: [],
    started: readSS(SS_STARTED) === '1',
    done: readLS(LS_DONE) === '1',
    recommended: readLS(LS_REC) || null,
    loadingQuestions: false,
    questionsError: null,
  }),

  getters: {
    total: () => {
      const list = questionsList.value.length
        ? questionsList.value
        : FALLBACK_QUESTIONS
      return list.length
    },
    current: (s) => {
      const list = questionsList.value.length
        ? questionsList.value
        : FALLBACK_QUESTIONS
      return list[s.step] || null
    },
    isFirst: (s) => s.step === 0,
    isLast: (s) => {
      const list = questionsList.value.length
        ? questionsList.value
        : FALLBACK_QUESTIONS
      return s.step >= list.length - 1
    },

    progress: (s) => {
      const list = questionsList.value.length
        ? questionsList.value
        : FALLBACK_QUESTIONS
      const total = list.length
      if (!total) return 0
      return Math.round((s.step / total) * 100)
    },

    picked: (s) => {
      const v = s.answers[s.step]
      return v === undefined || v === null ? -1 : v
    },

    canAdvance: (s) => {
      const v = s.answers[s.step]
      return v !== undefined && v !== null
    },

    hasRecommended: (s) => !!s.recommended,
  },

  actions: {
    /**
     * Загрузить вопросы теста с CDN.
     * @param {{ force?: boolean }} opts
     */
    async loadQuestions({ force = false } = {}) {
      // 1. Мгновенно применяем кеш, чтобы UI не мигал
      if (!questionsList.value.length) {
        const cached = readLS(LS_QUESTIONS_CACHE, null)
        if (cached) {
          try {
            const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
            if (Array.isArray(parsed) && parsed.length) {
              questionsList.value = parsed
            }
          } catch {}
        }
      }

      // 2. TTL
      const cachedAt = Number(localStorage.getItem(LS_QUESTIONS_CACHE_AT) || 0)
      const fresh = Date.now() - cachedAt < CACHE_TTL
      if (!force && fresh && questionsList.value.length) return true

      if (isOffline()) return false

      // 3. Сеть
      this.loadingQuestions = true
      this.questionsError = null
      try {
        const res = await fetchQuestions()
        // CDN отдаёт либо { QUESTIONS: [...] }, либо просто массив
        const questions = Array.isArray(res)
          ? res
          : (res && Array.isArray(res.QUESTIONS) ? res.QUESTIONS : null)

        if (questions && questions.length) {
          questionsList.value = questions
          try {
            localStorage.setItem(LS_QUESTIONS_CACHE, JSON.stringify(questions))
            localStorage.setItem(LS_QUESTIONS_CACHE_AT, String(Date.now()))
          } catch {}
          return true
        }
        return false
      } catch (e) {
        this.questionsError = e.message || 'Ошибка загрузки вопросов'
        return false
      } finally {
        this.loadingQuestions = false
      }
    },

    load() {
      this.done = readLS(LS_DONE) === '1'
      this.recommended = readLS(LS_REC) || null
      this.started = readSS(SS_STARTED) === '1'
      try {
        const raw = localStorage.getItem(LS_ANSW)
        const parsed = raw ? JSON.parse(raw) : []
        this.answers = Array.isArray(parsed) ? parsed : []
      } catch { this.answers = [] }
    },

    begin() {
      this.started = true
      try { sessionStorage.setItem(SS_STARTED, '1') } catch {}
    },

    answer(answerIndex) {
      const total = this.total
      const next = Array.isArray(this.answers) ? this.answers.slice() : []
      for (let i = 0; i < total; i++) {
        if (next[i] === undefined) next[i] = null
      }
      next[this.step] = answerIndex
      this.answers = next
    },

    clearAnswer(index) {
      if (typeof index !== 'number') return
      if (index < 0 || index >= this.total) return
      const next = this.answers.slice()
      next[index] = null
      this.answers = next
    },

    clearAnswersFrom(index) {
      if (typeof index !== 'number' || index < 0) return
      for (let i = index; i < this.total; i++) this.answers[i] = null
    },

    forward() {
      if (this.step < this.total - 1) this.step++
    },

    back() {
      if (this.step > 0) this.step--
    },

    restartSteps() {
      this.step = 0
    },

    computeRecommendation() {
      const questions = questionsList.value.length
        ? questionsList.value
        : FALLBACK_QUESTIONS
      const themes = getThemes()

      const scores = {}

      questions.forEach((q, i) => {
        const aIdx = this.answers[i]
        const ans = q.answers?.[aIdx]
        if (!ans) return

        // Поддерживаем оба формата: scores (новый CDN) и weights (старый)
        const weights = ans.scores || ans.weights || {}
        for (const [themeId, w] of Object.entries(weights)) {
          const weight = Number(w) || 0
          if (weight <= 0) continue
          scores[themeId] = (scores[themeId] || 0) + weight
        }
      })

      // Защита: если пользователь не набрал ни одного очка
      // (например, все ответы пустые или поля scores/weights отсутствуют),
      // не выбираем «первую тему по умолчанию»
      const totalScore = Object.values(scores).reduce((s, v) => s + v, 0)
      if (totalScore === 0) {
        console.warn('[quiz] computeRecommendation: totalScore = 0, returns null')
        return null
      }

      let best = null
      let bestScore = -1
      for (const t of themes) {
        const s = scores[t.id] || 0
        // Строго больше — тай-брейк остаётся детерминированным:
        // при равных очках побеждает тема, которая раньше в списке
        if (s > bestScore) {
          bestScore = s
          best = t.id
        }
      }
      return best
    },

    finish() {
      this.recommended = this.computeRecommendation()
      this.done = true
      try {
        localStorage.setItem(LS_DONE, '1')
        localStorage.setItem(LS_REC, this.recommended || '')
        localStorage.setItem(LS_ANSW, JSON.stringify(this.answers))
      } catch {}
      const uid = localStorage.getItem('auth.uid') || ''
      if (uid) pushState(uid)
    },

    reset() {
      this.step = 0
      this.answers = []
      this.started = false
      this.done = false
      this.recommended = null
      try {
        localStorage.removeItem(LS_DONE)
        localStorage.removeItem(LS_REC)
        localStorage.removeItem(LS_ANSW)
        sessionStorage.removeItem(SS_STARTED)
      } catch {}
    },
  },
})