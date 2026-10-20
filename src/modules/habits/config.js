/**
 * Конфигурация привычек.
 *
 * Источники:
 *   • конфиг (title, emoji, timesPerDay, minIntervalMin) — с CDN
 *     ({CDN}/config/habits.json), структура themeId → массив привычек;
 *   • состояние (doneToday, lastDoneAt) — с API, персональное.
 *
 * Здесь:
 *   • FALLBACK_HABITS_BY_THEME — используется, пока CDN не ответил;
 *   • habitsList — реактивный список привычек ДЛЯ ВЫБРАННОЙ темы,
 *     наполняется habits/store из конфига CDN;
 *   • хелперы getHabits / getHabit / habitsComputed.
 */

import { ref, computed } from 'vue'

export const FALLBACK_HABITS_BY_THEME = {
  energy: [
    { id: 'water',   icon: 'water',   title: 'Стакан воды', emoji: '💧', hint: 'Выпейте стакан чистой воды', timesPerDay: 3, minIntervalMin: 90 },
    { id: 'workout', icon: 'workout', title: 'Разминка',    emoji: '🤸', hint: 'Потянитесь, разомните шею и плечи', timesPerDay: 3, minIntervalMin: 120 },
  ],
  antistress: [
    { id: 'water', icon: 'water', title: 'Стакан воды',      emoji: '💧', hint: 'Выпейте стакан чистой воды', timesPerDay: 2, minIntervalMin: 120 },
    { id: 'eyes',  icon: 'eyes',  title: 'Отдохнуть глазам', emoji: '👀', hint: 'Посмотрите в даль 20 секунд',  timesPerDay: 3, minIntervalMin: 60 },
  ],
  body: [
    { id: 'workout', icon: 'workout', title: 'Разминка',    emoji: '🤸', hint: 'Потянитесь, разомните шею и плечи', timesPerDay: 3, minIntervalMin: 120 },
    { id: 'water',   icon: 'water',   title: 'Стакан воды', emoji: '💧', hint: 'Выпейте стакан чистой воды', timesPerDay: 2, minIntervalMin: 90 },
  ],
  balance: [
    { id: 'eyes',  icon: 'eyes',  title: 'Отдохнуть глазам', emoji: '👀', hint: 'Посмотрите в даль 20 секунд', timesPerDay: 2, minIntervalMin: 60 },
    { id: 'water', icon: 'water', title: 'Стакан воды',      emoji: '💧', hint: 'Выпейте стакан чистой воды', timesPerDay: 2, minIntervalMin: 90 },
  ],
  default: [
    { id: 'water',   icon: 'water',   title: 'Стакан воды', emoji: '💧', hint: 'Выпейте стакан чистой воды', timesPerDay: 3, minIntervalMin: 90 },
    { id: 'workout', icon: 'workout', title: 'Разминка',    emoji: '🤸', hint: 'Потянитесь, разомните шею и плечи', timesPerDay: 3, minIntervalMin: 120 },
    { id: 'eyes',    icon: 'eyes',    title: 'Отдохнуть глазам', emoji: '👀', hint: 'Посмотреть в даль 20 секунд', timesPerDay: 3, minIntervalMin: 60 },
  ],
}

/**
 * Fallback для конкретной темы (или default).
 */
export function getFallbackHabitsForTheme(themeId) {
  return FALLBACK_HABITS_BY_THEME[themeId]
      || FALLBACK_HABITS_BY_THEME.default
}

// Плоский список для текущей выбранной темы. Наполняет habits/store.
export const habitsList = ref([])

export function getHabits() {
  return habitsList.value
}

export function getHabit(id) {
  return habitsList.value.find((h) => h.id === id) || null
}

export const habitsComputed = computed(() => getHabits())