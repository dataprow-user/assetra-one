import React from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';

// Material-style bottom sheet used for every "tap to see details" view.
// Tap the dimmed area, the ✕ button, or press Back to dismiss.
export default function Sheet({
  visible, title, subtitle, onClose, children, footer, scroll = true,
}: {
  visible: boolean; title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode; scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close details" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={Colors.text1} />
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = createStyles(() => ({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const), backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: '90%', backgroundColor: Colors.bgSecondary, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, paddingTop: Spacing.sm,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.borderStrong, marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  title: { color: Colors.text1, fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: { color: Colors.text2, fontSize: FontSize.base, marginTop: 2 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.panelHover, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, gap: Spacing.md },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', gap: Spacing.md },
}));
