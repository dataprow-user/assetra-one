import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Button, AppModal, FormField, SelectField, DateField } from '../ui';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { Spacing, createStyles } from '../../constants/theme';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../utils/validation';
import { localISO } from '../../utils/loans';

export const POLICY_TYPES = ['life', 'health', 'vehicle', 'term'];
const FREQUENCIES = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Half-yearly', value: 'half_yearly' },
  { label: 'Yearly', value: 'yearly' },
];

const PREMIUM_RULE = { label: 'Premium Amount', min: 1, max: MAX_AMOUNT };
const SUM_ASSURED_RULE = { label: 'Sum Assured', min: 0, max: MAX_AMOUNT, required: false };

const emptyForm = () => ({ name: '', type: 'term', policyNo: '', premium: '', frequency: 'yearly', sumAssured: '', nextDue: '' });

const formFrom = (p?: any): any =>
  p ? { ...p, premium: String(p.premium ?? ''), sumAssured: String(p.sumAssured ?? ''), nextDue: p.nextDue || '', policyNo: p.policyNo || '' } : emptyForm();

export default function PolicyFormModal({ visible, entity, onClose, onSaved }: {
  visible: boolean; entity?: any; onClose: () => void; onSaved?: (policy: any) => void;
}) {
  const { dispatch, uid } = useApp();
  const [form, setForm] = useState<any>(formFrom(entity));
  const { errors, validate, reset: resetErrors } = useFieldErrors();
  const editing = !!entity;

  useEffect(() => {
    if (visible) { setForm(formFrom(entity)); resetErrors(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entity?.id]);

  const setPremium = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('premium', val, PREMIUM_RULE);
    setForm((f: any) => ({ ...f, premium: val }));
  };
  const setSumAssured = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    validate('sumAssured', val, SUM_ASSURED_RULE);
    setForm((f: any) => ({ ...f, sumAssured: val }));
  };

  const handleSubmit = () => {
    const premiumErr = validate('premium', form.premium, PREMIUM_RULE);
    const sumErr = validate('sumAssured', form.sumAssured, SUM_ASSURED_RULE);
    if (premiumErr || sumErr) return;
    if (!form.name.trim()) return;

    const today = localISO(new Date());
    const dueChanged = editing && String(form.nextDue || '') !== String(entity.nextDue || '');
    const payload: any = {
      ...form,
      premium: Number(form.premium),
      sumAssured: Number(form.sumAssured || 0),
      nextDueAsOf: !editing ? today : dueChanged ? today : (entity.nextDueAsOf || today),
    };
    let saved: any;
    if (editing) {
      saved = { ...payload, id: entity.id };
      dispatch({ type: 'UPDATE_INSURANCE', payload: saved });
    } else {
      saved = { ...payload, id: uid() };
      dispatch({ type: 'ADD_INSURANCE', payload: saved });
    }
    onClose();
    onSaved?.(saved);
  };

  if (!visible) return null;
  return (
    <AppModal
      visible
      title={editing ? 'Edit Policy' : 'Add Insurance Policy'}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title={editing ? 'Update' : 'Add Policy'} onPress={handleSubmit} style={{ flex: 1 }} />
        </View>
      }
    >
      <FormField label="Policy Name" value={form.name} onChangeText={(v) => setForm((f: any) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. LIC Term Plan" />
      <SelectField label="Type" value={form.type} onChange={(v) => setForm((f: any) => ({ ...f, type: v }))}
        options={Array.from(new Set([...POLICY_TYPES, form.type].filter(Boolean))).map((t: string) => ({ label: t, value: t }))} />
      <FormField label="Policy Number" value={form.policyNo} onChangeText={(v) => setForm((f: any) => ({ ...f, policyNo: v }))} maxLength={MAX_SHORT_LENGTH} placeholder="LIC-XXXXX" />
      <FormField label="Premium Amount (₹)" keyboardType="numbers-and-punctuation" value={form.premium} onChangeText={setPremium} error={errors.premium} placeholder="0" />
      <SelectField label="Frequency" value={form.frequency} onChange={(v) => setForm((f: any) => ({ ...f, frequency: v }))} options={FREQUENCIES} />
      <FormField label="Sum Assured (₹)" keyboardType="numbers-and-punctuation" value={form.sumAssured} onChangeText={setSumAssured} error={errors.sumAssured} placeholder="0" />
      <DateField label="Next Due Date" value={form.nextDue} onChange={(v) => setForm((f: any) => ({ ...f, nextDue: v }))} />
    </AppModal>
  );
}

const styles = createStyles(() => ({
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
}));
