import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

// One-directional follow, no approval step — matches the roadmap's decision.
// Rejected by firestore.rules (permission-denied) if targetUid has blocked
// uid — see blockUser() below.
export async function followUser({ uid, targetUid }) {
  if (uid === targetUid) throw new Error('CANNOT_FOLLOW_SELF');

  const targetSnap = await getDoc(doc(db, 'users', targetUid));
  if (!targetSnap.exists()) throw new Error('USER_NOT_FOUND');

  await setDoc(doc(db, 'users', uid, 'follows', targetUid), { since: serverTimestamp() });
}

export async function unfollowUser({ uid, targetUid }) {
  await deleteDoc(doc(db, 'users', uid, 'follows', targetUid));
}

// Removes targetUid from uid's following list (if present) and records the
// block, which firestore.rules then uses to reject any future follow from
// targetUid -> uid. The reverse direction — removing uid from *targetUid's*
// following list, so the block isn't one-directional — can't be done from
// here (a client can only write its own follows subcollection); that part
// happens server-side in functions/lib/social.js's onBlocked trigger,
// fired by this doc write.
export async function blockUser({ uid, targetUid }) {
  if (uid === targetUid) throw new Error('CANNOT_BLOCK_SELF');

  await Promise.all([
    setDoc(doc(db, 'users', uid, 'blocks', targetUid), { since: serverTimestamp() }),
    deleteDoc(doc(db, 'users', uid, 'follows', targetUid)),
  ]);
}
