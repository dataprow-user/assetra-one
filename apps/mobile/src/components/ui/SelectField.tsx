import React, { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { ChevronDown, X, Check } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing, Shadow } from '../../constants/theme';

export type SelectOption = { label: string; value: string };

export default function SelectField({
  label, hint, value, options, onChange, placeholder = 'Select…', disabled, error, style,
}: {
  label: string;
  hint?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.group, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Pressable
        style={[styles.input, error ? styles.inputInvalid : null, disabled ? styles.inputDisabled : null]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={[styles.valueText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={16} color={Colors.text3} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <X size={20} color={Colors.text2} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: Colors.panelHover }]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>{item.label}</Text>
                  {item.value === value && <Check size={16} color={Colors.accentLight} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No options available</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2 },
  hint: { fontSize: FontSize.sm, color: Colors.text3 },
  input: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inputInvalid: { borderColor: Colors.red },
  inputDisabled: { opacity: 0.5 },
  valueText: { fontSize: FontSize.md, color: Colors.text1, flex: 1 },
  placeholder: { color: Colors.text3 },
  error: { marginTop: 5, color: Colors.red, fontSize: FontSize.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#141824', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderStrong, paddingBottom: Spacing.xl, ...Shadow.xl,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  optionText: { fontSize: FontSize.md, color: Colors.text1 },
  optionTextActive: { color: Colors.accentLight, fontWeight: '600' },
  emptyText: { padding: Spacing.lg, color: Colors.text2, textAlign: 'center' },
});
