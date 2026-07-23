import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Local app-unlock PIN — separate from the Google session, purely a quick
// "don't make me sign in every time but still lock the screen" gate. Only a
// SHA-256 hash is ever stored, never the plain PIN.
const PIN_HASH_KEY = 'a1_pin_hash';

const hash = (pin: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);

export async function hasPin() {
  return !!(await AsyncStorage.getItem(PIN_HASH_KEY));
}

export async function setPin(pin: string) {
  await AsyncStorage.setItem(PIN_HASH_KEY, await hash(pin));
}

export async function verifyPin(pin: string) {
  const stored = await AsyncStorage.getItem(PIN_HASH_KEY);
  return !!stored && stored === (await hash(pin));
}

export async function clearPin() {
  await AsyncStorage.removeItem(PIN_HASH_KEY);
}
