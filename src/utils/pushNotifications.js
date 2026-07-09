import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { app, db, isFirebaseConfigured } from './firebase.js';

// Deliberately isolated from firebase.js — messaging must never be touched
// eagerly at module load (mirrors the isFirebaseConfigured guard already in
// place there for auth/firestore/db: getMessaging-adjacent calls are only
// ever valid in supported, permission-eligible, opted-in contexts).

export function isIOS() {
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports as "MacIntel" but with touch support, unlike a real Mac.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || isIPadOS;
}

export function isStandaloneDisplay() {
  return Boolean(window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

export async function isPushSupported() {
  if (!isFirebaseConfigured) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }
  const { isSupported } = await import('firebase/messaging');
  return isSupported();
}

export async function registerServiceWorker() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
}

// Requests permission (only actually prompts if permission is still
// 'default' — a no-op UI-wise if the user already granted or denied it, so
// this is also safe to call silently on app load to refresh a rotated
// token), fetches an FCM token, and saves it on the user's profile. Must be
// called from a direct user gesture the first time — iOS refuses to show
// the permission prompt otherwise.
export async function enableNotifications({ uid }) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission, token: null };

  const { getMessaging, getToken } = await import('firebase/messaging');
  const registration = await registerServiceWorker();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    await updateDoc(doc(db, 'users', uid), { pushTokens: arrayUnion(token) });
  }

  return { permission, token };
}

export async function disableNotifications({ uid, token }) {
  if (token) {
    await updateDoc(doc(db, 'users', uid), { pushTokens: arrayRemove(token) });
  }
  try {
    const { getMessaging, deleteToken } = await import('firebase/messaging');
    await deleteToken(getMessaging(app));
  } catch (err) {
    // Best-effort — the Firestore removal above is what actually stops
    // server-side sends, so a local deleteToken failure isn't fatal.
    console.error('[pushNotifications] deleteToken failed', err);
  }
}
