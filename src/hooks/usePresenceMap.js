import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../utils/firebase.js';

// Reads global /presence for a set of uids (e.g. the Friends list).
export function usePresenceMap(uids) {
  const [statuses, setStatuses] = useState({});
  const key = (uids || []).join(',');

  useEffect(() => {
    if (!rtdb || !uids || uids.length === 0) {
      setStatuses({});
      return undefined;
    }

    const unsubscribes = uids.map((uid) =>
      onValue(ref(rtdb, `presence/${uid}`), (snap) => {
        setStatuses((prev) => ({ ...prev, [uid]: snap.val()?.state === 'online' }));
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return statuses;
}
