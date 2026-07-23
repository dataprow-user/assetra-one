import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius, FontSize, Spacing } from '../../constants/theme';

export default function FormField({
  label, hint, error, style, ...inputProps
}: { label: string; hint?: string; error?: string; style?: any } & TextInputProps) {
  return (
    <View style={[styles.group, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        placeholderTextColor={Colors.text3}
        style={[styles.input, error ? styles.inputInvalid : null]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2 },
  hint: { fontSize: FontSize.sm, color: Colors.text3 },
  input: {
    width: '100%', height: 48, paddingHorizontal: 14, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)',
    color: Colors.text1, fontSize: FontSize.md,
  },
  inputInvalid: { borderColor: Colors.red },
  error: { marginTop: 5, color: Colors.red, fontSize: FontSize.sm },
});
