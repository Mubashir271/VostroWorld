// Where the device's push token comes from.
//
// Placeholder until Firebase Cloud Messaging is installed: every function is
// a no-op and getDeviceToken() returns null, so the rest of the push flow runs
// end to end without a token. The Firebase step replaces only this file's
// bodies (messaging().getToken(), onTokenRefresh(), deleteToken()).

export const getDeviceToken = async (): Promise<string | null> => null;

/** Calls `onRefresh` whenever the OS rotates the token. Returns an unsubscribe. */
export const onDeviceTokenRefresh = (_onRefresh: (token: string) => void): (() => void) => () => {};

/** Invalidates the device's token locally, so a new one is issued next time. */
export const deleteDeviceToken = async (): Promise<void> => {};
