import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
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
    if (!clientId) throw new Error("Google Sign-In isn't set up yet (missing client ID). Please contact support.");
    ensureConfigured();

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) throw new Error('Sign-in was cancelled.');

      const { user } = response.data;
      const identity = { email: user.email, name: user.name || '', picture: user.photo || '' };
      await saveIdentity(identity);
      return identity;
    } catch (err: any) {
      // Turn the SDK's coded errors into clear, actionable messages.
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            throw new Error('Sign-in was cancelled.');
          case statusCodes.IN_PROGRESS:
            throw new Error('A sign-in is already in progress — please wait a moment.');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services is missing or out of date. Update it from the Play Store and try again.');
        }
      }
      const msg = String(err?.message || '');
      // DEVELOPER_ERROR (native code 10) = this build's SHA-1/OAuth client isn't registered.
      if (String(err?.code) === '10' || /DEVELOPER_ERROR/i.test(msg)) {
        throw new Error("This app build isn't registered for Google Sign-In yet (configuration error). Please contact support.");
      }
      if (/network|timeout|unable to resolve host|failed to connect|ECONN/i.test(msg)) {
        throw new Error("Couldn't reach Google. Check your internet connection and try again.");
      }
      // Already-clear message we threw above, or a reasonable fallback.
      if (err instanceof Error && msg && !/statusCode|getTokens|\bnull\b/i.test(msg)) throw err;
      throw new Error('Google sign-in failed. Please try again.');
    }
  };

  return { ready: !!clientId, signIn };
}
