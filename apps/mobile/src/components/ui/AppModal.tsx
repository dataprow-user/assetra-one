import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing, Shadow } from '../../constants/theme';

// Mirrors the web app's components/Modal.jsx — a titled panel with a close
// button and a scrollable body, used for every Add/Edit form.
export default function AppModal({
  visible, title, onClose, children,
}: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
          <View style={styles.box}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <X size={20} color={Colors.text2} />
              </Pressable>
            </View>
            <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: Spacing.xl }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.lg },
  kav: { maxHeight: '90%' },
  box: {
    backgroundColor: '#141824', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderStrong,
    ...Shadow.xl, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1 },
  closeBtn: { padding: 6, borderRadius: Radius.sm },
  body: { padding: Spacing.lg },
});
