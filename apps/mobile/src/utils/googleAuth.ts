import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Uses the native Google Sign-In SDK (not a browser redirect) — the
// Expo-recommended approach, since Expo Go can't register a custom app
// scheme and Google's "Web" OAuth client type only accepts http(s) redirect
// URIs. Requires a Development Build (native module, won't run in Expo Go)
// and an Android/iOS-type OAuth Client ID registered in Google Cloud Console
// alongside the existing Web client (see project notes for exact steps).
//
// Same two-step flow as web: this is identity-only (no Drive scope). Drive
// access is requested later, as its own step, via useGoogleDriveConnect in
// googleDriveSync.ts.

const IDENTITY_KEY = 'a1_identity';
let configured = false;

export function getGoogleClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
}

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: getGoogleClientId(),
    offlineAccess: false,
    scopes: [],
  });
  configured = true;
}

export async function getIdentity() {
  try {
    const raw = await AsyncStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveIdentity(identity: any) {
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export async function clearIdentity() {
  await AsyncStorage.removeItem(IDENTITY_KEY);
}

/**
 * Identity-only Google sign-in via the native SDK. Kept as a `use*` hook to
 * match the previous (expo-auth-session) API shape, so Login.tsx doesn't
 * need to change — there's no async setup to await here, `ready` is
 * effectively always true once the module loads.
 */
export function useGoogleSignIn() {
  const clientId = getGoogleClientId();

  const signIn = async () => {
    if (!clientId) throw new Error('Google Client ID is missing — set EXPO_PUBLIC_GOOGLE_CLIENT_ID in .env.');
    ensureConfigured();

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new Error('Sign-in was cancelled or failed.');

    const { user } = response.data;
    const identity = { email: user.email, name: user.name || '', picture: user.photo || '' };
    await saveIdentity(identity);
    return identity;
  };

  return { ready: !!clientId, signIn };
}
