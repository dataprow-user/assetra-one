import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Delete } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing } from '../constants/theme';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

// Shared numeric keypad + dot indicator, used for both unlocking (verify)
// and creating/changing a PIN (set). Calls onComplete once 4 digits are
// entered; the caller resets `resetToken` (any changing value) to clear it
// back to empty after a wrong PIN or between the two steps of a set flow.
export default function PinPad({
  title, subtitle, error, onComplete, resetToken,
}: { title: string; subtitle?: string; error?: string; onComplete: (pin: string) => void; resetToken?: any }) {
  const [pin, setPin] = useState('');

  useEffect(() => { setPin(''); }, [resetToken]);

  const press = (key: string) => {
    if (key === '' ) return;
    if (key === 'del') { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) onComplete(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {KEYS.map((k, i) => (
          <Pressable
            key={i}
            disabled={k === ''}
            onPress={() => press(k)}
            style={({ pressed }) => [styles.key, pressed && k !== '' && styles.keyPressed]}
          >
            {k === 'del' ? <Delete size={22} color={Colors.text1} /> : <Text style={styles.keyText}>{k}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text1, textAlign: 'center' },
  subtitle: { fontSize: FontSize.base, color: Colors.text2, textAlign: 'center', marginTop: 6 },
  dots: { flexDirection: 'row', gap: 16, marginTop: Spacing.xl, marginBottom: Spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderStrong },
  dotFilled: { backgroundColor: Colors.accentLight, borderColor: Colors.accentLight },
  error: { color: Colors.red, fontSize: FontSize.sm, marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', marginTop: Spacing.lg },
  key: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border,
  },
  keyPressed: { backgroundColor: Colors.panelHover },
  keyText: { fontSize: FontSize.xxl, fontWeight: '600', color: Colors.text1 },
});
