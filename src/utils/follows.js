import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

// One-directional follow, no approval step — matches the roadmap's decision.
export async function followUser({ uid, targetUid }) {
  if (uid === targetUid) throw new Error('CANNOT_FOLLOW_SELF');

  const targetSnap = await getDoc(doc(db, 'users', targetUid));
  if (!targetSnap.exists()) throw new Error('USER_NOT_FOUND');

  await setDoc(doc(db, 'users', uid, 'follows', targetUid), { since: serverTimestamp() });
}
