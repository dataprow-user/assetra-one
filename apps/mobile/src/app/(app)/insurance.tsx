import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, Badge, EmptyState, AppModal, FormField, SelectField, DateField, ScreenHeader } from '../../components/ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { fmt } from '../../utils/format';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Insurance.jsx — same field set, same
// day-count/badge logic for renewal reminders.
const INS_TYPES = ['life', 'health', 'vehicle', 'term'];
const INS_COLORS: Record<string, string> = { life: Colors.blue, health: Colors.green, vehicle: Colors.yellow, term: Colors.accentLight };
const FREQUENCIES = [{ label: 'Monthly', value: 'monthly' }, { label: 'Yearly', value: 'yearly' }];

const emptyForm = () => ({ name: '', type: 'term', policyNo: '', premium: '', frequency: 'yearly', sumAssured: '', nextDue: '' });

const PREMIUM_RULE = { label: 'Premium Amount', min: 1, max: MAX_AMOUNT };
const SUM_ASSURED_RULE = { label: 'Sum Assured', min: 0, max: MAX_AMOUNT, required: false };

const getDaysLeft = (dateStr: string) => {
  if (!dateStr) return null;
  return Math.ceil((+new Date(dateStr) - +new Date()) / 86400000);
};

export default function Insurance() {
  const { state, dispatch, uid } = useApp();
  const { insurance = [] } = state;
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [form, setForm] = useState(emptyForm());
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (p: any) => { setForm({ ...p, premium: String(p.premium ?? ''), sumAssured: String(p.sumAssured ?? '') }); resetErrors(); setModal({ mode: 'edit', data: p }); };

  const setPremium = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('premium', val, PREMIUM_RULE);
    setForm((f) => ({ ...f, premium: val }));
  };
  const setSumAssured = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('sumAssured', val, SUM_ASSURED_RULE);
    setForm((f) => ({ ...f, sumAssured: val }));
  };

  const handleSubmit = () => {
    const premiumErr = validate('premium', form.premium, PREMIUM_RULE);
    const sumErr = validate('sumAssured', form.sumAssured, SUM_ASSURED_RULE);
    if (premiumErr || sumErr) return;
    if (!form.name.trim()) return;

    const payload = { ...form, premium: Number(form.premium), sumAssured: Number(form.sumAssured || 0) };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_INSURANCE', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_INSURANCE', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete this policy?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_INSURANCE', payload: id }) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Insurance Policies"
          subtitle={`${insurance.length} active policies`}
          showBack
          right={<Button title="Add" icon={<Plus size={16} color="#fff" />} size="sm" onPress={openAdd} />}
        />
      </View>

      <FlatList
        data={insurance}
        keyExtractor={(p: any) => p.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon={Shield} title="No Policies" description="Add life, health, vehicle, or term insurance policies." />}
        renderItem={({ item: p }) => {
          const daysLeft = getDaysLeft(p.nextDue);
          const color = INS_COLORS[p.type] || Colors.text2;
          const dueColor = daysLeft === null ? Colors.text2 : daysLeft <= 7 ? Colors.red : daysLeft <= 30 ? Colors.yellow : Colors.green;
          const dueLabel = daysLeft === null ? '' : daysLeft === 0 ? 'Today' : daysLeft < 0 ? 'Overdue' : `${daysLeft}d`;
          return (
            <Card style={styles.policyCard}>
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyName} numberOfLines={1}>{p.name}</Text>
                  {p.policyNo ? <Text style={styles.policyNo}>{p.policyNo}</Text> : null}
                </View>
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => openEdit(p)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDelete(p.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Badge label={p.type} color={color} />
                <Badge label={p.frequency} color={Colors.text2} />
              </View>

              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.statLabel}>Premium</Text>
                  <Text style={styles.premiumValue}>{fmt(p.premium)}</Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Sum Assured</Text>
                  <Text style={styles.sumValue}>{fmt(p.sumAssured)}</Text>
                </View>
              </View>

              <View style={styles.dueRow}>
                {daysLeft !== null ? <Badge label={dueLabel} color={dueColor} /> : null}
                <Text style={styles.dueDate}>{p.nextDue}</Text>
              </View>
            </Card>
          );
        }}
      />

      {modal && (
        <AppModal visible title={modal.mode === 'add' ? 'Add Insurance Policy' : 'Edit Policy'} onClose={() => setModal(null)}>
          <FormField label="Policy Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. LIC Term Plan" />
          <SelectField label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={INS_TYPES.map((t) => ({ label: t, value: t }))} />
          <FormField label="Policy Number" value={form.policyNo} onChangeText={(v) => setForm((f) => ({ ...f, policyNo: v }))} maxLength={MAX_SHORT_LENGTH} placeholder="LIC-XXXXX" />
          <FormField label="Premium Amount (₹)" keyboardType="numbers-and-punctuation" value={form.premium} onChangeText={setPremium} error={errors.premium} placeholder="0" />
          <SelectField label="Frequency" value={form.frequency} onChange={(v) => setForm((f) => ({ ...f, frequency: v }))} options={FREQUENCIES} />
          <FormField label="Sum Assured (₹)" keyboardType="numbers-and-punctuation" value={form.sumAssured} onChangeText={setSumAssured} error={errors.sumAssured} placeholder="0" />
          <DateField label="Next Due Date" value={form.nextDue} onChange={(v) => setForm((f) => ({ ...f, nextDue: v }))} />
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
            <Button title={modal.mode === 'add' ? 'Add Policy' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
          </View>
        </AppModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  policyCard: { gap: Spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  policyName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  policyNo: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: FontSize.sm, color: Colors.text2 },
  premiumValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.red, marginTop: 2 },
  sumValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text1, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dueDate: { fontSize: FontSize.sm, color: Colors.text2 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
