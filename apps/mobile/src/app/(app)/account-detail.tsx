import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Search, Wallet } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, Badge, EmptyState, ScreenHeader, DateField } from '../../components/ui';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';

type FilterType = 'all' | 'income' | 'expense' | 'transfer';

// Tapping an account card opens this — a filtered ledger of everything that
// ever touched that account's balance, so you can trace exactly where money
// came from (income, or a transfer in) and where it went (expense, or a
// transfer out), with search, type filter, and a custom date range — same
// "All Time / Custom Range" pattern as the Dashboard.
export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, fmt, fmtSigned } = useApp();
  const { accounts = [], transactions = [] } = state;
  const account = accounts.find((a: any) => a.id === id);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];
  const monthStartISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState(monthStartISO);
  const [customTo, setCustomTo] = useState(todayISO);

  const accName = (accId: string) => accounts.find((a: any) => a.id === accId)?.name || 'Unknown';

  // Date range gates everything below (list + totals); type filter and
  // search only narrow the browsable list, not the summary totals.
  const dateFilteredTxns = useMemo(() => {
    const all = transactions.filter((t: any) => t.account === id || t.toAccount === id);
    if (rangeMode !== 'custom') return all;
    const start = new Date(customFrom);
    const endRaw = new Date(customTo);
    const end = new Date(endRaw.getFullYear(), endRaw.getMonth(), endRaw.getDate(), 23, 59, 59, 999);
    return all.filter((t: any) => { const d = new Date(t.date); return d >= start && d <= end; });
  }, [transactions, id, rangeMode, customFrom, customTo]);

  const filtered = useMemo(() => dateFilteredTxns
    .filter((t: any) => filterType === 'all' || t.type === filterType)
    .filter((t: any) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return t.category?.toLowerCase().includes(q) || t.subcategory?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)
        || (t.type === 'transfer' && (accName(t.account).toLowerCase().includes(q) || accName(t.toAccount).toLowerCase().includes(q)));
    })
    .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date)),
  [dateFilteredTxns, filterType, search]);

  const totalIn = dateFilteredTxns
    .filter((t: any) => t.type === 'income' || (t.type === 'transfer' && t.toAccount === id))
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalOut = dateFilteredTxns
    .filter((t: any) => t.type === 'expense' || (t.type === 'transfer' && t.account === id))
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title={account?.name || 'Account'}
          showBack
          subtitle={
            <>
              Balance: <Text style={{ color: (account?.balance ?? 0) >= 0 ? Colors.green : Colors.red }}>{fmtSigned(account?.balance ?? 0)}</Text>
              {'  •  '}In: <Text style={{ color: Colors.green }}>{fmt(totalIn)}</Text>
              {'  •  '}Out: <Text style={{ color: Colors.red }}>{fmt(totalOut)}</Text>
            </>
          }
        />

        <View style={styles.searchWrap}>
          <Search size={16} color={Colors.text3} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search category / notes…"
            placeholderTextColor={Colors.text3}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterTabs}>
          {(['all', 'income', 'expense', 'transfer'] as const).map((t) => (
            <Pressable key={t} onPress={() => setFilterType(t)} style={[styles.filterTab, filterType === t && styles.filterTabActive]}>
              <Text style={[styles.filterTabText, filterType === t && styles.filterTabTextActive]}>{t[0].toUpperCase() + t.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.periodRow}>
          <Pressable onPress={() => setRangeMode('all')} style={[styles.periodPill, rangeMode === 'all' && styles.periodPillActive]}>
            <Text style={[styles.periodPillText, rangeMode === 'all' && styles.periodPillTextActive]}>All Time</Text>
          </Pressable>
          <Pressable onPress={() => setRangeMode('custom')} style={[styles.periodPill, rangeMode === 'custom' && styles.periodPillActive]}>
            <Text style={[styles.periodPillText, rangeMode === 'custom' && styles.periodPillTextActive]}>Custom Range</Text>
          </Pressable>
        </View>
        {rangeMode === 'custom' && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <DateField label="From" value={customFrom} onChange={setCustomFrom} maximumDate={new Date()} style={{ flex: 1 }} />
            <DateField label="To" value={customTo} onChange={setCustomTo} maximumDate={new Date()} style={{ flex: 1 }} />
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t: any) => t.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon={Wallet} title="No transactions found" />}
        renderItem={({ item: t }) => {
          const isTransfer = t.type === 'transfer';
          const isIn = t.type === 'income' || (isTransfer && t.toAccount === id);
          const color = isTransfer ? Colors.blue : isIn ? Colors.green : Colors.red;
          return (
            <Card style={styles.txnCard}>
              <View style={styles.txnTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.txnBadgeRow}>
                    {isTransfer ? (
                      <Badge label="Transfer" color={Colors.blue} />
                    ) : (
                      <>
                        <Badge label={t.category} color={t.type === 'income' ? Colors.green : Colors.red} />
                        {t.group ? <Badge label={t.group} color={Colors.accent2} /> : null}
                      </>
                    )}
                  </View>
                  {isTransfer ? (
                    <Text style={styles.txnSub}>{accName(t.account)} → {accName(t.toAccount)}</Text>
                  ) : (
                    t.subcategory ? <Text style={styles.txnSub}>{t.subcategory}</Text> : null
                  )}
                  {t.notes ? <Text style={styles.txnNotes}>{t.notes}</Text> : null}
                  <Text style={styles.txnMeta}>{t.date}</Text>
                </View>
                <Text style={{ color, fontWeight: '700', fontSize: FontSize.md }}>
                  {isTransfer ? '⇄ ' : isIn ? '+' : '-'}{fmt(t.amount)}
                </Text>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  searchWrap: { position: 'relative', justifyContent: 'center', marginBottom: Spacing.md },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    paddingVertical: 10, paddingLeft: 36, paddingRight: 14, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)', color: Colors.text1, fontSize: FontSize.base,
  },
  filterTabs: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  filterTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.sm },
  filterTabActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  filterTabText: { color: Colors.text2, fontWeight: '500', fontSize: FontSize.base },
  filterTabTextActive: { color: Colors.accentLight },
  periodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  periodPill: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  periodPillActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
  periodPillText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },
  periodPillTextActive: { color: Colors.accentLight },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  txnCard: { gap: 4 },
  txnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txnBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  txnSub: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  txnNotes: { color: Colors.text3, fontSize: FontSize.sm, fontStyle: 'italic', marginTop: 2 },
  txnMeta: { color: Colors.text3, fontSize: FontSize.xs, marginTop: 4 },
});
