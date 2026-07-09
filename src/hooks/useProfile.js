import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from './useAuth.jsx';

// With no `uid`, reads (and seeds, on first-ever load) the signed-in user's
// own profile — the original behavior every existing call site relies on.
// Passing a `uid` reads that *other* user's profile read-only instead (no
// seeding — only the profile owner's own useProfile() call ever creates
// their doc), for viewing someone else's /profile/:uid page.
export function useProfile(uid) {
  const { user } = useAuth();
  const targetUid = uid || user?.uid;
  const isOwnProfile = !uid || uid === user?.uid;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUid || !db) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    const ref = doc(db, 'users', targetUid);

    if (isOwnProfile) {
      // Seed the profile from the Google account on first sign-in only —
      // displayName/avatarUrl (and everything else) become user-owned fields
      // after that, so profile customization sticks across future sign-ins.
      (async () => {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            displayName: user.displayName || 'Player',
            avatarUrl: user.photoURL || null,
            createdAt: serverTimestamp(),
            stats: {},
          });
        }
      })().catch((err) => console.error('[useProfile] failed to create profile', err));
    }

    const unsubscribe = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [targetUid, isOwnProfile, user?.displayName, user?.photoURL]);

  return { profile, loading, isOwnProfile };
}
