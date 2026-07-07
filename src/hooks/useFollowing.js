import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from './useAuth.jsx';

export function useFollowing() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setFriends([]);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'follows'),
      async (snap) => {
        const uids = snap.docs.map((d) => d.id);
        const profiles = await Promise.all(
          uids.map(async (uid) => {
            const profileSnap = await getDoc(doc(db, 'users', uid));
            return profileSnap.exists()
              ? { uid, ...profileSnap.data() }
              : { uid, displayName: 'Unknown player' };
          })
        );
        setFriends(profiles);
        setLoading(false);
      },
      (err) => {
        console.error('[useFollowing] failed to load follows', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { friends, loading };
}
