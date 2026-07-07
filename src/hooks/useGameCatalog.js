import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase.js';

export function useGameCatalog() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'gameCatalog'),
      (snap) => {
        setGames(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('[useGameCatalog] failed to load catalog', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { games, loading };
}
