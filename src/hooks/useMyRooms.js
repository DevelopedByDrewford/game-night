import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from './useAuth.jsx';

export function useMyRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setRooms([]);
      setLoading(false);
      return undefined;
    }

    const q = query(
      collection(db, 'gameRooms'),
      where('playerUids', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        // Firestore throws here the first time this composite index (array-contains
        // + orderBy) doesn't exist yet — the error includes a console link to create it.
        console.error('[useMyRooms] query failed — may need a composite index', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { rooms, loading };
}
