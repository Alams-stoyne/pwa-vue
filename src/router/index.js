import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../modules/auth/store'
import { useConsentStore } from '../modules/consent/store'
import { useQuizStore } from '../modules/quiz/store'
import { useInstall } from '../modules/install/useInstall'
import { useAccess } from '../modules/install/useAccess'
import { resolveNextOnboardingRoute } from '../modules/onboarding/navigation'
import { setDocumentTitle } from '../modules/core/composables/usePageTitle'

import HomeView from '../modules/home/HomeView.vue'
import HomeHeartView from '../modules/home/HomeHeartView.vue'
import ConsentView from '../modules/consent/ConsentView.vue'
import OnboardingProfileView from '../modules/profile/OnboardingProfileView.vue'
import HabitsCatalogView from '../modules/habits/CatalogView.vue'
import TutorialView from '../modules/tutorial/TutorialView.vue'
import ThemeSelectView from '../modules/theme/ThemeSelectView.vue'
import RecommendationView from '../modules/theme/RecommendationView.vue'
import QuizWelcomeView from '../modules/quiz/WelcomeView.vue'
import QuizView from '../modules/quiz/QuizView.vue'
import ProfileView from '../modules/profile/ProfileView.vue'
import ProfileViewEditor from '../modules/profile/ProfileViewEditor.vue'
import AccessDenied from '../modules/install/AccessDenied.vue'
import InstallGate from '../modules/install/InstallGate.vue'
import RegisteringView from '../modules/auth/RegisteringView.vue'
import TrainingView from '../modules/lectures/TrainingView.vue'
import LectureDetailView from '../modules/lectures/LectureDetailView.vue'
import LectureStorageView from '../modules/lectures/LectureStorageView.vue'
import StatsView from '../modules/stats/StatsView.vue'
import StatsRulesView from '../modules/stats/StatsRulesView.vue' // <-- ДОБАВЛЕН ИМПОРТ
import DayTaskView from '../modules/dayTask/DayTaskView.vue'
import StepsRulesView from '../modules/steps/StepsRulesView.vue'
import SupportView from '../modules/support/SupportView.vue'
import SupportTicketsView from '../modules/support/SupportTicketsView.vue'
import SupportTicketDetailView from '../modules/support/SupportTicketDetailView.vue'

const ONBOARDING_LOCKED_PATHS = [
  '/onboarding/profile', '/onboarding/habits',
  '/onboarding/tutorial', '/quiz', '/quiz/welcome', '/themes',
]

const CONSENT_LOCKED_PATHS = [
  '/profile/edit',
]

const routes = [
  // Экран «установите приложение» — единственный доступный в браузере
  { path: '/install', component: InstallGate, meta: { title: 'Установка', back: false, public: true } },

  { path: '/access-error', component: AccessDenied, meta: { title: 'Доступ не подтверждён', back: false } },
  { path: '/registering', component: RegisteringView, meta: { title: 'Подключение', back: false } },
  { path: '/home', component: HomeView, meta: { auth: true, title: 'Главная', back: false } },
  { path: '/onboarding/consent', component: ConsentView, meta: { auth: true, title: 'Согласие на обработку данных', back: false } },
  { path: '/onboarding/profile', component: OnboardingProfileView, meta: { auth: true, title: 'Знакомство', back: false } },
  { path: '/onboarding/habits', component: HabitsCatalogView, meta: { auth: true, title: 'Выбор привычки', back: false } },
  { path: '/onboarding/tutorial', component: TutorialView, meta: { auth: true, title: 'Обучение', back: false } },
  { path: '/quiz/welcome', component: QuizWelcomeView, meta: { auth: true, title: 'Тест на направление', back: false } },
  { path: '/quiz', component: QuizView, meta: { auth: true, title: 'Тест на направление', back: false } },
  { path: '/themes/:id', component: RecommendationView, props: true, meta: { auth: true, title: (r) => `Направление: ${r.params.id}`, back: false, recommendationOnly: true } },
  { path: '/themes', component: ThemeSelectView, meta: { auth: true, title: (r) => r.query.change === '1' ? 'Смена направления' : 'Выбор направления', back: false, backTo: (r) => r.query.change === '1' ? { path: '/profile' } : null } },
  { path: '/profile', component: ProfileView, meta: { auth: true, title: 'Профиль', viewBackTitle: true, back: true, backTo: { path: '/home' } } },
  { path: '/profile/edit', component: ProfileViewEditor, meta: { auth: true, title: 'Редактировать профиль', viewBackTitle: true, back: true, backTo: { path: '/profile' } } },
  { path: '/training', component: TrainingView, meta: { auth: true, title: 'Обучение', viewBackTitle: true, back: true, backTo: { path: '/home' } } },
  { path: '/training/lectures/:dbKey', component: LectureDetailView, props: true, meta: { auth: true, title: 'Лекция', viewBackTitle: true, back: true, hideNav: true, backTo: (r) => r.query.from === 'storage' ? { path: '/training/storage' } : { path: '/training' } } },
  { path: '/training/practices/:id', name: 'PracticeDetail', component: () => import('../modules/tasks/TasksViewDetail.vue'), meta: { auth: true, title: 'Практика', viewBackTitle: true, back: true, backTo: { path: '/training', query: { tab: 'practice' } } } },
  { path: '/training/storage', component: LectureStorageView, meta: { auth: true, title: 'Материалы прошлых дней', viewBackTitle: true, back: true, backTo: { path: '/training' } } },
  
  // ▼ ДОБАВЛЕН МАРШРУТ ПРАВИЛ ▼
  { path: '/stats/rules', component: StatsRulesView, meta: { auth: true, title: 'Правила зачёта', viewBackTitle: true, back: true, backTo: { path: '/stats' } } },
  
  { path: '/stats', component: StatsView, meta: { auth: true, title: 'Статистика', viewBackTitle: true, back: true, backTo: { path: '/home' } } },

  { path: '/heart', component: HomeHeartView, meta: { auth: true, title: 'Донорство', hideNav: true, back: true, backTo: { path: '/home' } } },

  // Support routes — доступны всем, в том числе без установки (для жалобы на проблему установки)
  { 
    path: '/support', 
    component: SupportView, 
    meta: { 
      public: true, 
      title: 'Написать администратору', 
      viewBackTitle: true, 
      back: true, 
      hideNav: true, 
      backTo: () => {
        const { isInstalled } = useInstall()
        return isInstalled.value ? { path: '/profile' } : { path: '/install' }
      }
    } 
  },
  { path: '/support/tickets', component: SupportTicketsView, meta: { auth: true, title: 'Мои обращения', viewBackTitle: true, back: true, hideNav: true, backTo: { path: '/support' } } },
  { path: '/support/tickets/:id', component: SupportTicketDetailView, props: true, meta: { auth: true, title: 'Обращение', viewBackTitle: true, back: true, hideNav: true, backTo: { path: '/support/tickets' } } },

  { path: '/dayTask', component: DayTaskView, meta: { auth: true, title: (r) => r.query.tab === 'steps' ? 'Шагомер' : 'Рефлексия', viewBackTitle: true, back: true, hideNav: (r) => r.query.tab === 'steps' ? true : false, backTo: { path: '/home' } } },
  { path: '/reflection', redirect: (to) => ({ path: '/dayTask', query: { ...to.query, tab: 'reflection' } }) },
  { path: '/steps', redirect: (to) => ({ path: '/dayTask', query: { ...to.query, tab: 'steps' } }) },
  { path: '/steps/rules', component: StepsRulesView, meta: { auth: true, title: 'Правила шагомера', back: true, hideNav: true, backTo: { path: '/dayTask', query: { tab: 'steps' } } } },
  { path: '/archive', redirect: '/training/storage' },
  { path: '/:pathMatch(.*)*', component: HomeView, meta: { auth: true, title: 'Главная', back: false } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const { isInstalled } = useInstall()

  // 1. Пока приложение не установлено — разрешён только /install и /support.
  if (!isInstalled.value) {
    if (to.path === '/install') return true
    if (to.path === '/support') return true
    return { path: '/install' }
  }

  // 2. Установлено, но пользователь на /install — выкидываем внутрь.
  if (to.path === '/install') {
    return { path: '/' }
  }

  // 3. Далее обычная логика (проверки UID, авторизации, онбординга).
  const { isGranted, hasUid, uidMismatch } = useAccess()
  const isPublicSupport = to.path === '/support'

  if (uidMismatch.value) {
    if (to.path !== '/access-error' && !isPublicSupport) return { path: '/access-error' }
    return true
  }
  if (!isGranted.value) {
    if (to.path !== '/access-error' && !isPublicSupport) return { path: '/access-error' }
    return true
  }
  if (to.path === '/access-error' && !isPublicSupport) {
    if (!uidMismatch.value && isGranted.value) return { path: '/home' }
  }

  const auth = useAuthStore()
  auth.load()
  const registrationComplete = auth.isAuthed && auth.isRegistered && auth.isConfirmed

  if (!registrationComplete && hasUid.value) {
    if (to.path !== '/registering' && !isPublicSupport) return { path: '/registering' }
    return true
  }
  if (to.path === '/registering' && !isPublicSupport) return { path: '/home' }
  if (!auth.isAuthed) {
    if (to.path !== '/access-error' && !isPublicSupport) return { path: '/access-error' }
    return true
  }

  if (isPublicSupport) return true

  const consent = useConsentStore()
  if (!consent.isAnswered) {
    if (to.path !== '/onboarding/consent') return { path: '/onboarding/consent' }
    return true
  }

  if (!consent.isGranted) {
    if (CONSENT_LOCKED_PATHS.includes(to.path)) return { path: '/profile' }
  }

  if (to.path === '/themes' && to.query.change === '1') return true

  const quiz = useQuizStore()
  quiz.load()
  if (!quiz.done && (to.path === '/quiz' || to.path === '/quiz/welcome')) return true

  const expected = resolveNextOnboardingRoute()
  if (expected === '/home') {
    if (ONBOARDING_LOCKED_PATHS.includes(to.path)) return { path: '/home' }
    return true
  }
  if (to.path === expected) return true
  if (expected === '/themes' && to.meta?.recommendationOnly) return true

  return { path: expected }
})

router.afterEach((to) => {
  const meta = to.meta?.title
  if (typeof meta === 'function') return setDocumentTitle(meta(to))
  setDocumentTitle(meta || '')
})

export default router