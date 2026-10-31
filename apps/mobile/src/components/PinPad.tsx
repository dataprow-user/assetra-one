import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Delete } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing, createStyles } from '../constants/theme';

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
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} accessibilityElementsHidden />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {KEYS.map((k, i) => (
          <Pressable
            key={i}
            disabled={k === ''}
            onPress={() => press(k)}
            accessibilityRole="button"
            accessibilityLabel={k === 'del' ? 'Delete last digit' : k === '' ? undefined : `Digit ${k}`}
            style={({ pressed }) => [styles.key, k === '' && styles.keyEmpty, pressed && k !== '' && styles.keyPressed]}
          >
            {k === 'del' ? <Delete size={20} color={Colors.text2} /> : <Text style={styles.keyText}>{k}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = createStyles(() => ({
  wrap: { alignItems: 'center', width: '100%' },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text1, textAlign: 'center' },
  subtitle: { fontSize: FontSize.sm, color: Colors.text2, textAlign: 'center', marginTop: 6 },
  dots: { flexDirection: 'row', gap: 18, marginTop: Spacing.xl, marginBottom: Spacing.md },
  dot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.borderStrong },
  dotFilled: { backgroundColor: Colors.accentLight, borderColor: Colors.accentLight, shadowColor: Colors.accentLight, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  error: { color: Colors.red, fontSize: FontSize.sm, marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 228, justifyContent: 'space-between', marginTop: Spacing.lg },
  key: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#2a2f78', shadowOffset: { width: 0, height: 3 }, shadowOpacity: Colors.shadowOpacity < 0.2 ? 0.12 : 0, shadowRadius: 8, elevation: Colors.shadowOpacity < 0.2 ? 2 : 0,
  },
  keyEmpty: { backgroundColor: 'transparent', borderWidth: 0, elevation: 0, shadowOpacity: 0 },
  keyPressed: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentLight },
  keyText: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.text1 },
}));
