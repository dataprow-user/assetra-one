import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/AppText';
import { useApp, DEFAULT_LIABILITY_TYPES } from '../../context/AppContext';
import { AppModal, FormField, SelectField, DateField, Button } from '../ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH, MAX_AMOUNT, MAX_RATE, MAX_TENURE_MONTHS, sanitizeNumericInput } from '../../utils/validation';
import { localISO } from '../../utils/entities';

// Add / edit a loan. Used by the Liabilities screen AND by the transaction form ("Add a new loan…"), so there
// is exactly one loan form in the app. Render it conditionally (`{open && <LoanFormModal visible … />}`) so its
// fields start fresh each time. It dispatches the change itself and reports the saved loan through `onSaved`.
const NUMERIC_RULES = {
  principal: { label: 'Principal Amount', min: 1, max: MAX_AMOUNT },
  interestRate: { label: 'Interest Rate', min: 0, max: MAX_RATE, maxDecimals: 2 },
  tenureMonths: { label: 'Tenure', min: 1, max: MAX_TENURE_MONTHS, maxDecimals: 0 },
  emi: { label: 'EMI Amount', min: 1, max: MAX_AMOUNT },
  outstanding: { label: 'Outstanding Balance', min: 0, max: MAX_AMOUNT },
};

export default function LoanFormModal({
  visible, entity, onClose, onSaved,
}: { visible: boolean; entity?: any; onClose: () => void; onSaved?: (loan: any) => void }) {
  const { state, dispatch, uid } = useApp();
  const libTypes = state.liabilityTypes && state.liabilityTypes.length > 0 ? state.liabilityTypes : DEFAULT_LIABILITY_TYPES;
  const [form, setForm] = useState<any>(() => entity ? {
    ...entity,
    principal: String(entity.principal ?? ''),
    interestRate: String(entity.interestRate ?? ''),
    tenureMonths: String(entity.tenureMonths ?? ''),
    emi: String(entity.emi ?? ''),
    outstanding: String(entity.outstanding ?? ''),
    outstandingAsOf: entity.outstandingAsOf || localISO(new Date()),
    startDate: entity.startDate || '',
  } : { name: '', type: libTypes[0]?.key || 'other', principal: '', interestRate: '', tenureMonths: '', emi: '', startDate: '', outstanding: '', outstandingAsOf: localISO(new Date()) });
  const { errors, validate } = useFieldErrors();

  const setNum = (key: keyof typeof NUMERIC_RULES) => (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate(key, val, NUMERIC_RULES[key]);
    setForm((f: any) => ({ ...f, [key]: val }));
  };

  const handleSubmit = () => {
    const errs = (Object.keys(NUMERIC_RULES) as (keyof typeof NUMERIC_RULES)[]).map((k) => validate(k, form[k], NUMERIC_RULES[k]));
    if (errs.some(Boolean)) return;
    if (!form.name.trim()) return;

    const payload = {
      ...form,
      name: form.name.trim(),
      principal: Number(form.principal),
      interestRate: Number(form.interestRate),
      tenureMonths: Number(form.tenureMonths),
      emi: Number(form.emi),
      outstanding: Number(form.outstanding),
      // Retyping the balance means "this is the balance now", unless a different date was picked.
      outstandingAsOf: (entity && Number(form.outstanding) !== Number(entity.outstanding) && form.outstandingAsOf === entity.outstandingAsOf)
        ? localISO(new Date()) : (form.outstandingAsOf || localISO(new Date())),
    };
    const saved = entity ? { ...payload, id: entity.id } : { ...payload, id: uid() };
    dispatch({ type: entity ? 'UPDATE_LIABILITY' : 'ADD_LIABILITY', payload: saved });
    onSaved?.(saved);
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      title={entity ? 'Edit Liability' : 'Add Liability'}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title={entity ? 'Update' : 'Add Liability'} onPress={handleSubmit} style={{ flex: 1 }} />
        </View>
      }
    >
      <FormField label="Loan Name" value={form.name} onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))}
        maxLength={MAX_NAME_LENGTH} placeholder="e.g. SBI Home Loan" />
      <SelectField label="Type" value={form.type} onChange={(v) => setForm((f: any) => ({ ...f, type: v }))}
        options={libTypes.map((t: any) => ({ label: t.label, value: t.key }))} />
      <FormField label="Principal Amount (₹)" keyboardType="decimal-pad" value={form.principal}
        onChangeText={setNum('principal')} error={errors.principal} placeholder="0" />
      <FormField label="Interest Rate (% p.a.)" keyboardType="decimal-pad" value={form.interestRate}
        onChangeText={setNum('interestRate')} error={errors.interestRate} placeholder="0" />
      <FormField label="Tenure (months)" keyboardType="number-pad" value={form.tenureMonths}
        onChangeText={setNum('tenureMonths')} error={errors.tenureMonths} placeholder="0" />
      <FormField label="EMI Amount (₹)" keyboardType="decimal-pad" value={form.emi}
        onChangeText={setNum('emi')} error={errors.emi} placeholder="0" />
      <DateField label="Start Date" value={form.startDate} onChange={(v) => setForm((f: any) => ({ ...f, startDate: v }))} />
      <FormField label="Outstanding Balance (₹)" keyboardType="decimal-pad" value={form.outstanding}
        onChangeText={setNum('outstanding')} error={errors.outstanding} placeholder="0" />
      <DateField label="Balance is as of" value={form.outstandingAsOf} onChange={(v) => setForm((f: any) => ({ ...f, outstandingAsOf: v }))} maximumDate={new Date()} />
      <Text style={styles.asOfHint}>EMI payments you record after this date lower the balance automatically (interest is deducted using the rate above).</Text>
    </AppModal>
  );
}

const styles = createStyles(() => ({
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  asOfHint: { color: Colors.text2, fontSize: FontSize.sm, marginTop: -8, marginBottom: Spacing.lg },
}));
