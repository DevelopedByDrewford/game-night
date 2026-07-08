import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';

// Hidden-info-resolving actions run as Cloud Functions (Admin SDK) rather
// than client transactions — see firestore.rules' state/**, hands/{uid},
// and log/** blocks, all client write:false.
export async function playCard({ roomId, cardId, targetUid = null, guessCardId = null }) {
  const call = httpsCallable(functions, 'playCard');
  const result = await call({ roomId, cardId, targetUid, guessCardId });
  return result.data;
}
