import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from './useAuth.jsx';

const FEED_LIMIT = 20;

// users/{uid}/activity — new follower, game won/lost. Written only by
// Cloud Functions (functions/lib/social.js's onFollowed trigger,
// functions/lib/handlers.js's logGameActivity); single-field orderBy needs
// no composite index.
export function useActivity() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }

    const q = query(
      collection(db, 'users', user.uid, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(FEED_LIMIT)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[useActivity] failed to load activity feed', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { entries, loading };
}
