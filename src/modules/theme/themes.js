/**
 * Направления (темы).
 *
 * Источник истины — сервер (`GET /api/config/themes`).
 * Здесь:
 *   • FALLBACK_THEMES — используется до первого ответа сервера
 *     или если сервер недоступен и кеш пуст;
 *   • реактивный themesList, наполняемый theme/store;
 *   • хелперы getTheme/getThemes/themesComputed.
 */

import { ref, computed } from 'vue'

export const FALLBACK_THEMES = [
  {
    id: 'energy',
    name: 'Энергия',
    subtitle: 'Заряд и продуктивность',
    description: 'Как восстанавливать силы, держать тонус и продуктивно работать весь день без выгорания.',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    videoDescription: 'Короткий обзор направления «Энергия».',
    backgroundImage: '/backgrounds/theme-energy.jpg',
    ThemeMascot: '',
  },
  {
    id: 'antistress',
    name: 'Антистресс',
    subtitle: 'Спокойствие и устойчивость',
    description: 'Практики и короткие материалы для управления стрессом и эмоционального равновесия.',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    videoDescription: 'О направлении «Антистресс».',
    backgroundImage: '/backgrounds/theme-antistress.jpg',
    ThemeMascot: '',
  },
  {
    id: 'body',
    name: 'Тело',
    subtitle: 'Движение и здоровье',
    description: 'Физическая активность, восстановление и забота о теле без фанатизма и диет.',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    videoDescription: 'О направлении «Тело».',
    backgroundImage: '/backgrounds/theme-body.jpg',
    ThemeMascot: '_v2',
  },
  {
    id: 'balance',
    name: 'Баланс',
    subtitle: 'Работа и жизнь',
    description: 'Как совмещать работу и личные интересы без выгорания и перегрузок.',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    videoDescription: 'О направлении «Баланс».',
    backgroundImage: '/backgrounds/theme-balance.jpg',
    ThemeMascot: '_balance',
  },
]

export const themesList = ref([])

export function getThemes() {
  return themesList.value.length ? themesList.value : FALLBACK_THEMES
}

export function getTheme(id) {
  if (!id) return null
  const list = themesList.value.length ? themesList.value : FALLBACK_THEMES
  return list.find((t) => t.id === id) || null
}

export const themesComputed = computed(() => getThemes())