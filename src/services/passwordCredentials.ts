// "Remember me" password saving.
//
// Android: the PasswordCredentials native module (Credential Manager) saves to
// and reads from Google Password Manager for the phone's Google account.
//
// iOS: the app's own Keychain item (react-native-keychain). Saving to the
// Passwords app would need an apple-app-site-association file on
// vostro-new.com, which we can't host, so the login is kept private to the
// app — encrypted, this device only — and filled in on the login screen.
import { NativeModules, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';

type SavedLogin = { id: string; password: string };

const KEYCHAIN_SERVICE = 'com.vostroworld.login';

const Android: {
  save: (id: string, password: string) => Promise<boolean>;
  get: () => Promise<SavedLogin | null>;
} | undefined = Platform.OS === 'android' ? NativeModules.PasswordCredentials : undefined;

/** Android: shows Google's save sheet. iOS: writes the Keychain item. */
export const saveLogin = async (id: string, password: string): Promise<boolean> => {
  try {
    if (Android) return await Android.save(id, password);
    if (Platform.OS === 'ios') {
      return !!(await Keychain.setGenericPassword(id, password, {
        service: KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }));
    }
  } catch {}
  return false;
};

/**
 * Android: shows the saved-logins sheet and returns the pick.
 * iOS: reads the Keychain item silently.
 */
export const getSavedLogin = async (): Promise<SavedLogin | null> => {
  try {
    if (Android) return await Android.get();
    if (Platform.OS === 'ios') {
      const item = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      return item ? { id: item.username, password: item.password } : null;
    }
  } catch {}
  return null;
};

/**
 * iOS: deletes the Keychain item (logging in with "Remember me" unticked).
 * Android can't remove a Google Password Manager entry from the app — the
 * user does that in Google's own settings — so this is a no-op there.
 */
export const forgetLogin = async (): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {}
};
