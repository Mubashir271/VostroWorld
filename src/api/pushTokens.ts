// Push-notification device tokens — register / unregister with the backend.
//
// The backend endpoints are not built yet. Until they are:
//   1. PUSH_TOKEN_API_ENABLED stays false, so nothing is sent — the calls only
//      log in development builds;
//   2. the paths and body shape below are placeholders.
// When the APIs arrive, set the real paths, match the body to what the
// backend expects, and flip the flag. Nothing else in the app needs to change.
import { Platform } from 'react-native';
import api from './service';

export const PUSH_TOKEN_API_ENABLED = false;

export const PUSH_TOKEN_ENDPOINTS = {
  register: '/v1/device-tokens/register',     // TODO: replace with the backend's path
  unregister: '/v1/device-tokens/unregister', // TODO: replace with the backend's path
};

export type PushTokenPayload = {
  fcm_token: string;
  platform: 'ios' | 'android';
};

export const buildPushTokenPayload = (token: string): PushTokenPayload => ({
  fcm_token: token,
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
});

export const registerPushToken = async (token: string) => {
  const body = buildPushTokenPayload(token);
  if (!PUSH_TOKEN_API_ENABLED) {
    if (__DEV__) console.log('[push] register (API not enabled yet):', body);
    return;
  }
  await api.post(PUSH_TOKEN_ENDPOINTS.register, body);
};

// `authToken` is passed explicitly because logout clears the stored session
// right after starting this call; the request must still carry the old one.
// `skipAuthRedirect` stops a 401 here from triggering the session-expired
// redirect in service.ts — the user is logging out anyway.
export const unregisterPushToken = async (token: string, authToken: string) => {
  const body = buildPushTokenPayload(token);
  if (!PUSH_TOKEN_API_ENABLED) {
    if (__DEV__) console.log('[push] unregister (API not enabled yet):', body);
    return;
  }
  await api.post(PUSH_TOKEN_ENDPOINTS.unregister, body, {
    headers: { Authorization: `Bearer ${authToken}` },
    skipAuthRedirect: true,
  } as any);
};
