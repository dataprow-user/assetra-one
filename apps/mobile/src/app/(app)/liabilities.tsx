import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Plus, Edit2, Trash2, Settings2 } from 'lucide-react-native';
import { useApp, DEFAULT_LIABILITY_TYPES } from '../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, SelectField, ScreenHeader, Badge, ProgressBar, DateField } from '../../components/ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { fmt } from '../../utils/format';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, MAX_RATE, MAX_TENURE_MONTHS, sanitizeNumericInput } from '../../utils/validation';

// Ported from apps/web/src/pages/Liabilities.jsx — same fields/calculations,
// rendered as cards instead of a table.

const SWATCH_COLORS = [Colors.accent, Colors.green, Colors.red, Colors.yellow, Colors.blue, Colors.accent2, '#f97316', '#06b6d4'];

const emptyForm = () => ({ name: '', type: 'home_loan', principal: '', interestRate: '', tenureMonths: '', emi: '', startDate: '', outstanding: '' });
const emptyType = () => ({ label: '', color: Colors.red });

const NUMERIC_RULES = {
  principal: { label: 'Principal Amount', min: 1, max: MAX_AMOUNT },
  interestRate: { label: 'Interest Rate', min: 0, max: MAX_RATE, maxDecimals: 2 },
  tenureMonths: { label: 'Tenure', min: 1, max: MAX_TENURE_MONTHS, maxDecimals: 0 },
  emi: { label: 'EMI Amount', min: 1, max: MAX_AMOUNT },
  outstanding: { label: 'Outstanding Balance', min: 0, max: MAX_AMOUNT },
};

export default function Liabilities() {
  const { state, dispatch, uid } = useApp();
  const { liabilities = [] } = state;
  const libTypes = state.liabilityTypes && state.liabilityTypes.length > 0 ? state.liabilityTypes : DEFAULT_LIABILITY_TYPES;

  const typeLabels: Record<string, string> = {}, typeColors: Record<string, string> = {};
  libTypes.forEach((t: any) => { typeLabels[t.key] = t.label; typeColors[t.key] = t.color; });

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [typeModal, setTypeModal] = useState<any>(null); // null | 'manage' | { mode, data? }
  const [form, setForm] = useState<any>(emptyForm());
  const [typeForm, setTypeForm] = useState<any>(emptyType());
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (l: any) => {
    setForm({
      ...l,
      principal: String(l.principal ?? ''),
      interestRate: String(l.interestRate ?? ''),
      tenureMonths: String(l.tenureMonths ?? ''),
      emi: String(l.emi ?? ''),
      outstanding: String(l.outstanding ?? ''),
      startDate: l.startDate || '',
    });
    resetErrors();
    setModal({ mode: 'edit', data: l });
  };

  const setPrincipal = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('principal', val, NUMERIC_RULES.principal);
    setForm((f: any) => ({ ...f, principal: val }));
  };
  const setInterestRate = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('interestRate', val, NUMERIC_RULES.interestRate);
    setForm((f: any) => ({ ...f, interestRate: val }));
  };
  const setTenureMonths = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('tenureMonths', val, NUMERIC_RULES.tenureMonths);
    setForm((f: any) => ({ ...f, tenureMonths: val }));
  };
  const setEmi = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('emi', val, NUMERIC_RULES.emi);
    setForm((f: any) => ({ ...f, emi: val }));
  };
  const setOutstanding = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('outstanding', val, NUMERIC_RULES.outstanding);
    setForm((f: any) => ({ ...f, outstanding: val }));
  };

  const handleSubmit = () => {
    const pErr = validate('principal', form.principal, NUMERIC_RULES.principal);
    const rErr = validate('interestRate', form.interestRate, NUMERIC_RULES.interestRate);
    const tErr = validate('tenureMonths', form.tenureMonths, NUMERIC_RULES.tenureMonths);
    const eErr = validate('emi', form.emi, NUMERIC_RULES.emi);
    const oErr = validate('outstanding', form.outstanding, NUMERIC_RULES.outstanding);
    if (pErr || rErr || tErr || eErr || oErr) return;
    if (!form.name.trim()) return;

    const payload = {
      ...form,
      principal: Number(form.principal),
      interestRate: Number(form.interestRate),
      tenureMonths: Number(form.tenureMonths),
      emi: Number(form.emi),
      outstanding: Number(form.outstanding),
    };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_LIABILITY', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_LIABILITY', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete this liability?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_LIABILITY', payload: id }) },
    ]);
  };

  // ── Type management ──
  const openTypeManager = () => setTypeModal('manage');
  const openAddType = () => { setTypeForm(emptyType()); setTypeModal({ mode: 'add' }); };
  const openEditType = (t: any) => { setTypeForm({ ...t }); setTypeModal({ mode: 'edit', data: t }); };

  const handleTypeSubmit = () => {
    if (!typeForm.label.trim()) return;
    if (typeModal?.mode === 'add') {
      const key = typeForm.label.trim().toLowerCase().replace(/\s+/g, '_');
      dispatch({ type: 'ADD_LIABILITY_TYPE', payload: { ...typeForm, key, id: uid() } });
    } else {
      dispatch({ type: 'UPDATE_LIABILITY_TYPE', payload: { ...typeForm, id: typeModal!.data.id } });
    }
    setTypeModal('manage');
  };

  const handleDeleteType = (id: string) => {
    Alert.alert('Delete this type?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_LIABILITY_TYPE', payload: id }) },
    ]);
  };

  const totalOutstanding = liabilities.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
  const totalEmi = liabilities.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Liabilities"
          showBack
          subtitle={
            <>
              Outstanding: <Text style={{ color: Colors.red }}>{fmt(totalOutstanding)}</Text> • Monthly EMI:{' '}
              <Text style={{ color: Colors.yellow }}>{fmt(totalEmi)}</Text>
            </>
          }
          right={
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Pressable onPress={openTypeManager} style={styles.iconBtn} hitSlop={8}>
                <Settings2 size={18} color={Colors.text2} />
              </Pressable>
              <Pressable onPress={openAdd} style={styles.addBtn} hitSlop={8}>
                <Plus size={20} color="#fff" />
              </Pressable>
            </View>
          }
        />
      </View>

      <FlatList
        data={liabilities}
        keyExtractor={(l: any) => l.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon={CreditCard} title="No Liabilities" description="Add home loans, personal loans, gold loans etc." />}
        renderItem={({ item: l }: { item: any }) => {
          const color = typeColors[l.type] || Colors.text2;
          const paid = Number(l.principal || 0) - Number(l.outstanding || 0);
          const pct = l.principal ? (paid / l.principal) * 100 : 0;
          return (
            <Card style={styles.card}>
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
                  <Badge label={typeLabels[l.type] || l.type} color={color} style={{ marginTop: 6 }} />
                </View>
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => openEdit(l)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDelete(l.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{l.interestRate}% p.a.</Text>
                <Text style={styles.metaText}>{l.tenureMonths} mo</Text>
                <Text style={[styles.metaText, { color: Colors.red }]}>EMI {fmt(l.emi)}/mo</Text>
              </View>

              <View style={styles.valuesRow}>
                <View style={styles.valueCol}>
                  <Text style={styles.valueLabel}>Principal</Text>
                  <Text style={[styles.valueAmt, { color: Colors.text1 }]}>{fmt(l.principal)}</Text>
                </View>
                <View style={styles.valueCol}>
                  <Text style={styles.valueLabel}>Outstanding</Text>
                  <Text style={[styles.valueAmt, { color: Colors.red }]}>{fmt(l.outstanding)}</Text>
                </View>
              </View>

              <View style={{ marginTop: Spacing.md }}>
                <ProgressBar pct={pct} color={Colors.green} />
                <Text style={styles.pctText}>{pct.toFixed(0)}% paid</Text>
              </View>
            </Card>
          );
        }}
      />

      {/* Add/Edit Liability Modal */}
      {modal && (
        <AppModal visible title={modal.mode === 'add' ? 'Add Liability' : 'Edit Liability'} onClose={() => setModal(null)}>
          <FormField label="Loan Name" value={form.name} onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
            maxLength={MAX_NAME_LENGTH} placeholder="e.g. SBI Home Loan" />
          <SelectField label="Type" value={form.type} onChange={(v) => setForm((f: any) => ({ ...f, type: v }))}
            options={libTypes.map((t: any) => ({ label: t.label, value: t.key }))} />
          <FormField label="Principal Amount (₹)" keyboardType="decimal-pad" value={form.principal}
            onChangeText={setPrincipal} error={errors.principal} placeholder="0" />
          <FormField label="Interest Rate (% p.a.)" keyboardType="decimal-pad" value={form.interestRate}
            onChangeText={setInterestRate} error={errors.interestRate} placeholder="0" />
          <FormField label="Tenure (months)" keyboardType="number-pad" value={form.tenureMonths}
            onChangeText={setTenureMonths} error={errors.tenureMonths} placeholder="0" />
          <FormField label="EMI Amount (₹)" keyboardType="decimal-pad" value={form.emi}
            onChangeText={setEmi} error={errors.emi} placeholder="0" />
          <DateField label="Start Date" value={form.startDate} onChange={(v) => setForm((f: any) => ({ ...f, startDate: v }))} />
          <FormField label="Outstanding Balance (₹)" keyboardType="decimal-pad" value={form.outstanding}
            onChangeText={setOutstanding} error={errors.outstanding} placeholder="0" />

          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
            <Button title={modal.mode === 'add' ? 'Add Liability' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
          </View>
        </AppModal>
      )}

      {/* Type Manager Modal */}
      {typeModal === 'manage' && (
        <AppModal visible title="Manage Liability Types" onClose={() => setTypeModal(null)}>
          <Button title="Add Type" icon={<Plus size={14} color="#fff" />} size="sm" onPress={openAddType} style={{ marginBottom: Spacing.lg, alignSelf: 'flex-start' }} />
          <View style={{ gap: Spacing.sm }}>
            {libTypes.map((t: any) => (
              <View key={t.id} style={styles.typeRow}>
                <Badge label={t.label} color={t.color} />
                <View style={styles.actionsRow}>
                  <Pressable onPress={() => openEditType(t)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDeleteType(t.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                </View>
              </View>
            ))}
          </View>
        </AppModal>
      )}

      {/* Add/Edit Type Modal */}
      {typeModal && typeModal !== 'manage' && (
        <AppModal visible title={typeModal.mode === 'add' ? 'Add Liability Type' : 'Edit Type'} onClose={() => setTypeModal('manage')}>
          <FormField label="Type Name" value={typeForm.label} onChangeText={(v) => setTypeForm((f: any) => ({ ...f, label: v }))}
            maxLength={MAX_SHORT_LENGTH} placeholder="e.g. Business Loan" />
          <Text style={styles.label}>Color</Text>
          <View style={styles.swatchRow}>
            {SWATCH_COLORS.map((c) => (
              <Pressable key={c} onPress={() => setTypeForm((f: any) => ({ ...f, color: c }))}
                style={[styles.swatch, { backgroundColor: c }, typeForm.color === c && styles.swatchActive]} />
            ))}
          </View>
          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={() => setTypeModal('manage')} style={{ flex: 1 }} />
            <Button title={typeModal.mode === 'add' ? 'Add' : 'Update'} onPress={handleTypeSubmit} style={{ flex: 1 }} />
          </View>
        </AppModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  iconBtn: {
    width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.panel,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  card: { gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingTop: 2 },
  name: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  metaRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, flexWrap: 'wrap' },
  metaText: { color: Colors.text2, fontSize: FontSize.sm },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  valueCol: { flex: 1 },
  valueLabel: { fontSize: FontSize.xs, color: Colors.text2, marginBottom: 2 },
  valueAmt: { fontSize: FontSize.base, fontWeight: '700' },
  pctText: { fontSize: FontSize.xs, color: Colors.text2, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md,
    backgroundColor: Colors.panel, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  label: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text2, marginBottom: 6 },
  swatchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Colors.text1 },
});
