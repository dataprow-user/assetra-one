import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, CreditCard, Banknote, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Card, Button, EmptyState, AppModal, FormField, SelectField, IconBadge } from '../../../components/ui';
import { useFieldErrors } from '../../../hooks/useFieldErrors';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { MAX_NAME_LENGTH, MAX_AMOUNT, sanitizeNumericInput } from '../../../utils/validation';

const ACCOUNT_TYPES = ['bank', 'wallet', 'credit_card', 'demat', 'cash'];
const TYPE_ICONS: Record<string, any> = { bank: Wallet, wallet: Wallet, credit_card: CreditCard, demat: Banknote, cash: Banknote };
const TYPE_COLORS: Record<string, string> = { bank: Colors.green, wallet: Colors.blue, credit_card: Colors.red, demat: Colors.accentLight, cash: Colors.yellow };
const CURRENCIES = ['INR', 'USD', 'EUR'];

const emptyForm = () => ({ name: '', type: 'bank', balance: '', currency: 'INR' });

export default function Accounts() {
  const { state, dispatch, uid, fmt, fmtSigned, fmtN, amountsHidden, toggleAmounts } = useApp();
  const { accounts = [], transactions = [] } = state;
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [form, setForm] = useState(emptyForm());
  const { errors, validate, reset: resetErrors } = useFieldErrors();

  const totalBalance = accounts.reduce((s: number, a: any) => s + a.balance, 0);

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Accounts</Text>
          <Text style={styles.subtitle}>
            {accounts.length} accounts • Total: <Text style={{ color: totalBalance >= 0 ? Colors.green : Colors.red }}>{fmtSigned(totalBalance)}</Text>
          </Text>
        </View>
        <Pressable onPress={toggleAmounts} hitSlop={10} style={styles.eyeBtn}>
          {amountsHidden ? <EyeOff size={20} color={Colors.text2} /> : <Eye size={20} color={Colors.accentLight} />}
        </Pressable>
        <Button title="Add" icon={<Plus size={16} color="#fff" />} size="sm" onPress={openAdd} />
      </View>

      <FlatList extraData={fmt} 
        data={accounts}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.sm }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon={Wallet} title="No Accounts" description="Add your bank accounts, credit cards, and wallets" />}
        renderItem={({ item: a }) => {
          const Icon = TYPE_ICONS[a.type] || Wallet;
          const color = TYPE_COLORS[a.type] || Colors.accentLight;
          const txnCount = transactions.filter((t: any) => t.account === a.id).length;
          return (
            <Card style={styles.accountCard}>
              <View style={styles.accountTop}>
                <IconBadge icon={Icon} color={color} />
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Pressable onPress={() => openEdit(a)} hitSlop={8}><Edit2 size={15} color={Colors.text2} /></Pressable>
                  <Pressable onPress={() => handleDelete(a.id)} hitSlop={8}><Trash2 size={15} color={Colors.red} /></Pressable>
                </View>
              </View>
              <Text style={styles.accountName} numberOfLines={1}>{a.name}</Text>
              <Text style={[styles.accountType, { color }]}>{a.type.replace('_', ' ')}</Text>
              <Text style={[styles.accountBalance, { color: a.balance < 0 ? Colors.red : Colors.green }]}>{fmtSigned(a.balance)}</Text>
              <Text style={styles.accountMeta}>{txnCount} txns • {a.currency}</Text>
            </Card>
          );
        }}
      />

      {modal && (
        <AppModal
          visible
          title={modal.mode === 'add' ? 'Add Account' : 'Edit Account'}
          onClose={() => setModal(null)}
          footer={
            <View style={styles.actions}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md, gap: Spacing.md },
  eyeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text1 },
  subtitle: { fontSize: FontSize.base, color: Colors.text2, marginTop: 2 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  accountCard: { flex: 1, gap: 4 },
  accountTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  accountName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  accountType: { fontSize: FontSize.sm, fontWeight: '600', textTransform: 'capitalize', marginBottom: 6 },
  accountBalance: { fontSize: FontSize.lg, fontWeight: '700' },
  accountMeta: { fontSize: FontSize.sm, color: Colors.text2, marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
});
