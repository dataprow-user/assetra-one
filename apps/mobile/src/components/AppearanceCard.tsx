import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './ui/AppText';
import { Sun, Moon, Smartphone, Palette } from 'lucide-react-native';
import { Card } from './ui';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';

const OPTIONS: { mode: ThemeMode; label: string; Icon: any }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'Auto', Icon: Smartphone },
];

// Light / Dark / Auto (follow the phone) theme switch for Settings.
export default function AppearanceCard() {
  const { mode, setMode } = useTheme();
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.titleRow}>
        <Palette size={18} color={Colors.text2} />
        <Text style={styles.title}>Appearance</Text>
      </View>
      <Text style={styles.desc}>Choose how Assetra One looks. “Auto” follows your phone’s setting.</Text>
      <View style={styles.row}>
        {OPTIONS.map(({ mode: m, label, Icon }) => {
          const active = mode === m;
          return (
            <Pressable key={m} onPress={() => setMode(m)} style={[styles.opt, active && styles.optActive]}>
              <Icon size={20} color={active ? Colors.accentLight : Colors.text2} />
              <Text style={[styles.optText, active && { color: Colors.accentLight }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = createStyles(() => ({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text1 },
  desc: { fontSize: FontSize.sm, color: Colors.text2 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  opt: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.panelHover, borderWidth: 1.5, borderColor: 'transparent',
  },
  optActive: { borderColor: Colors.accentLight, backgroundColor: Colors.accentGlow },
  optText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text2 },
}));
