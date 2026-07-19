/**
 * googleDriveSync.js
 * 
 * Handles Google Drive API integration for cloud backups.
 * Uses Google Identity Services (GSI) for authentication.
 */

const STORAGE_KEY = 'a1_gdrive_auth';

// ── Authentication ─────────────────────────────────────────────────────────────

export function getDriveAuth() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveDriveAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function disconnectDrive() {
  localStorage.removeItem(STORAGE_KEY);
}

export function connectGoogleDrive() {
  return new Promise((resolve, reject) => {
    if (!window.google) return reject(new Error('Google Identity Services not loaded.'));
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return reject(new Error('Google Client ID is missing in configuration.'));

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      callback: async (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const userInfo = await res.json();
            
            const authData = {
              accessToken: tokenResponse.access_token,
              expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            };
            saveDriveAuth(authData);
            resolve(authData);
          } catch (err) {
            reject(new Error('Failed to fetch user profile: ' + err.message));
          }
        } else {
          reject(new Error('Authentication failed or was cancelled.'));
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// ── Drive API Operations ───────────────────────────────────────────────────────

async function driveApi(path, options = {}) {
  const auth = getDriveAuth();
  if (!auth) throw new Error('Not connected to Google Drive.');
  
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });

  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive API Error (${res.status}): ${errorText}`);
  }
  return res.json();
}

/** 
 * Finds the AssetraBackups folder, or creates it if it doesn't exist.
 * Returns the folder ID.
 */
async function getOrCreateFolder() {
  const FOLDER_NAME = 'AssetraBackups';
  // Search for the folder in root
  const query = `'root' in parents and name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const data = await driveApi(`files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create it if not found
  const createData = await driveApi('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root']
    })
  });
  
  return createData.id;
}

/**
 * Searches for an existing file with the exact name in the target folder.
 */
async function findExistingFile(filename, folderId) {
  const parent = folderId || 'root';
  const query = `'${parent}' in parents and name='${filename}' and trashed=false`;
  const data = await driveApi(`files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Uploads a file (Blob) to the AssetraBackups folder in Drive using FormData multipart upload.
 * If a file with the same name exists, it UPDATES it (creating a new version in Drive).
 */
export async function uploadToDrive(fileBlob, filename) {
  const auth = getDriveAuth();
  if (!auth) throw new Error('Not connected to Google Drive.');

  // Always use the AssetraBackups folder
  const folderId = await getOrCreateFolder();

  // Check if file already exists so we can overwrite it
  const existingFileId = await findExistingFile(filename, folderId);

  const metadata = existingFileId ? {} : {
    name: filename,
    parents: folderId ? [folderId] : undefined
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileBlob);

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
    },
    body: form
  });

  if (res.status === 401) throw new Error('AUTH_EXPIRED');
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error('Upload failed: ' + errorText);
  }

  return res.json();
}
