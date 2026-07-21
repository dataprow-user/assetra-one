import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { AppModal, FormField, SelectField, DateField, Button } from './ui';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { fmtSigned } from '../utils/format';
import { getNumberError, sanitizeNumericInput, MAX_NOTES_LENGTH, MAX_AMOUNT } from '../utils/validation';

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  type: 'expense', group: '', category: '', subcategory: '',
  amount: '', account: '', eventId: '', notes: '',
});

/**
 * Shared Add/Edit Transaction form — mirrors
 * apps/web/src/components/TransactionFormModal.jsx exactly (same fields,
 * same live amount validation, same account balance preview), used both by
 * the Transactions screen and the app-wide FAB.
 */
export default function TransactionFormModal({
  visible, mode = 'add', transaction, onClose, onError = () => {},
}: {
  visible: boolean;
  mode?: 'add' | 'edit';
  transaction?: any;
  onClose: () => void;
  onError?: (msg: string) => void;
}) {
  const { state, dispatch, uid } = useApp();
  const { accounts = [], expenseCategories = [], incomeCategories = [], events = [] } = state;

  const [form, setForm] = useState(() =>
    mode === 'edit' && transaction ? { ...transaction, eventId: transaction.eventId || '' } : emptyForm()
  );
  const [amountError, setAmountError] = useState('');

  const activeCats = form.type === 'income' ? incomeCategories : expenseCategories;
  const selectedCat = activeCats.find((c: any) => c.name === form.category);
  const subcatOptions: string[] = selectedCat?.subcategories || [];
  const selectedAcc = accounts.find((a: any) => a.id === form.account);

  const set = (key: string) => (value: string) => {
    setForm((f: any) => {
      const u: any = { ...f, [key]: value };
      if (key === 'type') { u.group = ''; u.category = ''; u.subcategory = ''; }
      if (key === 'category') {
        u.subcategory = '';
        const allCats = u.type === 'income' ? incomeCategories : expenseCategories;
        const found = allCats.find((c: any) => c.name === value);
        if (found?.group) u.group = found.group;
      }
      return u;
    });
  };

  const setAmount = (raw: string) => {
    const val = sanitizeNumericInput(raw);
    setAmountError(getNumberError(val, { label: 'Amount', min: 0.01, max: MAX_AMOUNT }));
    setForm((f: any) => ({ ...f, amount: val }));
  };

  const handleSubmit = () => {
    const amtErr = getNumberError(form.amount, { label: 'Amount', min: 0.01, max: MAX_AMOUNT });
    if (amtErr) { setAmountError(amtErr); return; }
    if (!form.category) { onError('Please select a category.'); return; }
    if (!form.account) { onError('Please select an account for this transaction.'); return; }

    const payload = { ...form, amount: Number(form.amount) };
    if (mode === 'add') dispatch({ type: 'ADD_TRANSACTION', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...payload, id: transaction.id } });
    onClose();
  };

  const liveAmt = Number(form.amount) || 0;
  const accBal = Number(selectedAcc?.balance) || 0;
  const afterBal = form.type === 'income' ? accBal + liveAmt : accBal - liveAmt;

  return (
    <AppModal visible={visible} title={mode === 'add' ? 'Add Transaction' : 'Edit Transaction'} onClose={onClose}>
      <SelectField
        label="Type"
        value={form.type}
        options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }]}
        onChange={set('type')}
      />
      <DateField label="Date" value={form.date} onChange={set('date')} />

      <SelectField
        label="Category"
        value={form.category}
        placeholder="— Select Category —"
        options={activeCats.map((c: any) => ({ label: c.name, value: c.name }))}
        onChange={set('category')}
      />
      {form.group ? <Text style={styles.groupHint}>📁 Group: <Text style={styles.groupHintStrong}>{form.group}</Text></Text> : null}

      <SelectField
        label="Sub-Category"
        hint="(optional)"
        value={form.subcategory}
        placeholder="— Select Sub-Category —"
        disabled={subcatOptions.length === 0}
        options={subcatOptions.map((s) => ({ label: s, value: s }))}
        onChange={set('subcategory')}
      />

      <FormField
        label="Amount (₹)"
        keyboardType="decimal-pad"
        value={form.amount}
        onChangeText={setAmount}
        error={amountError}
        placeholder="0.00"
      />

      <SelectField
        label="Account"
        value={form.account}
        placeholder="— Select Account —"
        options={accounts.map((a: any) => ({ label: `${a.name} (${fmtSigned(a.balance)})`, value: a.id }))}
        onChange={set('account')}
      />
      {selectedAcc && liveAmt > 0 && (
        <View style={styles.balanceHint}>
          <Wallet size={12} color={Colors.accentLight} />
          <Text style={styles.balanceHintText}>Current: <Text style={styles.balanceHintStrong}>{fmtSigned(accBal)}</Text></Text>
          <Text style={styles.balanceHintArrow}>→</Text>
          <Text style={styles.balanceHintText}>
            After: <Text style={[styles.balanceHintStrong, { color: afterBal >= 0 ? Colors.green : Colors.red }]}>{fmtSigned(afterBal)}</Text>
          </Text>
        </View>
      )}

      {events.length > 0 && (
        <SelectField
          label="Link to Event"
          hint="(optional)"
          value={form.eventId}
          placeholder="— No Event —"
          options={events.map((ev: any) => ({ label: ev.name, value: ev.id }))}
          onChange={set('eventId')}
        />
      )}

      <FormField
        label="Notes"
        hint="(optional)"
        value={form.notes}
        onChangeText={set('notes')}
        maxLength={MAX_NOTES_LENGTH}
        placeholder="Any extra detail…"
      />

      <View style={styles.actions}>
        <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button title={mode === 'add' ? 'Add Transaction' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  groupHint: { fontSize: FontSize.sm, color: Colors.text2, marginTop: -10, marginBottom: Spacing.lg },
  groupHintStrong: { color: Colors.accentLight, fontWeight: '700' },
  balanceHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    marginTop: -8, marginBottom: Spacing.lg, padding: 10, borderRadius: Radius.sm,
    backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  balanceHintText: { fontSize: FontSize.sm, color: Colors.text2 },
  balanceHintStrong: { color: Colors.text1, fontWeight: '700' },
  balanceHintArrow: { color: Colors.text3 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
