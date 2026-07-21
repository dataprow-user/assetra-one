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
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const userInfo = await res.json();
            const identity = { email: userInfo.email, name: userInfo.name, picture: userInfo.picture };
            saveIdentity(identity);
            resolve(identity);
          } catch (err) {
            reject(new Error('Failed to fetch user profile: ' + err.message));
          }
        } else {
          reject(new Error('Sign-in failed or was cancelled.'));
        }
      },
    });

    tokenClient.requestAccessToken();
  });
}
