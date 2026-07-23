import React, { useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import PinPad from './PinPad';
import { setPin as savePin } from '../utils/appLock';
import { Colors, Spacing } from '../constants/theme';

// Two-step create/change PIN flow: enter a new PIN, then confirm it matches
// before saving. Used both for first-time setup and "Change PIN" in Settings.
export default function PinSetupModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [stage, setStage] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const handleFirst = (pin: string) => {
    setFirstPin(pin);
    setError('');
    setStage('confirm');
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setError("PINs didn't match. Start over.");
      setStage('create');
      setFirstPin('');
      setAttempt((a) => a + 1);
      return;
    }
    await savePin(pin);
    onSaved();
  };

  return (
    <Modal visible transparent={false} animationType="fade">
      <View style={styles.bg}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <X size={22} color={Colors.text2} />
        </Pressable>
        <View style={styles.padWrap}>
          {stage === 'create' ? (
            <PinPad title="Create a PIN" subtitle="Choose a 4-digit PIN to unlock the app quickly" onComplete={handleFirst} resetToken={attempt} />
          ) : (
            <PinPad title="Confirm PIN" subtitle="Enter the same PIN again" error={error} onComplete={handleConfirm} resetToken={stage} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.bgPrimary, paddingTop: 56 },
  closeBtn: { position: 'absolute', top: 56, right: Spacing.lg, zIndex: 1, padding: 6 },
  padWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
