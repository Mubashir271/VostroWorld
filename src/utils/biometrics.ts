import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const rnBiometrics = new ReactNativeBiometrics();
const CRED_KEY = '@vostro/biometric_creds';

export const checkBiometricAvailability = () =>
  rnBiometrics.isSensorAvailable();

export const promptBiometric = (message = 'Log in to Vostro') =>
  rnBiometrics.simplePrompt({
    promptMessage: message,
    cancelButtonText: 'Cancel',
  });

export const saveCredentials = (email: string, password: string) =>
  AsyncStorage.setItem(CRED_KEY, JSON.stringify({ email, password }));

export const getCredentials = async (): Promise<{ email: string; password: string } | null> => {
  const raw = await AsyncStorage.getItem(CRED_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearCredentials = () => AsyncStorage.removeItem(CRED_KEY);
