import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Colors, Radius, FontSize, createStyles } from '../../constants/theme';

export default function Badge({ label, color = Colors.accentLight, style }: { label: string; color?: string; style?: any }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = createStyles(() => ({
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  text: { fontSize: FontSize.sm, fontWeight: '600' },
}));
