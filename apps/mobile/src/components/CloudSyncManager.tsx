import React, { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { getDriveAuth, uploadToDrive, getCloudModificationTime, downloadLatestBackup } from '../utils/googleDriveSync';

const FILENAME = 'Assetra-Backup.json';
const LAST_BACKUP_KEY = 'a1_last_backup';

const getLastBackupTime = async () => {
  const raw = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  return raw ? Number(raw) : 0;
};
const setLastBackupTime = async () => AsyncStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));

// Invisible background manager — mirrors web App.jsx's CloudSyncManager.
// 1) Auto-pull: on mount, if Drive has a newer backup than our local copy,
//    silently download and restore it.
// 2) Auto-push: whenever state changes, after a 5s debounce, silently upload
//    to Drive (skipped while empty or while a pull is in flight).
export default function CloudSyncManager() {
  const { state, importData } = useApp();
  const syncingRef = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const auth = await getDriveAuth();
      if (!auth) return;
      try {
        const cloudTimeStr = await getCloudModificationTime(FILENAME);
        if (!cloudTimeStr) return;
        const cloudTime = new Date(cloudTimeStr).getTime();
        const localTime = await getLastBackupTime();
        if (cloudTime > localTime + 10000) {
          syncingRef.current = true;
          const cloudData = await downloadLatestBackup(FILENAME);
          const hasData = (cloudData?.transactions?.length || cloudData?.assets?.length || cloudData?.accounts?.length);
          if (cloudData && hasData) {
            importData(cloudData);
            await setLastBackupTime();
          }
          syncingRef.current = false;
        }
      } catch {
        syncingRef.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    const isEmpty = !state.transactions?.length && !state.assets?.length && !state.accounts?.length;
    if (syncingRef.current || isEmpty) return;

    pushTimer.current = setTimeout(async () => {
      const auth = await getDriveAuth();
      if (!auth) return;
      try {
        await uploadToDrive(JSON.stringify(state), FILENAME);
        await setLastBackupTime();
      } catch {
        // Silent — the user can still manually Sync Now from Settings.
      }
    }, 5000);

    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [state]);

  return null;
}
