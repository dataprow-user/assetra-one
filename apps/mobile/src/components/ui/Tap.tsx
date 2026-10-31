import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Pressable with a springy press-down — the shared "this is tappable" feedback
// used on cards, tiles and rows across the app. Layout styles (flex, width…)
// go on `style`; the content scales as one piece.
export default function Tap({
  style, children, scaleTo = 0.97, onPressIn, onPressOut, ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children?: React.ReactNode; scaleTo?: number }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 45, bounciness: 0 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={style}
      onPressIn={(e) => { to(scaleTo); onPressIn?.(e); }}
      onPressOut={(e) => { to(1); onPressOut?.(e); }}
    >
      <Animated.View style={{ transform: [{ scale: v }] }}>{children}</Animated.View>
    </Pressable>
  );
}
