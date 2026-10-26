import { defineStore } from 'pinia'
import { localDate } from '../core/utils/date'
import { EVENTS } from './events'

export const useMascotStore = defineStore('mascot', {
  state: () => ({
    queue: [],
    currentEvent: null,
    isPlaying: false,
  }),

  actions: {
    /**
     * Добавить событие в очередь.
     * Логика вытеснения:
     *   • all_done — очищает очередь от обычных событий (оставляет только greeting).
     *   • greeting — добавляется в начало очереди (если ещё не было сегодня).
     *   • обычные — если в очереди уже есть pending, заменяем их на новое
     *     (играем последнее).
     */
    trigger(type) {
      const eventDef = EVENTS[type]
      if (!eventDef) return

      // "Раз в день" через localStorage
      if (eventDef.oncePerDay) {
        const key = `mascot.${type}.date`
        if (localStorage.getItem(key) === localDate()) return
        localStorage.setItem(key, localDate())
      }

      // Если сейчас играет all_done — обычные события игнорируем
      const allDoneActive =
        this.currentEvent?.type === 'all_done' ||
        this.queue.some((e) => e.type === 'all_done')

      if (allDoneActive && type !== 'all_done' && type !== 'greeting') return

      if (type === 'all_done') {
        // Оставляем только greeting в pending
        this.queue = this.queue.filter((e) => e.type === 'greeting')
      } else if (type !== 'greeting') {
        // Обычное событие вытесняет все pending
        this.queue = []
      }

      // Удаляем дубликаты типа
      this.queue = this.queue.filter((e) => e.type !== type)

      const event = { type, ...eventDef }
      if (type === 'greeting') this.queue.unshift(event)
      else this.queue.push(event)

      this.next()
    },

    /** Запустить следующее событие (если ничего не играет). */
    next() {
      if (this.isPlaying || !this.queue.length) return
      this.currentEvent = this.queue.shift()
      this.isPlaying = true
    },

    /**
     * Завершить текущее событие.
     * Идемпотентно: повторный вызов — no-op.
     */
    finish() {
      if (!this.isPlaying) return
      this.isPlaying = false
      this.currentEvent = null
      if (this.queue.length) {
        setTimeout(() => this.next(), 400)
      }
    },

    /** Пропустить текущее событие (тап по маскоту). */
    skip() {
      this.finish()
    },

    clear() {
      this.queue = []
      this.currentEvent = null
      this.isPlaying = false
    },
  },
})