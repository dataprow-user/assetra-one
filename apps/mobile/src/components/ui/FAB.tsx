import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadow } from '../../constants/theme';

// Mirrors the web app's AddTransactionFAB — a single, unmistakable circular
// "+" that is the one consistent way to add a transaction from any screen.
// `raised` lifts it above the tab bar on tab screens; otherwise it sits just
// above the system gesture bar.
export default function FAB({ onPress, raised = false }: { onPress: () => void; raised?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + (raised ? 80 : 24);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, { bottom }, pressed && { transform: [{ scale: 0.94 }] }]}>
      <LinearGradient colors={Colors.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
        <Plus size={28} color="#fff" strokeWidth={2.5} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20, ...Shadow.glow },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
