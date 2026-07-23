import React, { useState, useEffect, useRef } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/theme';
import FAB from '../../components/ui/FAB';
import TransactionFormModal from '../../components/TransactionFormModal';
import OnboardingTour from '../../components/OnboardingTour';
import CloudSyncManager from '../../components/CloudSyncManager';
import PinLockScreen from '../../components/PinLockScreen';
import { hasPin } from '../../utils/appLock';

const ONBOARDING_KEY = 'a1_onboarded';
const LAST_ACTIVE_KEY = 'a1_last_active';
const AUTO_SIGNOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days of inactivity

// Persistent overlay (FAB) across every screen in the authenticated app —
// same idea as the web app's app-wide "Add Transaction" button. Detail
// screens (assets, liabilities, ...) are pushed on top of the tab bar as
// regular stack screens, each rendering its own themed ScreenHeader.
export default function AppLayout() {
  const { state, currentUser, forceOnboarding, setForceOnboarding, justSignedIn, setJustSignedIn, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);

  // Signs out (forcing a fresh Google sign-in) if the app hasn't been opened
  // in AUTO_SIGNOUT_MS. Returns true if it signed out, so the caller can skip
  // any lock check that no longer applies. Always refreshes the timestamp.
  const checkAutoSignoutAndTouch = async () => {
    const lastRaw = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    const last = lastRaw ? Number(lastRaw) : Date.now();
    const expired = Date.now() - last > AUTO_SIGNOUT_MS;
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    if (expired) { logout(); return true; }
    return false;
  };

  // Lock on cold start only for a RESUMED session (identity restored from
  // storage) — a fresh interactive Google sign-in (justSignedIn) skips this
  // once so it isn't immediately followed by a PIN prompt too. Also locks
  // again whenever the app returns to the foreground after being backgrounded.
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      if (await checkAutoSignoutAndTouch()) return;
      if (justSignedIn) { setJustSignedIn(false); return; }
      if (await hasPin()) setLocked(true);
    })();

    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = appState.current.match(/inactive|background/);
      if (wasBackground && next === 'active') {
        checkAutoSignoutAndTouch().then((signedOut) => {
          if (signedOut) return;
          hasPin().then((set) => { if (set) setLocked(true); });
        });
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!seen) setShowOnboarding(true);
    })();
  }, [currentUser]);

  const finishOnboarding = () => {
    setShowOnboarding(false);
    setForceOnboarding(false);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
  };

  const handleFabPress = () => {
    if (!state.accounts || state.accounts.length === 0) {
      Alert.alert('Add an account first', "You don't have any accounts yet — add one so this transaction can update its balance.");
      router.push('/(app)/(tabs)/accounts');
      return;
    }
    setShowAdd(true);
  };

  // Hide the FAB while an add/edit modal from a screen is already open isn't
  // trackable here, but the FAB opening its own modal is harmless to stack —
  // RN Modals layer correctly regardless of what's open underneath.
  const hideFabOn = ['/login'];
  const showFab = !hideFabOn.includes(pathname);
  // Tab screens show the bottom tab bar, so lift the FAB above it; detail
  // screens are full-screen stack pushes with no tab bar.
  const tabRoutes = ['/', '/transactions', '/accounts', '/more'];
  const onTabScreen = tabRoutes.includes(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgPrimary }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgPrimary } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="assets" />
        <Stack.Screen name="liabilities" />
        <Stack.Screen name="budgets" />
        <Stack.Screen name="events" />
        <Stack.Screen name="insurance" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="settings" />
      </Stack>
      {showFab && <FAB onPress={handleFabPress} raised={onTabScreen} />}
      {showAdd && <TransactionFormModal visible mode="add" onClose={() => setShowAdd(false)} onError={(msg) => Alert.alert('Error', msg)} />}
      {(showOnboarding || forceOnboarding) && <OnboardingTour onFinish={finishOnboarding} />}
      <CloudSyncManager />
      {locked && <PinLockScreen onUnlock={() => setLocked(false)} />}
    </View>
  );
}
