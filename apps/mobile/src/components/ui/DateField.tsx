import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing } from '../../constants/theme';

// value/onChange use 'YYYY-MM-DD' strings — same format the reducer/exports expect.
export default function DateField({
  label, value, onChange, style, maximumDate, minimumDate,
}: { label: string; value: string; onChange: (v: string) => void; style?: any; maximumDate?: Date; minimumDate?: Date }) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  const handleChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(selected.toISOString().split('T')[0]);
  };

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={styles.value}>{value || 'Select date'}</Text>
        <CalendarDays size={16} color={Colors.text3} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          themeVariant="dark"
        />
      )}
      {open && Platform.OS === 'ios' && (
        <Pressable style={styles.doneBtn} onPress={() => setOpen(false)}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  input: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  value: { fontSize: FontSize.md, color: Colors.text1 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 14 },
  doneText: { color: Colors.accentLight, fontWeight: '600', fontSize: FontSize.md },
});
