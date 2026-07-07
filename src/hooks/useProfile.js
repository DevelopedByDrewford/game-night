import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from './useAuth.jsx';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    const ref = doc(db, 'users', user.uid);

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

    const unsubscribe = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { profile, loading };
}
