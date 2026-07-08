import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';

// The signed-in player's own hidden hand — gameRooms/{roomId}/hands/{uid}.
// Firestore rules only let a player read their own hand doc.
export function useHand(roomId, uid) {
  const [hand, setHand] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !uid || !db) {
      setHand([]);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'gameRooms', roomId, 'hands', uid),
      (snap) => {
        setHand(snap.exists() ? snap.data().cards || [] : []);
        setLoading(false);
      },
      (err) => {
        console.error('[useHand] failed to load hand', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomId, uid]);

  return { hand, loading };
}
