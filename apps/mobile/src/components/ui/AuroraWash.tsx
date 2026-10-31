import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, createStyles } from '../../constants/theme';

// A soft colour wash at the very top of a screen — gives the page a fresh,
// branded feel instead of a flat background. Sits behind everything.
export default function AuroraWash({ height = 300 }: { height?: number }) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <LinearGradient colors={[Colors.accent + '26', Colors.heroTo + '14', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1 }} />
    </View>
  );
}

const styles = createStyles(() => ({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
}));
