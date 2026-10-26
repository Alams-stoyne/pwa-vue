/**
 * Реестр событий маскота.
 * 
 * scene — имя сцены, ключ из SCENES
 * bubble — текст, который появляется в пузыре
 * priority — чем выше, тем важнее (all_done = 100)
 * oncePerDay — если true, событие срабатывает только раз в день
 */
export const SCENES = {
  idle: '/lottie/anim_1.json',
  greeting: '/lottie/anim_2.json',
  lecture: '/lottie/anim_3.json',
  practice: '/lottie/anim_4.json',
  charging: '/lottie/anim_5.json',
  water: '/lottie/anim_6.json',
  breathing: '/lottie/anim_7.json',
  journal: '/lottie/anim_8.json',
  steps: '/lottie/anim_9.json',
  all_done: '/lottie/anim_10.json',
}

export const EVENTS = {
  greeting: { 
    scene: 'greeting', 
    bubble: 'Привет! Рад вас видеть на неделе здоровья и безопасности Х5!', 
    priority: 90, 
    oncePerDay: true 
  },
  lecture: { 
    scene: 'lecture', 
    bubble: 'Лекция просмотрена! Так держать.', 
    priority: 10 
  },
  practice: { 
    scene: 'practice', 
    bubble: 'Практика выполнена! Отличная работа.', 
    priority: 10 
  },
  charging: { 
    scene: 'charging', 
    bubble: 'Зарядка выполнена! Бодрость обеспечена.', 
    priority: 10 
  },
  water: { 
    scene: 'water', 
    bubble: 'Водный баланс пополнен!', 
    priority: 10 
  },
  breathing: { 
    scene: 'breathing', 
    bubble: 'Дыхательная практика выполнена. Спокойствие!', 
    priority: 10 
  },
  journal: { 
    scene: 'journal', 
    bubble: 'Записи сделаны! Отличная рефлексия.', 
    priority: 10,
    oncePerDay: true,   // ← добавить
  },
  steps: { 
    scene: 'steps', 
    bubble: 'Шаги загружены! Отличный результат.', 
    priority: 10 
  },
  all_done: { 
    scene: 'all_done', 
    bubble: 'Все задания на сегодня выполнены! Ты супер!', 
    priority: 100, 
    oncePerDay: true 
  },
}