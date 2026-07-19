/**
 * fileSystemSync.js
 *
 * Uses the File System Access API to let users choose a local folder (e.g. their
 * Google Drive / OneDrive / Dropbox synced folder) and automatically write backup
 * files there on schedule — no OAuth, no passwords, no server.
 *
 * The FileSystemDirectoryHandle is persisted in IndexedDB (it cannot go in localStorage).
 */

const DB_NAME  = 'assetra-fs-db';
const DB_VER   = 1;
const STORE    = 'handles';
const HANDLE_KEY = 'backup-dir';
const FOLDER_NAME_KEY = 'a1_backup_folder_name'; // human-readable label in localStorage

// ── IndexedDB helpers ──────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function saveHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function loadHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(HANDLE_KEY);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch { return null; }
}

export async function clearHandle() {
  localStorage.removeItem(FOLDER_NAME_KEY);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(HANDLE_KEY);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// Save a human-readable label so we can show it without re-querying IDB
export function saveFolderName(name) { localStorage.setItem(FOLDER_NAME_KEY, name); }
export function getSavedFolderName() { return localStorage.getItem(FOLDER_NAME_KEY) || null; }

// ── Permission helpers ─────────────────────────────────────────────────────────

/** Verify/re-request readwrite permission for the stored handle. */
export async function verifyPermission(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

// ── Core file write ────────────────────────────────────────────────────────────

/**
 * Write a string to a file inside the chosen backup folder.
 * Returns true on success, throws on failure.
 */
export async function writeBackupFile(content, filename) {
  const handle = await loadHandle();
  if (!handle) throw new Error('No backup folder selected.');
  const allowed = await verifyPermission(handle);
  if (!allowed)  throw new Error('Permission denied for backup folder.');
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable   = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return true;
}

// ── Browser support check ──────────────────────────────────────────────────────
export const isFSASupported = () => typeof window.showDirectoryPicker === 'function';

// ── User-facing: open folder picker ───────────────────────────────────────────
export async function pickBackupFolder() {
  if (!isFSASupported()) throw new Error('Your browser does not support folder selection. Please use Chrome or Edge.');
  const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'assetra-backup' });
  await saveHandle(handle);
  saveFolderName(handle.name);
  return handle.name;
}
