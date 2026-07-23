import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIdentity } from './googleAuth';
import { trackUserEvent } from './userTracker';

// Ported from apps/web/src/utils/googleDriveSync.js. The Drive REST calls are
// plain fetch — identical logic to the web app. Connecting Drive uses the
// native Google Sign-In SDK's incremental-scope request (addScopes), same
// split from plain sign-in as the web app (Drive access is a separate,
// later step, not bundled into login).

const STORAGE_KEY = 'a1_gdrive_auth';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export async function getDriveAuth(): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveDriveAuth(auth: any) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export async function disconnectDrive() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Silently gets a fresh Drive access token from the native Google Sign-In
 * SDK — it holds a refresh token internally and renews under the hood, no
 * user interaction needed, as long as the Drive scope was already granted.
 */
async function refreshDriveAuth() {
  const tokens = await GoogleSignin.getTokens();
  if (!tokens?.accessToken) throw new Error('AUTH_EXPIRED');
  const authData = { accessToken: tokens.accessToken, expiresAt: Date.now() + 55 * 60 * 1000 };
  await saveDriveAuth(authData);
  return authData;
}

/** fetch with the current Drive token; on a 401, refreshes once and retries before giving up. */
async function authorizedFetch(url: string, options: RequestInit = {}, _retried = false): Promise<Response> {
  const auth = await getDriveAuth();
  if (!auth) throw new Error('Not connected to Google Drive.');

  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers as any), Authorization: `Bearer ${auth.accessToken}` },
  });

  if (res.status === 401 && !_retried) {
    await refreshDriveAuth();
    return authorizedFetch(url, options, true);
  }
  return res;
}

/**
 * Requests Drive access as its own step, separate from signing in — same
 * split as the web app. Requires the user to already be signed in (via
 * useGoogleSignIn) since addScopes is an incremental authorization on the
 * existing native session. Kept as a `use*` hook for API-shape parity with
 * the previous implementation, though nothing here actually needs React.
 */
export function useGoogleDriveConnect() {
  const connect = async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
    const tokens = await GoogleSignin.getTokens();
    if (!tokens?.accessToken) throw new Error('Drive connection failed or was cancelled.');

    // The native SDK doesn't hand back an explicit expiry, so this is a
    // conservative estimate — driveApi() below still detects real expiry via
    // 401 responses regardless of this value.
    const authData = { accessToken: tokens.accessToken, expiresAt: Date.now() + 55 * 60 * 1000 };
    await saveDriveAuth(authData);

    const alreadyLogged = await AsyncStorage.getItem('a1_gdrive_logged');
    if (!alreadyLogged) {
      const identity = await getIdentity();
      trackUserEvent(identity?.name, identity?.email, 'Connected Google Drive');
      await AsyncStorage.setItem('a1_gdrive_logged', 'true');
    }

    return authData;
  };

  return { ready: true, connect };
}

// ── Drive API Operations ─────────────────────────────────────────────────

async function driveApi(path: string, options: RequestInit = {}) {
  const res = await authorizedFetch(`https://www.googleapis.com/drive/v3/${path}`, options);

  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive API Error (${res.status}): ${errorText}`);
  }
  return res.json();
}

async function getOrCreateFolder() {
  const FOLDER_NAME = 'AssetraBackups';
  const query = `'root' in parents and name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await driveApi(`files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
  if (data.files && data.files.length > 0) return data.files[0].id;

  const createData = await driveApi('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] }),
  });
  return createData.id;
}

async function findExistingFile(filename: string, folderId: string) {
  const parent = folderId || 'root';
  const query = `'${parent}' in parents and name='${filename}' and trashed=false`;
  const data = await driveApi(`files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/** Uploads a JSON string to the AssetraBackups folder, creating or updating the file. */
export async function uploadToDrive(jsonString: string, filename: string) {
  const folderId = await getOrCreateFolder();
  const existingFileId = await findExistingFile(filename, folderId);

  const metadata = existingFileId ? {} : { name: filename, parents: folderId ? [folderId] : undefined };

  // Build the multipart/related body by hand — React Native's fetch does not
  // support Blob/FormData multipart uploads, so a string body is used instead.
  const boundary = 'assetra_boundary_7MA4YWxkTrZu0gW';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${jsonString}\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const res = await authorizedFetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) throw new Error('Upload failed: ' + (await res.text()));
  return res.json();
}

export async function getCloudModificationTime(filename: string): Promise<string | null> {
  const auth = await getDriveAuth();
  if (!auth) return null;

  try {
    const folderId = await getOrCreateFolder();
    const query = `'${folderId}' in parents and name='${filename}' and trashed=false`;
    const data = await driveApi(`files?q=${encodeURIComponent(query)}&fields=files(id,modifiedTime)&t=${Date.now()}`);
    return data.files && data.files.length > 0 ? data.files[0].modifiedTime : null;
  } catch {
    // Silent — a background check failing (expired auth after a failed
    // refresh, network hiccup, etc.) shouldn't surface a dev-mode error
    // overlay; callers already treat a null return as "nothing to sync".
    return null;
  }
}

export async function downloadLatestBackup(filename: string) {
  const folderId = await getOrCreateFolder();
  const fileId = await findExistingFile(filename, folderId);
  if (!fileId) throw new Error('Backup file not found in Google Drive.');

  const res = await authorizedFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });

  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) throw new Error('Failed to download backup data.');
  return res.json();
}
