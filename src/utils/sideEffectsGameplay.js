import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase.js';

// Side Effects' hidden-info-resolving actions, same pattern as
// gameplay.js/wordyGameplay.js — Cloud Functions rather than client
// transactions, per firestore.rules' state/**, hands/{uid}, and log/**
// blocks (all client write:false). Cloud Function names are prefixed/suffixed
// with "SideEffects" since "playAction"/"endTurn" would collide with other
// games' function names in the same Functions codebase.

export async function dealPsyches({ roomId }) {
  const call = httpsCallable(functions, 'dealPsyches');
  const result = await call({ roomId });
  return result.data;
}

// actionType: 'treat' | 'giveDisorder' | 'therapy' | 'episode' | 'misdiagnosis' | 'highTolerance'
export async function playAction({ roomId, actionType, cardId, targetUid = null, targetDisorderId = null, ownDisorderId = null, handDisorderId = null }) {
  const call = httpsCallable(functions, 'playSideEffectsAction');
  const result = await call({ roomId, actionType, cardId, targetUid, targetDisorderId, ownDisorderId, handDisorderId });
  return result.data;
}

export async function endTurn({ roomId, discardCardIds = [] }) {
  const call = httpsCallable(functions, 'endSideEffectsTurn');
  const result = await call({ roomId, discardCardIds });
  return result.data;
}
