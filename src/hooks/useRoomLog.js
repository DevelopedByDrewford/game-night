import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';

// Public play-by-play log — gameRooms/{roomId}/log/*. Ordered by `seq`, a
// monotonic counter Cloud Functions stamp on each entry (not createdAt,
// since same-millisecond server timestamps aren't reliably orderable).
// Single-field orderBy needs no composite index.
export function useRoomLog(roomId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !db) {
      setEntries([]);
      setLoading(false);
      return undefined;
    }

    const q = query(collection(db, 'gameRooms', roomId, 'log'), orderBy('seq'));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[useRoomLog] failed to load log', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomId]);

  return { entries, loading };
}
