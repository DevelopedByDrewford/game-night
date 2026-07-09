import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';

const EMPTY_TILES = { vowels: [], consonants: [] };

// The signed-in player's own hand for A Little Wordy —
// gameRooms/{roomId}/hands/{uid}. Not a generalization of useHand.js: the
// two games' hand docs have different shapes (tiles + words here, vs. a
// flat card array there), so this is its own hook rather than a shared one.
export function useWordyHand(roomId, uid) {
  const [hand, setHand] = useState({
    originalTiles: EMPTY_TILES,
    tilesInFront: EMPTY_TILES,
    secretWord: null,
    tiebreakerWord: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !uid || !db) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'gameRooms', roomId, 'hands', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setHand({
            originalTiles: data.originalTiles || EMPTY_TILES,
            tilesInFront: data.tilesInFront || EMPTY_TILES,
            secretWord: data.secretWord || null,
            tiebreakerWord: data.tiebreakerWord || null,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('[useWordyHand] failed to load hand', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [roomId, uid]);

  return { ...hand, loading };
}
