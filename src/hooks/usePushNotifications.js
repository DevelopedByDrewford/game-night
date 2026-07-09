import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth.jsx';
import {
  isIOS,
  isStandaloneDisplay,
  isPushSupported,
  enableNotifications,
  disableNotifications,
} from '../utils/pushNotifications.js';

// status: 'checking' | 'unsupported' | 'needs-install' | 'default' | 'denied' | 'enabling' | 'enabled' | 'error'
export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState('checking');
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const supported = await isPushSupported();
      if (cancelled) return;
      if (!supported) {
        setStatus('unsupported');
        return;
      }
      if (isIOS() && !isStandaloneDisplay()) {
        setStatus('needs-install');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      if (Notification.permission === 'default') {
        setStatus('default');
        return;
      }

      // Already granted on a prior visit — silently refresh the token
      // (requestPermission() doesn't re-prompt once decided) rather than
      // making the user tap Enable again every session.
      try {
        const result = await enableNotifications({ uid: user.uid });
        if (cancelled) return;
        setToken(result.token);
        setStatus(result.token ? 'enabled' : 'default');
      } catch (err) {
        console.error('[usePushNotifications] silent token refresh failed', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const enable = useCallback(async () => {
    if (!user) return;
    setStatus('enabling');
    try {
      const result = await enableNotifications({ uid: user.uid });
      setToken(result.token);
      setStatus(result.token ? 'enabled' : result.permission);
    } catch (err) {
      console.error('[usePushNotifications] enable failed', err);
      setStatus('error');
    }
  }, [user]);

  const disable = useCallback(async () => {
    if (!user) return;
    try {
      await disableNotifications({ uid: user.uid, token });
      setToken(null);
      setStatus('default');
    } catch (err) {
      console.error('[usePushNotifications] disable failed', err);
      setStatus('error');
    }
  }, [user, token]);

  return { status, enable, disable };
}
