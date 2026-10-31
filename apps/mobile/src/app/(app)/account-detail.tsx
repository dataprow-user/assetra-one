import React, { useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { Text, TextInput } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Search, X, ReceiptText } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Button, ScreenHeader, DateField, PageHero, FilterChips, Tap } from '../../components/ui';
import { useTxnExplorer } from '../../components/TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';

type FilterType = 'all' | 'in' | 'out' | 'transfer';
type Period = 'all' | '30d' | 'month' | 'custom';

const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tapping an account card opens this — a ledger of everything that ever touched
// that account's balance: where money came from (income, or a transfer in) and
// where it went (expense, or a transfer out). Tap any row for full details.
export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, fmt, fmtSigned } = useApp();
  const { accounts = [], transactions = [] } = state;
  const account = accounts.find((a: any) => a.id === id);
  const explorer = useTxnExplorer();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const now = new Date();
  const todayISO = localISO(now);
  const [period, setPeriod] = useState<Period>('all');
  const [customFrom, setCustomFrom] = useState(localISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(todayISO);

  const accName = (accId: string) => accounts.find((a: any) => a.id === accId)?.name || 'Unknown';

  const { from, to, periodLabel } = useMemo(() => {
    const t = new Date();
    if (period === '30d') return { from: localISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29)), to: localISO(t), periodLabel: 'Last 30 days' };
    if (period === 'month') return { from: localISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: localISO(t), periodLabel: t.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
    if (period === 'custom') return { from: customFrom, to: customTo, periodLabel: `${customFrom} to ${customTo}` };
    return { from: '', to: '9999-12-31', periodLabel: 'All time' };
  }, [period, customFrom, customTo]);

  const isIn = (t: any) => t.type === 'income' || (t.type === 'transfer' && t.toAccount === id);
  const isOut = (t: any) => t.type === 'expense' || (t.type === 'transfer' && t.account === id);

  // Window + search gate the list AND the chip counts / totals; the type chips narrow it further.
  const windowed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t: any) => t.account === id || t.toAccount === id)
      .filter((t: any) => { const d = String(t.date).slice(0, 10); return d >= from && d <= to; })
      .filter((t: any) => !q || t.category?.toLowerCase().includes(q) || t.subcategory?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)
        || (t.type === 'transfer' && (accName(t.account).toLowerCase().includes(q) || accName(t.toAccount).toLowerCase().includes(q))));
  }, [transactions, id, from, to, search]);

  const filtered = useMemo(() => windowed
    .filter((t: any) => filterType === 'all' || (filterType === 'in' ? isIn(t) && t.type !== 'transfer' : filterType === 'out' ? isOut(t) && t.type !== 'transfer' : t.type === 'transfer'))
    .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date)),
  [windowed, filterType]);

  const totalIn = windowed.filter(isIn).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalOut = windowed.filter(isOut).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const nIn = windowed.filter((t: any) => isIn(t) && t.type !== 'transfer').length;
  const nOut = windowed.filter((t: any) => isOut(t) && t.type !== 'transfer').length;
  const nTransfer = windowed.filter((t: any) => t.type === 'transfer').length;
  const toggle = (k: FilterType) => setFilterType((cur) => (cur === k ? 'all' : k));
  const balance = account?.balance ?? 0;

  const header = (
    <View style={{ gap: Spacing.md, marginBottom: Spacing.sm }}>
      <PageHero
        label={`${String(account?.type || 'Account').replace('_', ' ')} balance`}
        value={fmtSigned(balance)}
        sub={`${periodLabel} • net ${totalIn - totalOut >= 0 ? '+' : '-'}${fmt(Math.abs(totalIn - totalOut))}`}
        stats={[
          { label: 'Money in', value: fmt(totalIn), onPress: () => toggle('in'), active: filterType === 'in', a11y: `Money in ${fmt(totalIn)}. Tap to filter` },
          { label: 'Money out', value: fmt(totalOut), onPress: () => toggle('out'), active: filterType === 'out', a11y: `Money out ${fmt(totalOut)}. Tap to filter` },
          { label: 'Transactions', value: String(windowed.length), onPress: () => setFilterType('all'), active: filterType === 'all', a11y: `${windowed.length} transactions. Tap to show all` },
        ]}
      />

      <View style={styles.searchBox}>
        <Search size={18} color={Colors.text3} />
        <TextInput style={styles.searchInput} placeholder="Search in this account" placeholderTextColor={Colors.text3} value={search} onChangeText={setSearch} accessibilityLabel="Search this account" />
        {search ? <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search"><X size={18} color={Colors.text2} /></Pressable> : null}
      </View>

      <FilterChips<Period>
        value={period}
        onChange={setPeriod}
        options={[{ key: 'all', label: 'All time' }, { key: '30d', label: '30 days' }, { key: 'month', label: 'This month' }, { key: 'custom', label: 'Custom' }]}
      />
      {period === 'custom' && (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <DateField label="From" value={customFrom} onChange={setCustomFrom} maximumDate={new Date()} style={{ flex: 1 }} />
          <DateField label="To" value={customTo} onChange={setCustomTo} maximumDate={new Date()} style={{ flex: 1 }} />
        </View>
      )}

      <FilterChips<FilterType>
        value={filterType}
        onChange={setFilterType}
        options={[
          { key: 'all', label: 'All', count: windowed.length },
          { key: 'in', label: 'Money in', count: nIn, color: Colors.green },
          { key: 'out', label: 'Money out', count: nOut, color: Colors.red },
          { key: 'transfer', label: 'Transfers', count: nTransfer, color: Colors.blue },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title={account?.name || 'Account'} showBack subtitle={`${account?.currency || 'INR'} • tap any transaction for details`} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t: any) => t.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}><ReceiptText size={28} color={Colors.accentLight} /></View>
            <Text style={styles.emptyTitle}>{windowed.length === 0 && !search ? 'No transactions yet' : 'Nothing matches these filters'}</Text>
            <Text style={styles.emptyText}>Money that flows through this account will appear here.</Text>
            {(filterType !== 'all' || search || period !== 'all') ? <Button title="Reset filters" variant="secondary" onPress={() => { setFilterType('all'); setSearch(''); setPeriod('all'); }} /> : null}
          </Card>
        }
        renderItem={({ item: t }) => {
          const transfer = t.type === 'transfer';
          const inflow = isIn(t);
          const color = transfer ? Colors.blue : inflow ? Colors.green : Colors.red;
          const title = transfer ? `${accName(t.account)} → ${accName(t.toAccount)}` : `${t.category}${t.subcategory ? ` · ${t.subcategory}` : ''}`;
          return (
            <Tap onPress={() => explorer.showTxn(t)} scaleTo={0.98} accessibilityLabel={`${title}, ${inflow ? 'money in' : 'money out'} ${fmt(t.amount)}, ${t.date}. Tap for details`}>
              <Card style={styles.txnCard}>
                <View style={[styles.avatar, { backgroundColor: color + '1f' }]}>
                  <Text style={[styles.avatarText, { color }]}>{transfer ? '⇄' : String(t.category || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.txnTitle} numberOfLines={1}>{title}</Text>
                  <Text style={styles.txnMeta} numberOfLines={1}>{t.date}{t.notes ? ` • ${t.notes}` : ''}</Text>
                </View>
                <Text style={{ color, fontWeight: '800', fontSize: FontSize.md }}>{inflow ? '+' : '-'}{fmt(t.amount)}</Text>
              </Card>
            </Tap>
          );
        }}
      />
      {explorer.node}
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel,
  },
  searchInput: { flex: 1, color: Colors.text1, fontSize: FontSize.base, paddingVertical: 10 },
  txnCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, minHeight: 68 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: FontSize.md },
  txnTitle: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  txnMeta: { color: Colors.text2, fontSize: FontSize.sm },
  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
}));
