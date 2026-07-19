/**
 * autoBackup.js
 * Schedule management + auto-backup trigger (folder write or download fallback).
 */

import { isBackupDue, setLastBackupTime } from './backupSchedule';
import { loadHandle, verifyPermission, isFSASupported } from './fileSystemSync';

export { isBackupDue, setLastBackupTime } from './backupSchedule';

/** Build the full backup payload from app state */
export function buildBackupPayload(state) {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    household:         state.household,
    accounts:          state.accounts          || [],
    transactions:      state.transactions      || [],
    assets:            state.assets            || [],
    assetTypes:        state.assetTypes        || [],
    liabilities:       state.liabilities       || [],
    liabilityTypes:    state.liabilityTypes    || [],
    budgets:           state.budgets           || [],
    events:            state.events            || [],
    insurance:         state.insurance         || [],
    expenseCategories: state.expenseCategories || [],
    incomeCategories:  state.incomeCategories  || [],
    groups:            state.groups            || [],
  };
}

/**
 * Try to auto-backup to the user's chosen folder.
 * Returns { ok, method, error? }
 *   method: 'folder' — written silently to chosen folder
 *   method: 'none'   — no folder chosen, caller should show download banner
 */
export async function runAutoBackup(state) {
  if (!isBackupDue()) return { ok: true, method: 'not-due' };

  if (!isFSASupported()) return { ok: false, method: 'unsupported' };

  try {
    const handle = await loadHandle();
    if (!handle) return { ok: false, method: 'none' };

    const allowed = await verifyPermission(handle);
    if (!allowed)  return { ok: false, method: 'permission-denied' };

    const payload  = buildBackupPayload(state);
    const json     = JSON.stringify(payload, null, 2);
    const filename = `assetra-backup-${new Date().toISOString().split('T')[0]}.json`;
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    setLastBackupTime();
    return { ok: true, method: 'folder', filename };
  } catch (e) {
    return { ok: false, method: 'error', error: e.message };
  }
}
