import { useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { trackPresence } from '../utils/presence.js';

// "Who's here right now" presence, scoped to one room — feeds the Lobby and
// Active Table screens. Separate from the global /presence tree so someone
// can be "online" in the app but not currently looking at this room.
export function useRoomPresence(roomId) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !roomId) return undefined;
    return trackPresence(`roomPresence/${roomId}/${user.uid}`);
  }, [user, roomId]);
}
