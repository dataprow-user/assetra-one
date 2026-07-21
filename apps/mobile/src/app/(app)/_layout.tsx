import React, { useState } from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Colors } from '../../constants/theme';
import FAB from '../../components/ui/FAB';
import TransactionFormModal from '../../components/TransactionFormModal';

// Persistent overlay (FAB) across every screen in the authenticated app —
// same idea as the web app's app-wide "Add Transaction" button. Detail
// screens (assets, liabilities, ...) are pushed on top of the tab bar as
// regular stack screens, each rendering its own themed ScreenHeader.
export default function AppLayout() {
  const { state } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [showAdd, setShowAdd] = useState(false);

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
      {showFab && <FAB onPress={handleFabPress} />}
      {showAdd && <TransactionFormModal visible mode="add" onClose={() => setShowAdd(false)} onError={(msg) => Alert.alert('Error', msg)} />}
    </View>
  );
}
