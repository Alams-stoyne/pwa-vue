const THEME_ARTICLES = {
  energy: [
    { ID_ARTICLE: 'e1', TEXT: 'Как восстанавливаться за 10 минут. '.repeat(3),
      VIDEO_LINK: 'https://www.w3schools.com/html/mov_bbb.mp4',
      PHOTOS: ['https://cdn.x5hd.ru/iblock/0e7/0e72ab669f69749a5e1a042fd908ffcb/7d6f32e67ef5f718926c3f7e85bd210b.jpg',
               'https://cdn.x5hd.ru/iblock/0e7/0e72ab669f69749a5e1a042fd908ffcb/7d6f32e67ef5f718926c3f7e85bd210b.jpg'] },
    { ID_ARTICLE: 'e2', TEXT: 'Утренние ритуалы для продуктивности.', VIDEO_LINK: null, PHOTOS: [] },
    { ID_ARTICLE: 'e3', TEXT: 'Мини-практики на день.', VIDEO_LINK: null,
      PHOTOS: ['https://cdn.x5hd.ru/iblock/0e7/0e72ab669f69749a5e1a042fd908ffcb/7d6f32e67ef5f718926c3f7e85bd210b.jpg'] },
  ],
  antistress: [
    { ID_ARTICLE: 'a1', TEXT: 'Дыхательные техники при стрессе.', VIDEO_LINK: null, PHOTOS: [] },
    { ID_ARTICLE: 'a2', TEXT: 'Как перестать прокручивать мысли.', VIDEO_LINK: null,
      PHOTOS: ['https://picsum.photos/seed/stress1/600/400'] },
  ],
  body: [
    { ID_ARTICLE: 'b1', TEXT: 'Тренировка для занятых: 15 минут. '.repeat(2),
      VIDEO_LINK: null, PHOTOS: ['https://picsum.photos/seed/body1/600/400'] },
    { ID_ARTICLE: 'b2', TEXT: 'Сон и восстановление.', VIDEO_LINK: null, PHOTOS: [] },
  ],
  balance: [
    { ID_ARTICLE: 'bl1', TEXT: 'Планирование без выгорания.', VIDEO_LINK: null, PHOTOS: [] },
    { ID_ARTICLE: 'bl2', TEXT: 'Как отделять работу от жизни.', VIDEO_LINK: null, PHOTOS: [] },
  ],
}

const pad = (n) => String(n).padStart(2, '0')
function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ============================================================
// СТАТЬИ
// ============================================================
export function articlesForThemeDate(theme, date) {
  return (THEME_ARTICLES[theme] || []).map((a) => ({ ...a, THEME: theme, DATE: date }))
}

export function generalForDate(date) {
  return [
    { ID_ARTICLE: 'g1', DATE: date, VIDEO_LINK: null, PHOTOS: [],
      TEXT: `Общая статья за ${date}. Публикуется ежедневно и не зависит от направления.` },
    { ID_ARTICLE: 'g2', DATE: date, VIDEO_LINK: null,
      PHOTOS: ['https://picsum.photos/seed/gen1/600/400'],
      TEXT: `Ещё одна общая статья за ${date}.` },
  ]
}

export function usefulForDate(date) {
  return [
    { ID_ARTICLE: 'u1', DATE: date, VIDEO_LINK: null, PHOTOS: [],
      TEXT: `Полезный материал за ${date}. Короткий и практичный.` },
    { ID_ARTICLE: 'u2', DATE: date, VIDEO_LINK: null, PHOTOS: [],
      TEXT: `Ещё один полезный материал за ${date}.` },
  ]
}

export function archiveForTheme(theme) {
  const out = []
  for (let i = 1; i <= 6; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const date = isoDate(d)
    for (let k = 1; k <= 2; k++) {
      out.push({
        ID_ARTICLE: `${theme}-a${i}-${k}`,
        DATE: date, THEME: theme, VIDEO_LINK: null, PHOTOS: [],
        TEXT: `Архивная статья направления «${theme}» от ${date} (#${k}).`,
      })
    }
  }
  return out
}

// ============================================================
// ПРАКТИКИ (ЗАДАНИЯ)
// ID_TASK уникален и НЕ зависит от даты. Количество заданий
// варьируется от 1 до 5 — детерминированно по хешу даты.
// ============================================================

const TASKS_BY_THEME = {
  energy: [
    { ID_TASK: 'energy-warmup',  TITLE: 'Разминка',       TEXT: 'Потянитесь, разомните шею и плечи.' },
    { ID_TASK: 'energy-breath',  TITLE: 'Дыхание',        TEXT: '3 минуты глубокого дыхания.' },
    { ID_TASK: 'energy-water',   TITLE: 'Вода',           TEXT: 'Выпейте стакан воды.' },
    { ID_TASK: 'energy-walk',    TITLE: 'Прогулка',       TEXT: 'Пройдитесь 10 минут на свежем воздухе.' },
    { ID_TASK: 'energy-stretch', TITLE: 'Растяжка',       TEXT: '5 минут растяжки всего тела.' },
  ],
  antistress: [
    { ID_TASK: 'antistress-4-7-8',   TITLE: 'Дыхание 4-7-8', TEXT: 'Вдох 4 сек — задержка 7 сек — выдох 8 сек.' },
    { ID_TASK: 'antistress-mindful', TITLE: 'Осознанность',  TEXT: '5 минут наблюдения за дыханием.' },
    { ID_TASK: 'antistress-detach',  TITLE: 'Отключение',    TEXT: '15 минут без телефона и мессенджеров.' },
    { ID_TASK: 'antistress-journal', TITLE: 'Запись',        TEXT: 'Запишите три вещи, за которые благодарны.' },
  ],
  body: [
    { ID_TASK: 'body-15min',  TITLE: 'Тренировка 15 минут', TEXT: 'Простые упражнения без инвентаря.' },
    { ID_TASK: 'body-walk',   TITLE: 'Прогулка',            TEXT: '20 минут пешком быстрым шагом.' },
    { ID_TASK: 'body-posture',TITLE: 'Осанка',              TEXT: 'Проверьте осанку и сделайте 10 наклонов.' },
    { ID_TASK: 'body-sleep',  TITLE: 'Подготовка ко сну',   TEXT: 'За час до сна уберите экраны.' },
    { ID_TASK: 'body-water',  TITLE: 'Вода',                TEXT: 'Выпейте 2 стакана воды в течение дня.' },
  ],
  balance: [
    { ID_TASK: 'balance-plan',   TITLE: 'Планирование',   TEXT: 'Запишите 3 главные задачи на завтра.' },
    { ID_TASK: 'balance-detach', TITLE: 'Отключение',     TEXT: '1 час без рабочих уведомлений.' },
    { ID_TASK: 'balance-hobby',  TITLE: 'Хобби',          TEXT: '30 минут на любимое занятие.' },
    { ID_TASK: 'balance-family', TITLE: 'Время с близкими', TEXT: 'Время без телефона с семьёй.' },
  ],
}

/** Простой хеш строки — для детерминированного выбора количества заданий. */
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function tasksForThemeDate(theme, date) {
  const list = TASKS_BY_THEME[theme] || []
  if (!list.length) return []
  // Количество заданий варьируется от 1 до list.length
  const count = 1 + (hashStr(`${theme}:${date}`) % list.length)
  return list.slice(0, count).map((t) => ({ ...t, DATE: date }))
}

// ============================================================
// ЛЕКЦИИ
// ============================================================
const LECTURES = {
  general: [
    { ID_LECTURE: 'lg1', TITLE: 'Как учиться эффективнее',
      DESCRIPTION: 'Пять принципов, которые ускоряют обучение в 2 раза.',
      COVER: 'https://picsum.photos/seed/lect-g1/600/400',
      TEXT: 'Общая лекция о принципах эффективного обучения. '.repeat(4),
      VIDEO_LINK: 'https://youtu.be/UMjFe8NMfr4', PHOTOS: [] },
    { ID_LECTURE: 'lg2', TITLE: 'Внимание и концентрация',
      DESCRIPTION: 'Как удерживать фокус в мире уведомлений.',
      COVER: 'https://picsum.photos/seed/lect-g2/600/400',
      TEXT: 'Материал о внимании и работе с отвлечениями. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
    { ID_LECTURE: 'lg3', TITLE: 'Память и повторение',
      DESCRIPTION: 'Простые техники запоминания надолго.',
      COVER: 'https://picsum.photos/seed/lect-g3/600/400',
      TEXT: 'Разбор интервального повторения и мнемотехник. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
    { ID_LECTURE: 'lg4', TITLE: 'Работа с целями',
      DESCRIPTION: 'Как ставить цели и достигать их.',
      COVER: 'https://picsum.photos/seed/lect-g4/600/400',
      TEXT: 'Практический разбор постановки целей. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
  ],
  energy: [
    { ID_LECTURE: 'le1', TITLE: 'Утренние ритуалы',
      DESCRIPTION: 'Что делать в первые 30 минут после пробуждения.',
      COVER: 'https://picsum.photos/seed/lect-e1/600/400',
      TEXT: 'Утренние ритуалы для энергии. '.repeat(4),
      VIDEO_LINK: null, PHOTOS: [] },
    { ID_LECTURE: 'le2', TITLE: 'Питание для энергии',
      DESCRIPTION: 'Что есть, чтобы не засыпать днём.',
      COVER: 'https://picsum.photos/seed/lect-e2/600/400',
      TEXT: 'Питание и уровень энергии. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
  ],
  antistress: [
    { ID_LECTURE: 'la1', TITLE: 'Дыхание 4-7-8',
      DESCRIPTION: 'Простая техника против тревоги.',
      COVER: 'https://picsum.photos/seed/lect-a1/600/400',
      TEXT: 'Техника дыхания 4-7-8 и её эффект. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
  ],
  body: [
    { ID_LECTURE: 'lb1', TITLE: 'Тренировка на 15 минут',
      DESCRIPTION: 'Короткая разминка для занятых.',
      COVER: 'https://picsum.photos/seed/lect-b1/600/400',
      TEXT: 'Тренировка на 15 минут в день. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
  ],
  balance: [
    { ID_LECTURE: 'lbl1', TITLE: 'Планирование без выгорания',
      DESCRIPTION: 'Как распределить нагрузку.',
      COVER: 'https://picsum.photos/seed/lect-bl1/600/400',
      TEXT: 'Планирование и отдых. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
  ],
  charging: [
    { ID_LECTURE: 'lc1', TITLE: 'Зарядка: разминка для шеи',
      DESCRIPTION: '3 минуты, чтобы снять напряжение.',
      COVER: 'https://picsum.photos/seed/lect-c1/600/400',
      TEXT: 'Короткая зарядка для шеи и плеч. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
    { ID_LECTURE: 'lc2', TITLE: 'Зарядка: разминка для глаз',
      DESCRIPTION: 'Упражнения после долгой работы за экраном.',
      COVER: 'https://picsum.photos/seed/lect-c2/600/400',
      TEXT: 'Разминка для глаз. '.repeat(3),
      VIDEO_LINK: null, PHOTOS: [] },
  ],
}

export function generalLectures(date) {
  return LECTURES.general.map((l) => ({
    ...l,
    ID_LECTURE: `${l.ID_LECTURE}-${date}`,
    TITLE: `${l.TITLE} · ${date}`,
    DATE: date,
  }))
}
export function themeLectures(theme, date) {
  return (LECTURES[theme] || []).map((l) => ({
    ...l,
    ID_LECTURE: `${l.ID_LECTURE}-${date}`,
    TITLE: `${l.TITLE} · ${date}`,
    DATE: date,
  }))
}
export function chargingLectures(date) {
  return LECTURES.charging.map((l) => ({
    ...l,
    ID_LECTURE: `${l.ID_LECTURE}-${date}`,
    TITLE: `${l.TITLE} · ${date}`,
    DATE: date,
  }))
}

// ============================================================
// СТАТИСТИКА
// ============================================================
export function personalStats(userId) {
  return {
    ID_USER: userId,
    ARTICLES_READ: 42,
    TASKS_DONE: 7,
    DAYS_ACTIVE: 12,
    STREAK: 3,
    LAST_ACTIVE: isoDate(new Date()),
  }
}

export function globalStats() {
  return { USERS: 1234, ARTICLES_READ: 98765, TASKS_DONE: 5432, TOP_THEME: 'energy' }
}