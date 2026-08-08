import AsyncStorage from '@react-native-async-storage/async-storage';

// A guaranteed, silent local copy of app state taken right before a
// destructive action (Reset, Load Sample). Unlike the share-sheet export
// (Sharing.shareAsync resolves as soon as the OS sheet is dismissed, whether
// or not the user actually saved the file anywhere), this is a plain
// AsyncStorage write — it either succeeds or throws, with no ambiguous
// "did the user actually keep it?" middle ground. Settings can restore it if
// a Reset/Load Sample turns out to have been a mistake.
const SNAPSHOT_KEY = 'a1_safety_snapshot';
const SNAPSHOT_META_KEY = 'a1_safety_snapshot_meta';

export async function saveSafetySnapshot(state: any, reason: 'reset' | 'sample') {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state));
  await AsyncStorage.setItem(SNAPSHOT_META_KEY, JSON.stringify({ reason, savedAt: Date.now() }));
}

export async function getSafetySnapshotMeta(): Promise<{ reason: 'reset' | 'sample'; savedAt: number } | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_META_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function loadSafetySnapshot(): Promise<any | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  return raw ? JSON.parse(raw) : null;
}
