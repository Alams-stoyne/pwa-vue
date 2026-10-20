/**
 * Вопросы теста на определение направления.
 *
 * Источник истины — сервер (`GET /api/config/quiz`).
 * Здесь:
 *   • FALLBACK_QUESTIONS — используется до первого ответа сервера
 *     или если сервер недоступен;
 *   • реактивный questionsList, наполняемый quiz/store.
 */

import { ref, computed } from 'vue'

export const FALLBACK_QUESTIONS = [
  {
    id: 'q1',
    text: 'Как вы обычно проводите свободное время?',
    answers: [
      { text: 'Разбираюсь в новом, читаю, учусь',  weights: { energy: 2, antistress: 1 } },
      { text: 'Планирую, думаю о работе и целях',  weights: { balance: 2 } },
      { text: 'Спорт, прогулки, забота о теле',    weights: { body: 2 } },
      { text: 'Отдыхаю, медитирую, замедляюсь',    weights: { antistress: 2 } },
    ],
  },
  {
    id: 'q2',
    text: 'Что чаще всего привлекает ваше внимание в новостях?',
    answers: [
      { text: 'Новые открытия и идеи',              weights: { energy: 2 } },
      { text: 'Работа, карьера, отношения',         weights: { balance: 2 } },
      { text: 'Здоровье и физическая форма',        weights: { body: 2 } },
      { text: 'Психология и спокойствие',           weights: { antistress: 2 } },
    ],
  },
  {
    id: 'q3',
    text: 'Что для вас важнее в работе?',
    answers: [
      { text: 'Интересные задачи и развитие',       weights: { energy: 2 } },
      { text: 'Гармония с личной жизнью',           weights: { balance: 2 } },
      { text: 'Хорошее самочувствие',               weights: { body: 2 } },
      { text: 'Спокойная атмосфера, без стресса',   weights: { antistress: 2 } },
    ],
  },
  {
    id: 'q4',
    text: 'Идеальные выходные — это…',
    answers: [
      { text: 'Почитать, разобраться в новой теме', weights: { energy: 2 } },
      { text: 'Разложить планы и навести порядок',  weights: { balance: 2 } },
      { text: 'Тренировка и прогулка',              weights: { body: 2 } },
      { text: 'Тишина, книги, отдых',               weights: { antistress: 2 } },
    ],
  },
  {
    id: 'q5',
    text: 'Какой вопрос вызвал бы у вас любопытство?',
    answers: [
      { text: 'Как успевать больше без выгорания?',    weights: { energy: 2 } },
      { text: 'Как совместить работу и личную жизнь?', weights: { balance: 2 } },
      { text: 'Как улучшить сон и энергию тела?',      weights: { body: 2 } },
      { text: 'Как снизить тревогу и стресс?',         weights: { antistress: 2 } },
    ],
  },
  {
    id: 'q6',
    text: 'Какую проблему хотели бы решить в первую очередь?',
    answers: [
      { text: 'Больше сил и продуктивности',        weights: { energy: 2 } },
      { text: 'Навести порядок в делах и времени',  weights: { balance: 2 } },
      { text: 'Поправить здоровье и привычки',      weights: { body: 2 } },
      { text: 'Найти спокойствие и равновесие',     weights: { antistress: 2 } },
    ],
  },
]

export const questionsList = ref([])

export function getQuestions() {
  return questionsList.value.length ? questionsList.value : FALLBACK_QUESTIONS
}

export const questionsComputed = computed(() => getQuestions())