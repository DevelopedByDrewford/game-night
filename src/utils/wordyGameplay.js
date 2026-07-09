import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';

// A Little Wordy's hidden-info-resolving actions, same pattern as
// gameplay.js's Love Letter wrappers — all run as Cloud Functions (Admin
// SDK) rather than client transactions, per firestore.rules' state/**,
// hands/{uid}, and log/** blocks (all client write:false).

export async function dealTiles({ roomId }) {
  const call = httpsCallable(functions, 'dealTiles');
  const result = await call({ roomId });
  return result.data;
}

export async function submitSecretWord({ roomId, word }) {
  const call = httpsCallable(functions, 'submitSecretWord');
  const result = await call({ roomId, word });
  return result.data;
}

export async function activateClue({ roomId, clueId, args = {} }) {
  const call = httpsCallable(functions, 'activateClue');
  const result = await call({ roomId, clueId, args });
  return result.data;
}

export async function respondToRhyme({ roomId, word }) {
  const call = httpsCallable(functions, 'respondToRhyme');
  const result = await call({ roomId, word });
  return result.data;
}

export async function guessWord({ roomId, guess }) {
  const call = httpsCallable(functions, 'guessWord');
  const result = await call({ roomId, guess });
  return result.data;
}

export async function submitTiebreakerWord({ roomId, word }) {
  const call = httpsCallable(functions, 'submitTiebreakerWord');
  const result = await call({ roomId, word });
  return result.data;
}
