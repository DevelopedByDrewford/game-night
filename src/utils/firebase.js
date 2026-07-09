import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isFirebaseConfigured) {
  console.warn(
    '[firebase] Missing VITE_FIREBASE_* env vars. Copy .env.example to .env.local and fill in ' +
      'your Firebase project config. Auth, Firestore, and Realtime Database calls will fail until then.'
  );
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
// Exported (unlike auth/db/rtdb/functions below) because it's cheap/safe to
// create regardless of config validity — src/utils/pushNotifications.js
// needs it to lazily call getMessaging(app) only in supported, opted-in
// contexts, never eagerly here.
export { app };

// getAuth/getFirestore/getDatabase throw synchronously on an invalid config
// (e.g. empty apiKey), which would crash the whole React tree before it can
// even render the "Firebase isn't configured" message — so skip them entirely
// until real config is present.
export const auth = isFirebaseConfigured ? getAuth(app) : null;
export const db = isFirebaseConfigured ? getFirestore(app) : null;
export const rtdb = isFirebaseConfigured && firebaseConfig.databaseURL ? getDatabase(app) : null;
export const functions = isFirebaseConfigured ? getFunctions(app) : null;
export const googleProvider = new GoogleAuthProvider();
