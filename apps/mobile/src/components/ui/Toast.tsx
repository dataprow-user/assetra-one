import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing, Shadow } from '../../constants/theme';

export type ToastType = 'success' | 'error';

export default function Toast({ toast }: { toast: { type: ToastType; msg: string } | null }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: toast ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [toast]);

  if (!toast) return null;
  const isSuccess = toast.type === 'success';

  return (
    <Animated.View
      style={[
        styles.wrap,
        { opacity, backgroundColor: isSuccess ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)', borderColor: isSuccess ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)' },
      ]}
    >
      {isSuccess ? <CheckCircle2 size={16} color={Colors.green} /> : <AlertTriangle size={16} color={Colors.red} />}
      <Text style={[styles.text, { color: isSuccess ? Colors.green : Colors.red }]}>{toast.msg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 100, left: Spacing.lg, right: Spacing.lg, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, borderWidth: 1,
    ...Shadow.xl,
  },
  text: { fontSize: FontSize.base, fontWeight: '500', flex: 1 },
});
