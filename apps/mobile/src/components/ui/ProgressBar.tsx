import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, createStyles } from '../../constants/theme';

export default function ProgressBar({ pct, color = Colors.accentLight }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = createStyles(() => ({
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.track, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: Radius.pill },
}));
