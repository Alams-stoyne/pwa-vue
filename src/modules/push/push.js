// src/modules/push/push.js

// {"publicKey":"BAqETm_cLHiSgmwg-dTfL9-qXU20Mpy41p2_-ZCDc_PE7wotRVex4Jacly9uiAkJtbtuJDwj5gzeww_869Iq5U8","privateKey":"Kff45_imZEaTFZ2-ODGMXQ09DoTKogJcTrty0yxvU4Y"}


// ВАЖНО: Замените это на ваш реальный публичный VAPID-ключ.
// Он будет сгенерирован на шаге 2 (серверная часть).
// const VAPID_PUBLIC_KEY = 'BAqETm_cLHiSgmwg-dTfL9-qXU20Mpy41p2_-ZCDc_PE7wotRVex4Jacly9uiAkJtbtuJDwj5gzeww_869Iq5U8';
const VAPID_PUBLIC_KEY = 'BDcR4MSe-yUPOvp4NKZuUEEwiqiPRqmcDV4CSxp6GlvwJneLQb9bHv0ELndow7h3znWtuZrkK0FZ_TERN1dvyJc';

/**
 * Преобразует VAPID-ключ из base64 в Uint8Array, как того требует PushManager.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Проверяет, поддерживает ли браузер необходимые API.
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Возвращает текущую подписку, если она есть.
 */
export async function getSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Запрашивает разрешение и создает новую подписку.
 * @returns {Promise<PushSubscription | null>}
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    console.warn('[push] Push API не поддерживается в этом браузере.');
    return null;
  }

  // 1. Запрашиваем разрешение у пользователя
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[push] Разрешение на уведомления не получено.');
    return null;
  }

  // 2. Подписываемся
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log('[push] Новая подписка создана:', subscription);
    return subscription;
  } catch (err) {
    console.error('[push] Ошибка при создании подписки:', err);
    return null;
  }
}

/**
 * Отменяет текущую подписку.
 */
export async function unsubscribeFromPush() {
  const subscription = await getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    console.log('[push] Подписка отменена.');
  }
}