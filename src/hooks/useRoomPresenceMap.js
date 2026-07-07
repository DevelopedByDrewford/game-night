import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../utils/firebase.js';

// Reads /roomPresence for every uid currently marked present in one room
// (e.g. the Lobby's seat rows).
export function useRoomPresenceMap(roomId) {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (!rtdb || !roomId) {
      setStatuses({});
      return undefined;
    }

    const unsubscribe = onValue(ref(rtdb, `roomPresence/${roomId}`), (snap) => {
      const value = snap.val() || {};
      const next = {};
      for (const uid of Object.keys(value)) {
        next[uid] = value[uid]?.state === 'online';
      }
      setStatuses(next);
    });

    return unsubscribe;
  }, [roomId]);

  return statuses;
}
