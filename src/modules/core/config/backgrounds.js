/**
 * Фон по имени экрана (route.meta.bg).
 * Файлы кладём в public/backgrounds/.
 * Если файла нет — фон просто не применится, экран останется на var(--bg).
 *
 * Формат: 'url' | { url, overlay, blur, position, size }
 *   overlay — цвет/градиент поверх картинки (для читаемости текста)
 *   blur    — px, применяется к картинке
 *   position/size — CSS background-position / background-size
 */
export const BACKGROUNDS = {

//   login:    { url: '/backgrounds/login.jpg',    overlay: 'linear-gradient(180deg, rgba(255,255,255,.65) 0%, rgba(255,255,255,.9) 100%)' },
  default:    { url: '/backgrounds/login.jpg', },
  login:    { url: '/backgrounds/login.jpg', },
  // profile:  { url: '/backgrounds/profile.jpg',  overlay: 'linear-gradient(180deg, rgba(255,255,255,.78) 0%, rgba(255,255,255,.94) 100%)' },
  // quiz:     { url: '/backgrounds/quiz.jpg',     overlay: 'linear-gradient(180deg, rgba(255,255,255,.78) 0%, rgba(255,255,255,.94) 100%)' },
  quiz:     { url: '/backgrounds/quiz.jpg',    },
  // quiz:     { url: '/backgrounds/quiz_wellcome.jpg',     },
  // themes:   { url: '/backgrounds/themes.jpg',   overlay: 'linear-gradient(180deg, rgba(255,255,255,.78) 0%, rgba(255,255,255,.94) 100%)' },
  // archive:  { url: '/backgrounds/archive.jpg',  overlay: 'linear-gradient(180deg, rgba(255,255,255,.82) 0%, rgba(255,255,255,.96) 100%)' },
  // tasks:    { url: '/backgrounds/tasks.jpg',    overlay: 'linear-gradient(180deg, rgba(255,255,255,.82) 0%, rgba(255,255,255,.96) 100%)' },
  // stats:    { url: '/backgrounds/stats.jpg',    overlay: 'linear-gradient(180deg, rgba(255,255,255,.82) 0%, rgba(255,255,255,.96) 100%)' },
  // home:     { url: '/backgrounds/home.jpg',     overlay: 'linear-gradient(180deg, rgba(255,255,255,.75) 0%, rgba(255,255,255,.95) 100%)' },
}

export function resolveBackground(key) {
  const map = BACKGROUNDS

  // 1. Ключ есть — используем его
  if (key && map[key]) {
    const v = map[key]
    return typeof v === 'string' ? { url: v } : v
  }

  // 2. Ключа нет или он неизвестен — берём default
  const fallback = map.default
  if (!fallback) return null
  return typeof fallback === 'string' ? { url: fallback } : fallback
}