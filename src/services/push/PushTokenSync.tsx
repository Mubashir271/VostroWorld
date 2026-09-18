// Mounted once in App.tsx. Whenever a session exists — right after login, or
// on launch with a saved session — registers the device token and watches
// for rotations. Logout's unregister lives in utils/logout.ts, because it has
// to run before the session is cleared.
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { registerDeviceForPush, watchDeviceTokenRefresh } from './index';

const PushTokenSync = () => {
  const authToken = useSelector((s: RootState) => s.user.token);
  const userId = useSelector((s: RootState) => s.user.profile?.id ?? null);

  useEffect(() => {
    if (!authToken) return;
    registerDeviceForPush(userId);
    return watchDeviceTokenRefresh(userId);
  }, [authToken, userId]);

  return null;
};

export default PushTokenSync;
