import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable, Alert } from 'react-native';
import { Text } from '../../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, CreditCard, Banknote, Plus, Edit2, Trash2, Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../../context/AppContext';
import { Card, Button, AppModal, FormField, SelectField, IconBadge, DateField, PageHero, FilterChips, Tap } from '../../../components/ui';
import AuroraWash from '../../../components/ui/AuroraWash';
import { useFieldErrors } from '../../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../../constants/theme';
import { MAX_NAME_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../../utils/validation';

const ACCOUNT_TYPES = ['bank', 'wallet', 'credit_card', 'demat', 'cash'];
const TYPE_ICONS: Record<string, any> = { bank: Wallet, wallet: Wallet, credit_card: CreditCard, demat: Banknote, cash: Banknote };
const TYPE_COLORS: Record<string, string> = { get bank() { return Colors.green; }, get wallet() { return Colors.blue; }, get credit_card() { return Colors.red; }, get demat() { return Colors.accentLight; }, get cash() { return Colors.yellow; } };
const TYPE_LABELS: Record<string, string> = { bank: 'Bank', wallet: 'Wallet', credit_card: 'Credit card', demat: 'Demat', cash: 'Cash' };
const CURRENCIES = ['INR', 'USD', 'EUR'];

const emptyForm = () => ({ name: '', type: 'bank', balance: '', currency: 'INR' });
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Period = 'all' | '30d' | 'month' | 'custom';

export default function Accounts() {
  const { state, dispatch, uid, fmt, fmtSigned, amountsHidden, toggleAmounts } = useApp();
  const { accounts = [], transactions = [] } = state;
  const router = useRouter();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [form, setForm] = useState(emptyForm());
  const { errors, validate, reset: resetErrors } = useFieldErrors();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const totalBalance = accounts.reduce((s: number, a: any) => s + a.balance, 0);
  const positive = accounts.filter((a: any) => a.balance > 0).reduce((s: number, a: any) => s + a.balance, 0);
  const owed = accounts.filter((a: any) => a.balance < 0).reduce((s: number, a: any) => s + -a.balance, 0);

  // Balances themselves are always current (a point-in-time number can't be
  // "for a range"); the period instead filters the per-account In/Out shown
  // on each card, so you can see cash flow for a window without opening each account.
  const now = new Date();
  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState(localISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(localISO(now));
  const { from, to, periodLabel } = useMemo(() => {
    const t = new Date();
    if (period === '30d') return { from: localISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29)), to: localISO(t), periodLabel: 'last 30 days' };
    if (period === 'month') return { from: localISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: localISO(t), periodLabel: 'this month' };
    if (period === 'custom') return { from: customFrom, to: customTo, periodLabel: 'selected range' };
    return { from: '', to: '9999-12-31', periodLabel: 'all time' };
  }, [period, customFrom, customTo]);
  const dateFilteredTxns = transactions.filter((t: any) => { const d = String(t.date).slice(0, 10); return d >= from && d <= to; });

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: accounts.length };
    accounts.forEach((a: any) => { c[a.type] = (c[a.type] || 0) + 1; });
    return c;
  }, [accounts]);
  const visible = accounts.filter((a: any) => typeFilter === 'all' || a.type === typeFilter);
  const typeOptions = [{ key: 'all', label: 'All', count: accounts.length }, ...ACCOUNT_TYPES.filter((t) => typeCounts[t]).map((t) => ({ key: t, label: TYPE_LABELS[t], count: typeCounts[t], color: TYPE_COLORS[t] }))];

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (a: any) => { setForm({ ...a, balance: String(a.balance) }); resetErrors(); setModal({ mode: 'edit', data: a }); };

  const setBalance = (raw: string) => {
    const val = sanitizeNumericInput(raw, { allowNegative: true });
    validate('balance', val, { label: 'Balance', min: -MAX_AMOUNT, max: MAX_AMOUNT });
    setForm((f) => ({ ...f, balance: val }));
  };

  const handleSubmit = () => {
    const err = validate('balance', form.balance, { label: 'Balance', min: -MAX_AMOUNT, max: MAX_AMOUNT });
    if (err) return;
    if (!form.name.trim()) return;

    const payload = { ...form, balance: Number(form.balance) };
    if (modal?.mode === 'add') dispatch({ type: 'ADD_ACCOUNT', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...payload, id: modal!.data.id } });
    setModal(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete this account?', 'Existing transactions will remain.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_ACCOUNT', payload: id }) },
    ]);
  };

  const header = (
    <View style={{ gap: Spacing.md, marginBottom: Spacing.sm }}>
      {accounts.length > 0 ? (
        <PageHero
          label="Total balance"
          value={fmtSigned(totalBalance)}
          sub={`Across ${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
          stats={[
            { label: 'Accounts', value: String(accounts.length) },
            { label: 'Available', value: fmt(positive) },
            { label: 'Owed', value: fmt(owed) },
          ]}
        />
      ) : null}
      {accounts.length > 0 ? <FilterChips value={typeFilter} onChange={setTypeFilter} options={typeOptions} /> : null}
      {accounts.length > 0 ? (
        <>
          <Text style={styles.flowLabel}>Cash flow shown for</Text>
          <FilterChips<Period> value={period} onChange={setPeriod}
            options={[{ key: 'all', label: 'All time' }, { key: '30d', label: '30 days' }, { key: 'month', label: 'This month' }, { key: 'custom', label: 'Custom' }]} />
        </>
      ) : null}
      {period === 'custom' && accounts.length > 0 && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <DateField label="From" value={customFrom} onChange={setCustomFrom} maximumDate={new Date()} style={{ flex: 1 }} />
          <DateField label="To" value={customTo} onChange={setCustomTo} maximumDate={new Date()} style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AuroraWash />
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Accounts</Text>
          <Text style={styles.subtitle}>Banks, cards, wallets & more</Text>
        </View>
        <Pressable onPress={toggleAmounts} hitSlop={6} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel={amountsHidden ? 'Show amounts' : 'Hide amounts'}>
          {amountsHidden ? <EyeOff size={20} color={Colors.text2} /> : <Eye size={20} color={Colors.accentLight} />}
        </Pressable>
        <Button title="Add" icon={<Plus size={16} color="#fff" />} size="sm" onPress={openAdd} />
      </View>

      <FlatList
        extraData={[fmt, period, typeFilter, customFrom, customTo]}
        data={visible}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Wallet size={28} color={Colors.accentLight} /></View>
            <Text style={styles.emptyTitle}>{accounts.length === 0 ? 'Add your first account' : 'No accounts of this type'}</Text>
            <Text style={styles.emptyText}>{accounts.length === 0 ? 'Bank accounts, credit cards, wallets and cash — add them so every transaction tracks a real balance.' : 'Try another filter.'}</Text>
            <Button title={accounts.length === 0 ? 'Add account' : 'Show all'} onPress={accounts.length === 0 ? openAdd : () => setTypeFilter('all')} />
          </Card>
        }
        renderItem={({ item: a }) => {
          const Icon = TYPE_ICONS[a.type] || Wallet;
          const color = TYPE_COLORS[a.type] || Colors.accentLight;
          const accTxns = dateFilteredTxns.filter((t: any) => t.account === a.id || t.toAccount === a.id);
          const periodIn = accTxns
            .filter((t: any) => t.type === 'income' || (t.type === 'transfer' && t.toAccount === a.id))
            .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const periodOut = accTxns
            .filter((t: any) => t.type === 'expense' || (t.type === 'transfer' && t.account === a.id))
            .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          return (
            <Tap onPress={() => router.push({ pathname: '/(app)/account-detail', params: { id: a.id } } as any)}
              accessibilityLabel={`${a.name}, ${TYPE_LABELS[a.type] || a.type}, balance ${fmtSigned(a.balance)}. Tap to see transactions`}>
              <Card style={styles.accountCard}>
                <View style={styles.accountTop}>
                  <IconBadge icon={Icon} color={color} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accountName} numberOfLines={1}>{a.name}</Text>
                    <Text style={[styles.accountType, { color }]}>{TYPE_LABELS[a.type] || a.type} • {a.currency}</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable onPress={() => openEdit(a)} hitSlop={6} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`}><Edit2 size={16} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDelete(a.id)} hitSlop={6} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={`Delete ${a.name}`}><Trash2 size={16} color={Colors.red} /></Pressable>
                  </View>
                </View>
                <Text style={[styles.accountBalance, { color: a.balance < 0 ? Colors.red : Colors.text1 }]} numberOfLines={1} adjustsFontSizeToFit>{fmtSigned(a.balance)}</Text>
                <View style={styles.flowRow}>
                  <View style={[styles.flowPill, { backgroundColor: Colors.greenBg }]}><Text style={[styles.flowText, { color: Colors.green }]}>↓ {fmt(periodIn)}</Text></View>
                  <View style={[styles.flowPill, { backgroundColor: Colors.redBg }]}><Text style={[styles.flowText, { color: Colors.red }]}>↑ {fmt(periodOut)}</Text></View>
                  <Text style={styles.flowWhen} numberOfLines={1}>{periodLabel}</Text>
                  <ChevronRight size={16} color={Colors.text3} />
                </View>
              </Card>
            </Tap>
          );
        }}
      />

      {modal && (
        <AppModal
          visible
          title={modal.mode === 'add' ? 'Add Account' : 'Edit Account'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button title={modal.mode === 'add' ? 'Add Account' : 'Update'} onPress={handleSubmit} style={{ flex: 1 }} />
            </View>
          }
        >
          <FormField label="Account Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={MAX_NAME_LENGTH} placeholder="e.g. HDFC Savings" />
          <SelectField label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={ACCOUNT_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }))} />
          <FormField label="Balance (₹)" keyboardType="numbers-and-punctuation" value={form.balance} onChangeText={setBalance} error={errors.balance} placeholder="0" />
          <SelectField label="Currency" value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            options={CURRENCIES.map((c) => ({ label: c, value: c }))} />
        </AppModal>
      )}
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  eyeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text1 },
  subtitle: { fontSize: FontSize.base, color: Colors.text2, marginTop: 2 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.md },
  flowLabel: { color: Colors.text3, fontSize: FontSize.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: -4 },
  accountCard: { gap: Spacing.md },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  accountName: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  accountType: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 1 },
  accountBalance: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.3 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.panelHover, alignItems: 'center', justifyContent: 'center' },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flowPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: Radius.pill },
  flowText: { fontSize: FontSize.sm, fontWeight: '800' },
  flowWhen: { flex: 1, color: Colors.text2, fontSize: FontSize.sm },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
}));
