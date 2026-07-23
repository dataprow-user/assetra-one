import React, { useState } from 'react';
import { Modal, View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandMark from './BrandMark';
import PinPad from './PinPad';
import { verifyPin, clearPin } from '../utils/appLock';
import { useApp } from '../context/AppContext';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

// Full-screen gate shown whenever the app opens or returns from the
// background while a PIN is set — a quick local lock on top of the
// already-persisted Google session (see AGENTS: signing in with Google
// every time was the complaint this replaces).
export default function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { logout } = useApp();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const handleForgot = () => {
    Alert.alert(
      'Forgot your PIN?',
      "You'll be signed out. Sign back in with Google, then set a new PIN from Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => { await clearPin(); onUnlock(); logout(); } },
      ],
    );
  };

  const handleComplete = async (pin: string) => {
    if (await verifyPin(pin)) {
      onUnlock();
    } else {
      setError('Incorrect PIN. Try again.');
      setAttempt((a) => a + 1);
    }
  };

  return (
    <Modal visible transparent={false} animationType="fade">
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe}>
          <LinearGradient colors={Colors.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBadge}>
            <BrandMark size={26} color="#fff" />
          </LinearGradient>
          <View style={styles.padWrap}>
            <PinPad title="Enter PIN" subtitle="Enter your PIN to unlock Assetra One" error={error} onComplete={handleComplete} resetToken={attempt} />
          </View>
          <Pressable onPress={handleForgot} hitSlop={10} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot PIN?</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.bgPrimary },
  safe: { flex: 1, alignItems: 'center', paddingTop: Spacing.xxxl },
  logoBadge: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl, ...Shadow.glow },
  padWrap: { flex: 1, justifyContent: 'center' },
  forgotBtn: { paddingVertical: Spacing.lg },
  forgotText: { color: Colors.text2, fontSize: FontSize.base, fontWeight: '600' },
});
