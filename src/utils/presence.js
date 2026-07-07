import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase.js';

// Writes `path` as {state:'online', lastSeen} while connected, and registers
// an onDisconnect write that flips it to {state:'offline', lastSeen} on a
// hard browser close — this is exactly why presence lives in Realtime
// Database rather than Firestore, which has no server-side disconnect hook.
export function trackPresence(path) {
  if (!rtdb) return () => {};

  const presenceRef = ref(rtdb, path);
  const connectedRef = ref(rtdb, '.info/connected');

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;
    onDisconnect(presenceRef)
      .set({ state: 'offline', lastSeen: serverTimestamp() })
      .then(() => set(presenceRef, { state: 'online', lastSeen: serverTimestamp() }));
  });

  return () => {
    unsubscribe();
    set(presenceRef, { state: 'offline', lastSeen: serverTimestamp() });
  };
}
