import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing, FontSize } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

export default function Button({
  title, onPress, variant = 'primary', size = 'md', icon, disabled, loading, style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}) {
  const isSmall = size === 'sm';
  const content = (
    <View style={styles.inner}>
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : Colors.accentLight} /> : icon}
      <Text style={[
        styles.text,
        isSmall && styles.textSm,
        variant === 'ghost' && { color: Colors.text2 },
        variant === 'danger' && { color: Colors.red },
        variant === 'secondary' && { color: Colors.text1 },
        variant === 'primary' && { color: '#fff' },
      ]}>
        {title}
      </Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ opacity: pressed || disabled ? 0.7 : 1 }, style]}>
        <LinearGradient colors={Colors.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.base, isSmall ? styles.baseSm : styles.baseMd]}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isSmall ? styles.baseSm : styles.baseMd,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.dangerOutline,
        { opacity: pressed || disabled ? 0.7 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  baseMd: { paddingVertical: 13, paddingHorizontal: Spacing.xl },
  baseSm: { paddingVertical: 8, paddingHorizontal: Spacing.md },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { fontSize: FontSize.md, fontWeight: '600' },
  textSm: { fontSize: FontSize.base },
  secondary: { backgroundColor: Colors.panelHover, borderWidth: 1, borderColor: Colors.borderStrong },
  ghost: { backgroundColor: 'transparent' },
  dangerOutline: { backgroundColor: Colors.redBg, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)' },
});
