import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Text, TextInput } from '../../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, Search, Eye, EyeOff, X, ReceiptText } from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Card, Button, Toast, DateField, PageHero, FilterChips, Tap } from '../../../components/ui';
import AuroraWash from '../../../components/ui/AuroraWash';
import { useToast } from '../../../hooks/useToast';
import TransactionFormModal from '../../../components/TransactionFormModal';
import { useTxnExplorer } from '../../../components/TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../../constants/theme';
import { useRouter } from 'expo-router';

type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';
type Period = 'all' | 'today' | '7d' | 'month' | 'year' | 'custom';

const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Transactions() {
  const { state, fmt, fmtSigned, amountsHidden, toggleAmounts } = useApp();
  const { transactions = [], accounts = [], events = [] } = state;
  const router = useRouter();
  const { toast, showToast } = useToast();
  const explorer = useTxnExplorer();

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const now = new Date();
  const todayISO = localISO(now);
  const monthStartISO = localISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState(monthStartISO);
  const [customTo, setCustomTo] = useState(todayISO);

  const accName = (id: string) => accounts.find((a: any) => a.id === id)?.name || '';

  // Date window as ISO day strings — compared lexicographically, so no timezone drift.
  const { from, to, periodLabel } = useMemo(() => {
    const t = new Date();
    switch (period) {
      case 'today': return { from: localISO(t), to: localISO(t), periodLabel: 'Today' };
      case '7d': return { from: localISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6)), to: localISO(t), periodLabel: 'Last 7 days' };
      case 'month': return { from: localISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: localISO(t), periodLabel: t.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
      case 'year': return { from: `${t.getFullYear()}-01-01`, to: localISO(t), periodLabel: String(t.getFullYear()) };
      case 'custom': return { from: customFrom, to: customTo, periodLabel: `${customFrom} to ${customTo}` };
      default: return { from: '', to: '9999-12-31', periodLabel: 'All time' };
    }
  }, [period, customFrom, customTo]);

  const q = search.trim().toLowerCase();
  const inWindow = (t: any) => { const d = String(t.date).slice(0, 10); return d >= from && d <= to; };
  const matchesSearch = (t: any) => q === '' || t.category?.toLowerCase().includes(q) || t.subcategory?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)
    || (t.type === 'transfer' && (accName(t.account).toLowerCase().includes(q) || accName(t.toAccount).toLowerCase().includes(q)));

  // Window + search first (so the type chips can show honest counts), then the type filter.
  const windowed = transactions.filter(inWindow).filter(matchesSearch);
  const filtered = windowed
    .filter((t: any) => filterType === 'all' || t.type === filterType)
    .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date));

  const count = (type: TypeFilter) => (type === 'all' ? windowed.length : windowed.filter((t: any) => t.type === type).length);
  const sum = (type: 'income' | 'expense') => windowed.filter((t: any) => t.type === type).reduce((s: number, t: any) => s + t.amount, 0);
  const totalIncome = sum('income');
  const totalExpense = sum('expense');
  const net = totalIncome - totalExpense;
  const toggleType = (t: TypeFilter) => setFilterType((cur) => (cur === t ? 'all' : t));

  const dayLabel = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((+today - +d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  };
  const listRows = useMemo(() => {
    const rows: any[] = [];
    const byDay = new Map<string, any[]>();
    filtered.forEach((t: any) => { const day = String(t.date).slice(0, 10); byDay.set(day, [...(byDay.get(day) || []), t]); });
    byDay.forEach((txns, day) => {
      const net = txns.reduce((s: number, x: any) => s + (x.type === 'income' ? x.amount : x.type === 'expense' ? -x.amount : 0), 0);
      rows.push({ kind: 'header', id: 'h-' + day, label: dayLabel(day), net, count: txns.length });
      txns.forEach((t) => rows.push({ kind: 'txn', id: t.id, t }));
    });
    return rows;
  }, [filtered]);

  const header = (
    <View style={{ gap: Spacing.md, marginBottom: Spacing.sm }}>
      {accounts.length === 0 && (
        <View style={styles.noAccountNotice}>
          <Wallet size={18} color={Colors.yellow} />
          <Text style={styles.noAccountText}>Add an account first so transactions can track a real balance.</Text>
          <Button title="Add Account" variant="secondary" size="sm" onPress={() => router.push('/(app)/(tabs)/accounts')} />
        </View>
      )}

      <PageHero
        label={`Net cash flow • ${periodLabel}`}
        value={fmtSigned(net)}
        sub={`${windowed.length} transaction${windowed.length === 1 ? '' : 's'}${totalIncome > 0 ? ` • ${Math.round((net / totalIncome) * 100)}% of income kept` : ''}`}
        stats={[
          { label: 'Income', value: fmt(totalIncome), onPress: () => toggleType('income'), active: filterType === 'income', a11y: `Income ${fmt(totalIncome)}. Tap to filter` },
          { label: 'Expenses', value: fmt(totalExpense), onPress: () => toggleType('expense'), active: filterType === 'expense', a11y: `Expenses ${fmt(totalExpense)}. Tap to filter` },
          { label: 'Transfers', value: String(count('transfer')), onPress: () => toggleType('transfer'), active: filterType === 'transfer', a11y: `${count('transfer')} transfers. Tap to filter` },
        ]}
      />

      <View style={styles.searchBox}>
        <Search size={18} color={Colors.text3} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search category, notes or account"
          placeholderTextColor={Colors.text3}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          accessibilityLabel="Search transactions"
        />
        {search ? <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search"><X size={18} color={Colors.text2} /></Pressable> : null}
      </View>

      <FilterChips<Period>
        value={period}
        onChange={setPeriod}
        options={[
          { key: 'all', label: 'All time' }, { key: 'today', label: 'Today' }, { key: '7d', label: '7 days' },
          { key: 'month', label: 'This month' }, { key: 'year', label: 'This year' }, { key: 'custom', label: 'Custom' },
        ]}
      />
      {period === 'custom' && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <DateField label="From" value={customFrom} onChange={setCustomFrom} maximumDate={new Date()} style={{ flex: 1 }} />
          <DateField label="To" value={customTo} onChange={setCustomTo} maximumDate={new Date()} style={{ flex: 1 }} />
        </View>
      )}

      <FilterChips<TypeFilter>
        value={filterType}
        onChange={setFilterType}
        options={[
          { key: 'all', label: 'All', count: count('all') },
          { key: 'income', label: 'Income', count: count('income'), color: Colors.green },
          { key: 'expense', label: 'Expense', count: count('expense'), color: Colors.red },
          { key: 'transfer', label: 'Transfer', count: count('transfer'), color: Colors.blue },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AuroraWash />
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Activity</Text>
          <Text style={styles.subtitle}>Every rupee in and out</Text>
        </View>
        <Pressable onPress={toggleAmounts} hitSlop={6} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel={amountsHidden ? 'Show amounts' : 'Hide amounts'}>
          {amountsHidden ? <EyeOff size={20} color={Colors.text2} /> : <Eye size={20} color={Colors.accentLight} />}
        </Pressable>
      </View>

      <FlatList
        extraData={[fmt, filterType, period]}
        data={listRows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}><ReceiptText size={28} color={Colors.accentLight} /></View>
            <Text style={styles.emptyTitle}>{transactions.length === 0 ? 'No transactions yet' : 'Nothing matches these filters'}</Text>
            <Text style={styles.emptyText}>{transactions.length === 0 ? 'Tap the + button to record your first income or expense.' : 'Try a wider time period or clear the search.'}</Text>
            {transactions.length > 0 ? <Button title="Reset filters" variant="secondary" onPress={() => { setFilterType('all'); setPeriod('all'); setSearch(''); }} /> : null}
          </Card>
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'header') {
            return (
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{row.label}</Text>
                {row.net !== 0 ? <Text style={[styles.dayNet, { color: row.net > 0 ? Colors.green : Colors.text2 }]}>{row.net > 0 ? '+' : '-'}{fmt(Math.abs(row.net))}</Text> : null}
              </View>
            );
          }
          const t = row.t;
          const acc = accounts.find((a: any) => a.id === t.account);
          const ev = events.find((e: any) => e.id === t.eventId);
          const isTransfer = t.type === 'transfer';
          const amountColor = isTransfer ? Colors.blue : t.type === 'income' ? Colors.green : Colors.red;
          const title = isTransfer ? `${accName(t.account)} → ${accName(t.toAccount)}` : `${t.category}${t.subcategory ? ` · ${t.subcategory}` : ''}`;
          const meta = [isTransfer ? 'Transfer' : acc?.name || 'No account', ev?.name, t.notes].filter(Boolean).join(' • ');
          return (
            <Tap onPress={() => explorer.showTxn(t)} scaleTo={0.98} accessibilityLabel={`${title}, ${isTransfer ? '' : t.type === 'income' ? 'plus ' : 'minus '}${fmt(t.amount)}. Tap for details`}>
              <Card style={styles.txnCard}>
                <View style={[styles.txnAvatar, { backgroundColor: amountColor + '1f' }]}>
                  <Text style={[styles.txnAvatarText, { color: amountColor }]}>{isTransfer ? '⇄' : String(t.category || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.txnSub} numberOfLines={1}>{title}</Text>
                  <Text style={styles.txnMeta} numberOfLines={1}>{meta}</Text>
                </View>
                <Text style={{ color: amountColor, fontWeight: '800', fontSize: FontSize.md }}>
                  {isTransfer ? '' : t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </Text>
              </Card>
            </Tap>
          );
        }}
      />

      {modal && (
        <TransactionFormModal
          visible
          mode={modal.mode}
          transaction={modal.data}
          onClose={() => setModal(null)}
          onError={(msg) => showToast('error', msg)}
        />
      )}
      {explorer.node}
      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  eyeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text1 },
  subtitle: { fontSize: FontSize.base, color: Colors.text2, marginTop: 2 },
  noAccountNotice: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md,
    backgroundColor: Colors.yellowBg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
  },
  noAccountText: { flex: 1, fontSize: FontSize.sm, color: Colors.text1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel,
  },
  searchInput: { flex: 1, color: Colors.text1, fontSize: FontSize.base, paddingVertical: 10 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, paddingBottom: 2 },
  dayLabel: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  dayNet: { fontSize: FontSize.sm, fontWeight: '700' },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.sm },
  txnCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, minHeight: 68 },
  txnAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txnAvatarText: { fontWeight: '800', fontSize: FontSize.md },
  txnSub: { fontSize: FontSize.base, color: Colors.text1, fontWeight: '700' },
  txnMeta: { fontSize: FontSize.sm, color: Colors.text2 },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
}));
