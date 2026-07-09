import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.js';

// The only client write allowed on users/{uid}/activity (see
// firestore.rules — create/update are Cloud-Functions-only, delete is
// self-only) — used to dismiss a responded-to invite or clear an old entry.
export async function dismissActivity({ uid, eventId }) {
  await deleteDoc(doc(db, 'users', uid, 'activity', eventId));
}
