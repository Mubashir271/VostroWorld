// Push-token lifecycle: register on login, re-register when the token
// rotates, unregister on logout.
//
// The last token sent to the backend is kept in AsyncStorage, together with
// the user it was registered for, so logout can unregister exactly that token
// even after an app restart, and a different user logging in on the same
// device replaces it rather than leaving it attached to the previous account.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, unregisterPushToken } from '../../api/pushTokens';
import { getDeviceToken, onDeviceTokenRefresh, deleteDeviceToken } from './tokenProvider';

const STORAGE_KEY = 'push.registeredToken';

type Stored = { token: string; userId: number | string | null };

const readStored = async (): Promise<Stored | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
};

const writeStored = (value: Stored | null) =>
  (value ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)) : AsyncStorage.removeItem(STORAGE_KEY))
    .catch(() => {});

/**
 * Sends this device's token to the backend for the logged-in user. Safe to
 * call repeatedly (login and every app launch with a saved session): the
 * backend call is meant to be idempotent, and it is what keeps the server's
 * copy fresh if a previous attempt failed.
 */
export const registerDeviceForPush = async (userId: number | string | null) => {
  try {
    const token = await getDeviceToken();
    if (!token) return;
    await registerPushToken(token);
    await writeStored({ token, userId });
  } catch (e) {
    if (__DEV__) console.log('[push] register failed:', e);
  }
};

/**
 * Removes this device's token from the backend. Call it BEFORE clearing the
 * session, passing the still-valid auth token; it never blocks logout.
 */
export const unregisterDeviceForPush = async (authToken: string | null) => {
  const stored = await readStored();
  await writeStored(null);
  if (stored?.token && authToken) {
    try {
      await unregisterPushToken(stored.token, authToken);
    } catch (e) {
      if (__DEV__) console.log('[push] unregister failed:', e);
    }
  }
  // Drop the local token too, so the next user gets a fresh one.
  await deleteDeviceToken().catch(() => {});
};

/** Session already gone (e.g. a 401): nothing to authenticate with, just forget the token. */
export const forgetDevicePushToken = () => writeStored(null);

/** Re-registers whenever the OS issues a new token. Returns an unsubscribe. */
export const watchDeviceTokenRefresh = (userId: number | string | null) =>
  onDeviceTokenRefresh(async token => {
    try {
      await registerPushToken(token);
      await writeStored({ token, userId });
    } catch (e) {
      if (__DEV__) console.log('[push] refresh register failed:', e);
    }
  });
