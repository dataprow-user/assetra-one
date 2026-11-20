import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/AppText';
import { Wallet } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { AppModal, FormField, SelectField, DateField, Button } from './ui';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';
import { KIND_CONFIG, ALL_LINK_FIELDS, trackedKind, entitySubName, Kind } from '../utils/entities';
import LoanFormModal from './entity/LoanFormModal';
import AssetFormModal from './entity/AssetFormModal';
import PolicyFormModal from './entity/PolicyFormModal';
import { getNumberError, sanitizeNumericInput, MAX_NOTES_LENGTH, MAX_AMOUNT } from '../utils/validation';

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  type: 'expense', group: '', category: '', subcategory: '',
  amount: '', account: '', toAccount: '', eventId: '', notes: '',
});

/**
 * Shared Add/Edit Transaction form — mirrors
 * apps/web/src/components/TransactionFormModal.jsx exactly (same fields,
 * same live amount validation, same account balance preview), used both by
 * the Transactions screen and the app-wide FAB.
 */
export default function TransactionFormModal({
  visible, mode = 'add', transaction, initial, onClose, onError = () => {},
}: {
  visible: boolean;
  mode?: 'add' | 'edit';
  transaction?: any;
  initial?: any; // prefill for a new transaction (e.g. an EMI payment)
  onClose: () => void;
  onError?: (msg: string) => void;
}) {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN } = useApp();
  const { accounts = [], expenseCategories = [], incomeCategories = [], events = [] } = state;
  const NO_LINKS = { liabilityId: '', assetId: '', policyId: '' };
  const entitySub = (kind: Kind, e: any) => e.subName || entitySubName(kind, e);
  // Which kind of entity (loan / asset / policy) a category stands for is the USER's setting (category.tracks).
  const kindOf = (cats: any[], type: string, name: string): Kind | undefined => {
    const k = trackedKind(cats.find((c: any) => c.name === name));
    return k && KIND_CONFIG[k].txnTypes.includes(type as any) ? k : undefined;
  };

  const [form, setForm] = useState(() =>
    mode === 'edit' && transaction ? { toAccount: '', ...NO_LINKS, ...transaction, eventId: transaction.eventId || '' } : { ...emptyForm(), ...NO_LINKS, ...(initial || {}) }
  );
  const [addKind, setAddKind] = useState<Kind | null>(null);
  const [amountError, setAmountError] = useState('');
  const [dateError, setDateError] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const isTransfer = form.type === 'transfer';
  const activeCats = form.type === 'income' ? incomeCategories : expenseCategories;
  const selectedCat = activeCats.find((c: any) => c.name === form.category);
  const subcatOptions: string[] = selectedCat?.subcategories || [];
  // Loans, assets and policies ARE sub-categories of the categories that track them, so picking one both labels
  // the transaction and links it — one choice. If it isn't in the list yet, "Add a new …" opens its form.
  const kind = isTransfer ? undefined : kindOf(activeCats, form.type, form.category);
  const cfg = kind ? KIND_CONFIG[kind] : undefined;
  const entities: any[] = kind ? (state[KIND_CONFIG[kind].listKey] || []) : [];
  const ADD = '__add_new__';
  const subOptions = [
    ...subcatOptions.map((x) => ({ label: x, value: x })),
    ...(cfg ? [{ label: `➕ ${cfg.addLabel}…`, value: ADD }] : []),
  ];
  const pickSub = (v: string) => {
    if (v === ADD) { if (kind) setAddKind(kind); return; }
    setForm((f: any) => {
      const u: any = { ...f, subcategory: v, ...NO_LINKS };
      const k = f.type === 'transfer' ? undefined : kindOf(f.type === 'income' ? incomeCategories : expenseCategories, f.type, f.category);
      const hit = k ? (state[KIND_CONFIG[k].listKey] || []).find((e: any) => entitySub(k, e) === v) : undefined;
      if (k && hit) u[KIND_CONFIG[k].linkField] = hit.id;
      return u;
    });
  };
  // A just-created loan / asset / policy comes back selected, and its sub-category now exists in the list.
  const onEntitySaved = (k: Kind, e: any) => setForm((f: any) => ({ ...f, ...NO_LINKS, [KIND_CONFIG[k].linkField]: e.id, subcategory: entitySubName(k, e) }));
  const linkedLabel = ALL_LINK_FIELDS.map((field, i) => ({ field, k: (['liability', 'asset', 'insurance'] as Kind[])[i] }))
    .map(({ field, k }) => (form[field] ? { k, e: (state[KIND_CONFIG[k].listKey] || []).find((x: any) => x.id === form[field]) } : null)).find(Boolean);
  const selectedAcc = accounts.find((a: any) => a.id === form.account);
  const toAccountOptions = accounts.filter((a: any) => a.id !== form.account);

  const set = (key: string) => (value: string) => {
    setForm((f: any) => {
      const u: any = { ...f, [key]: value };
      if (key === 'type') { u.group = ''; u.category = ''; u.subcategory = ''; if (value === 'transfer') u.eventId = ''; Object.assign(u, NO_LINKS); }
      if (key === 'category') {
        u.subcategory = '';
        const allCats = u.type === 'income' ? incomeCategories : expenseCategories;
        const found = allCats.find((c: any) => c.name === value);
        if (found?.group) u.group = found.group;
        Object.assign(u, NO_LINKS);
        // A category that tracks loans / assets / policies and has exactly ONE of them? Pick it for them.
        const k = kindOf(allCats, u.type, value);
        const list: any[] = k ? (state[KIND_CONFIG[k].listKey] || []) : [];
        if (k && list.length === 1) { u[KIND_CONFIG[k].linkField] = list[0].id; u.subcategory = entitySub(k, list[0]); }
      }
      if (key === 'account' && u.toAccount === value) u.toAccount = '';
      if (key === 'date') setDateError(value && value > today ? 'Date cannot be in the future.' : '');
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
    if (!form.date) { onError('Date is required.'); return; }
    if (form.date > today) { setDateError('Date cannot be in the future.'); return; }
    if (!form.account) { onError(isTransfer ? 'Please select a "From" account.' : 'Please select an account for this transaction.'); return; }
    if (isTransfer) {
      if (!form.toAccount) { onError('Please select a "To" account.'); return; }
      if (form.toAccount === form.account) { onError('"To" account must be different from "From" account.'); return; }
    } else if (!form.category) {
      onError('Please select a category.'); return;
    }

    const payload: any = { ...form, amount: Number(form.amount) };
    if (isTransfer) { payload.category = ''; payload.subcategory = ''; payload.group = ''; }
    else payload.toAccount = '';
    // keep a link only when it's set and that kind accepts this transaction type
    (Object.keys(KIND_CONFIG) as Kind[]).forEach((k) => { const c = KIND_CONFIG[k]; if (!form[c.linkField] || !c.txnTypes.includes(form.type)) delete payload[c.linkField]; });
    if (mode === 'add') dispatch({ type: 'ADD_TRANSACTION', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...payload, id: transaction.id } });
    onClose();
  };

  const liveAmt = Number(form.amount) || 0;
  const accBal = Number(selectedAcc?.balance) || 0;
  const afterBal = form.type === 'income' ? accBal + liveAmt : accBal - liveAmt;

  return (
    <>
    <AppModal
      visible={visible}
      title={mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title={mode === 'add' ? 'Add Transaction' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
        </View>
      }
    >
      <SelectField
        label="Type"
        value={form.type}
        options={[{ label: 'Expense', value: 'expense' }, { label: 'Income', value: 'income' }, { label: 'Transfer', value: 'transfer' }]}
        onChange={set('type')}
      />
      <DateField label="Date" value={form.date} onChange={set('date')} maximumDate={new Date()} style={dateError ? styles.dateFieldError : undefined} />
      {dateError ? <Text style={styles.fieldError}>{dateError}</Text> : null}

      {!isTransfer && (
        <>
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
            placeholder={cfg ? `— Pick your ${cfg.noun} —` : '— Select Sub-Category —'}
            disabled={subOptions.length === 0}
            options={subOptions}
            onChange={pickSub}
          />
          {cfg && entities.length === 0 ? <Text style={styles.groupHint}>No {cfg.noun}s added yet — choose “{cfg.addLabel}…” to create one, and it will appear here.</Text> : null}
          {linkedLabel?.e ? (
            <Text style={styles.groupHint}>
              🔗 Counts toward {linkedLabel.e.name} — {linkedLabel.k === 'liability' ? 'its balance drops' : linkedLabel.k === 'asset' ? (form.type === 'income' ? 'its value goes down' : 'its value goes up') : 'its next due date moves on'} automatically.
            </Text>
          ) : null}
        </>
      )}

      <FormField
        label="Amount (₹)"
        keyboardType="decimal-pad"
        value={form.amount}
        onChangeText={setAmount}
        error={amountError}
        placeholder="0.00"
      />

      <SelectField
        label={isTransfer ? 'From Account' : 'Account'}
        value={form.account}
        placeholder="— Select Account —"
        options={accounts.map((a: any) => ({ label: `${a.name} (${fmtSigned(a.balance)})`, value: a.id }))}
        onChange={set('account')}
      />
      {selectedAcc && liveAmt > 0 && !isTransfer && (
        <View style={styles.balanceHint}>
          <Wallet size={12} color={Colors.accentLight} />
          <Text style={styles.balanceHintText}>Current: <Text style={styles.balanceHintStrong}>{fmtSigned(accBal)}</Text></Text>
          <Text style={styles.balanceHintArrow}>→</Text>
          <Text style={styles.balanceHintText}>
            After: <Text style={[styles.balanceHintStrong, { color: afterBal >= 0 ? Colors.green : Colors.red }]}>{fmtSigned(afterBal)}</Text>
          </Text>
        </View>
      )}

      {isTransfer && (
        <SelectField
          label="To Account"
          value={form.toAccount}
          placeholder="— Select Account —"
          options={toAccountOptions.map((a: any) => ({ label: `${a.name} (${fmtSigned(a.balance)})`, value: a.id }))}
          onChange={set('toAccount')}
        />
      )}

      {!isTransfer && events.length > 0 && (
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

    </AppModal>
    {addKind === 'liability' && <LoanFormModal visible onClose={() => setAddKind(null)} onSaved={(e) => onEntitySaved('liability', e)} />}
    {addKind === 'asset' && <AssetFormModal visible onClose={() => setAddKind(null)} onSaved={(e) => onEntitySaved('asset', e)} />}
    {addKind === 'insurance' && <PolicyFormModal visible onClose={() => setAddKind(null)} onSaved={(e) => onEntitySaved('insurance', e)} />}
    </>
  );
}

const styles = createStyles(() => ({
  dateFieldError: { marginBottom: 4 },
  fieldError: { color: Colors.red, fontSize: FontSize.sm, marginTop: -10, marginBottom: Spacing.lg },
  groupHint: { fontSize: FontSize.sm, color: Colors.text2, marginTop: -10, marginBottom: Spacing.lg },
  groupHintStrong: { color: Colors.accentLight, fontWeight: '700' },
  balanceHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    marginTop: -8, marginBottom: Spacing.lg, padding: 10, borderRadius: Radius.sm,
    backgroundColor: 'rgba(79,70,229,0.08)', borderWidth: 1, borderColor: 'rgba(79,70,229,0.2)',
  },
  balanceHintText: { fontSize: FontSize.sm, color: Colors.text2 },
  balanceHintStrong: { color: Colors.text1, fontWeight: '700' },
  balanceHintArrow: { color: Colors.text3 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
}));
