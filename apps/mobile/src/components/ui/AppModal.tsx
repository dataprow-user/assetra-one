import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing, Shadow } from '../../constants/theme';

// Bottom-sheet modal for every Add/Edit form: a scrollable body for the
// fields plus a fixed footer (Save/Cancel) that stays above the keyboard.
export default function AppModal({
  visible, title, onClose, children, footer,
}: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={Colors.text2} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  box: {
    maxHeight: '85%', backgroundColor: '#141824',
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderStrong, ...Shadow.xl, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1 },
  closeBtn: { padding: 6, borderRadius: Radius.sm },
  body: { padding: Spacing.lg },
  footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: '#141824' },
});
