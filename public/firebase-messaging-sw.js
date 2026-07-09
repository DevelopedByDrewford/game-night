// FCM background service worker. Service workers can't use Vite's module
// resolution, so this loads the compat SDK from Firebase's CDN directly
// (version pinned to match the "firebase" dependency in package.json).
// It also can't read import.meta.env — the registering page passes the
// (non-secret) Firebase web config as a query string on the registration
// URL instead; see src/utils/pushNotifications.js#registerServiceWorker.
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

// Calling this is enough for FCM to auto-display a system notification for
// any message carrying a "notification" payload while the app is in the
// background — no custom onBackgroundMessage handling needed for that case.
firebase.messaging();
