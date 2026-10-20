import { useConsentStore } from '../consent/store'
import { useProfileStore } from '../profile/store'
import { useQuizStore } from '../quiz/store'
import { useThemeStore } from '../theme/store'
import { useHabitsStore } from '../habits/store'
import { isTutorialDone } from '../tutorial/config'

const LS_WELCOME_SEEN = 'onboarding.welcomeSeen'
function isWelcomeSeen() {
  try { return localStorage.getItem(LS_WELCOME_SEEN) === '1' } catch { return false }
}

/**
 * Возвращает путь к первому непройденному шагу онбординга.
 *
 * ВАЖНО: функция СИНХРОННАЯ и не делает сетевых запросов.
 * Guard вызывает её на каждом переходе — она не имеет права
 * ждать сеть, иначе навигация зависнет.
 *
 * Все данные берутся из Pinia state (которое загружено из localStorage).
 * Если нужно синхронизировать с сервером — это делается отдельно:
 *   • habits.loadSelection() вызывается в main.js при старте;
 *   • consent.loadStatus() — там же;
 *   • quiz.load()/theme.load()/profile.load() — читают из localStorage.
 */
export function resolveNextOnboardingRoute() {
  const consent = useConsentStore()
  const profile = useProfileStore()
  const quiz = useQuizStore()
  const theme = useThemeStore()
  const habits = useHabitsStore()

  const skipProfile = !consent.isGranted

  // 1. Профиль
  if (!skipProfile) {
    profile.load()
    if (!profile.isComplete) {
      return '/onboarding/profile'
    }
  }

  // 2. Welcome
  if (!isWelcomeSeen()) {
    return '/onboarding/welcome'
  }

  // 3. Тест
  quiz.load()
  if (!quiz.done) {
    return quiz.started ? '/quiz' : '/quiz/welcome'
  }

  // 4. Направление
  theme.load()
  if (!theme.hasTheme) {
    return '/themes'
  }

  // 5. Привычка — только локальная проверка (localStorage)
  if (!habits.selectedHabitId) {
    return '/onboarding/habits'
  }

  // 6. Обучение
  if (!isTutorialDone()) {
    return '/onboarding/tutorial'
  }

  return '/home'
}