import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';

// Public per-round game state (turn order, discard piles, tokens, etc.) —
// gameRooms/{roomId}/state/current. Written only by Cloud Functions.
export function useRoomState(roomId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !db) {
      setState(null);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'gameRooms', roomId, 'state', 'current'),
      (snap) => {
        setState(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        console.error('[useRoomState] failed to load game state', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomId]);

  return { state, loading };
}
