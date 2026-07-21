import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, FontSize } from '../../constants/theme';

export default function Badge({ label, color = Colors.accentLight, style }: { label: string; color?: string; style?: any }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: FontSize.sm, fontWeight: '600' },
});
