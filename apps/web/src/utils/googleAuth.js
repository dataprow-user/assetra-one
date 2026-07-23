/**
 * googleAuth.js
 *
 * Lightweight Google identity sign-in — establishes who the user is
 * (name/email/picture) WITHOUT requesting any Google Drive access.
 * Drive connection is a separate, later step handled by googleDriveSync.js.
 */

const IDENTITY_KEY = 'a1_identity';

export function getIdentity() {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveIdentity(identity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function clearIdentity() {
  localStorage.removeItem(IDENTITY_KEY);
}

const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Fetches the Google profile for an access token.
 * Adds a timeout and a single retry so a transient network hiccup doesn't fail
 * the whole sign-in, and turns the browser's opaque "Failed to fetch"
 * (TypeError — request never reached the network, usually an ad/tracking
 * blocker or a dropped connection) into an actionable message.
 */
async function fetchUserInfo(accessToken, attempt = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('Google rejected the sign-in (permission not granted). Please try again.');
      }
      throw new Error(`Google returned an error (${res.status}). Please try again.`);
    }
    return await res.json();
  } catch (err) {
    // Retry once on a genuine network failure (Failed to fetch / abort/timeout).
    const isNetwork = err.name === 'TypeError' || err.name === 'AbortError';
    if (isNetwork && attempt < 2) {
      return fetchUserInfo(accessToken, attempt + 1);
    }
    if (isNetwork) {
      throw new Error(
        "Couldn't reach Google to load your profile. Check your internet connection, " +
        'and disable any ad/tracking blocker for this site, then try again.'
      );
    }
    throw err; // already a clear message (bad status, etc.)
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Signs the user in with their Google identity only (openid/email/profile).
 * No `prompt` is forced, so Google only shows a consent/account screen the
 * first time (or if access was revoked) — repeat sign-ins are silent.
 */
export function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    if (!window.google) return reject(new Error('Google Identity Services not loaded.'));

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return reject(new Error('Google Client ID is missing in configuration.'));

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
            const userInfo = await fetchUserInfo(tokenResponse.access_token);
            const identity = { email: userInfo.email, name: userInfo.name, picture: userInfo.picture };
            saveIdentity(identity);
            resolve(identity);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('Sign-in failed or was cancelled.'));
        }
      },
      error_callback: (err) => {
        reject(new Error(err?.message || 'Google sign-in was cancelled or blocked (check pop-up settings).'));
      },
    });

    tokenClient.requestAccessToken();
  });
}
