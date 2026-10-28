export const EVT = {
  // Lifecycle
  APP_FIRST_OPEN: 'app_first_open',
  APP_OPEN: 'app_open',
  APP_ERROR: 'app_error',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  SCREEN_VIEW: 'screen_view',

  // Install
  INSTALL_GATE_VIEWED: 'install_gate_viewed',
  INSTALL_PROMPT_SHOWN: 'install_prompt_shown',
  INSTALL_ACCEPTED: 'install_accepted',
  INSTALL_REJECTED: 'install_rejected',

  // Registration
  UID_RECOVERY_SHOWN: 'uid_recovery_shown',
  ACCESS_DENIED_SHOWN: 'access_denied_shown',
  REGISTERING_VIEW_VIEWED: 'registering_view_viewed',
  REGISTRATION_STARTED: 'registration_started',
  REGISTRATION_SUCCESS: 'registration_success',
  REGISTRATION_FAILED: 'registration_failed',

  // Onboarding
  CONSENT_VIEWED: 'consent_viewed',
  CONSENT_GRANTED: 'consent_granted',
  CONSENT_DECLINED: 'consent_declined',
  ONBOARDING_PROFILE_DONE: 'onboarding_profile_done',
  ONBOARDING_HABITS_DONE: 'onboarding_habits_done',
  ONBOARDING_TUTORIAL_DONE: 'onboarding_tutorial_done',
  QUIZ_DONE: 'quiz_done',
  THEME_SELECTED: 'theme_selected',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Engagement
  LECTURE_READ: 'lecture_read',
  PRACTICE_DONE: 'practice_done',
  HABIT_COMPLETED: 'habit_completed',
  STEPS_SENT: 'steps_sent',
  EVENT_CLICKED: 'event_clicked',
  EVENT_CONFIRMED: 'event_confirmed',
  REFLECTION_SENT: 'reflection_sent',
  PUSH_SUBSCRIBED: 'push_subscribed',
}