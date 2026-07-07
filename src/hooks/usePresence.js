import { useEffect } from 'react';
import { useAuth } from './useAuth.jsx';
import { trackPresence } from '../utils/presence.js';

// Global "are they using the app at all" presence — feeds the Friends list.
// Mount once near the app root while a user is signed in.
export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return undefined;
    return trackPresence(`presence/${user.uid}`);
  }, [user]);
}
