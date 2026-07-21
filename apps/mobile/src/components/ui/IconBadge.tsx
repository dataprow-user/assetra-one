import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Radius } from '../../constants/theme';

export default function IconBadge({
  icon: Icon, color, size = 38,
}: { icon: React.ComponentType<{ size?: number; color?: string }>; color: string; size?: number }) {
  return (
    <View style={[styles.wrap, { backgroundColor: color + '22', width: size, height: size, borderRadius: size >= 36 ? Radius.sm : Radius.pill }]}>
      <Icon size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
