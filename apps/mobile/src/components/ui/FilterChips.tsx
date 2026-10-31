import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from './AppText';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';

export type ChipOption<K extends string = string> = { key: K; label: string; count?: number; color?: string };

// Single-select filter row with live counts — the common way to slice a list.
export default function FilterChips<K extends string>({
  options, value, onChange,
}: { options: ChipOption<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const active = o.key === value;
        const c = o.color || Colors.accentLight;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.chip, active && { backgroundColor: c + '26', borderColor: c + '70' }]}
            accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${o.label}${o.count !== undefined ? `, ${o.count}` : ''}`}>
            {o.color ? <View style={[styles.dot, { backgroundColor: o.color }]} /> : null}
            <Text style={[styles.text, active && { color: c }]}>{o.label}</Text>
            {o.count !== undefined ? (
              <View style={[styles.count, active && { backgroundColor: c + '33' }]}><Text style={[styles.countText, active && { color: c }]}>{o.count}</Text></View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = createStyles(() => ({
  row: { gap: Spacing.sm, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.panel, borderWidth: 1.5, borderColor: Colors.border },
  dot: { width: 9, height: 9, borderRadius: 5 },
  text: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.base },
  count: { minWidth: 24, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panelHover },
  countText: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '800' },
}));
