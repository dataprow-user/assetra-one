import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit2, Trash2, Wallet, Search, Eye, EyeOff } from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Card, Badge, EmptyState, Button, Toast } from '../../../components/ui';
import { useToast } from '../../../hooks/useToast';
import TransactionFormModal from '../../../components/TransactionFormModal';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { useRouter } from 'expo-router';

export default function Transactions() {
  const { state, dispatch, fmt, fmtSigned, fmtN, amountsHidden, toggleAmounts } = useApp();
  const { transactions = [], accounts = [], events = [] } = state;
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: any } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');

  const filtered = transactions
    .filter((t: any) => filterType === 'all' || t.type === filterType)
    .filter((t: any) => {
      const q = search.toLowerCase();
      return q === '' || t.category?.toLowerCase().includes(q) || t.subcategory?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
    })
    .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date));

  const totalIncome = filtered.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = filtered.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  const handleDelete = (id: string) => {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'DELETE_TRANSACTION', payload: id }) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>
            {filtered.length} records • Income: <Text style={{ color: Colors.green }}>{fmt(totalIncome)}</Text> • Expenses: <Text style={{ color: Colors.red }}>{fmt(totalExpense)}</Text>
          </Text>
        </View>
        <Pressable onPress={toggleAmounts} hitSlop={10} style={styles.eyeBtn}>
          {amountsHidden ? <EyeOff size={20} color={Colors.text2} /> : <Eye size={20} color={Colors.accentLight} />}
        </Pressable>
      </View>

      {accounts.length === 0 && (
        <View style={styles.noAccountNotice}>
          <Wallet size={16} color={Colors.yellow} />
          <Text style={styles.noAccountText}>Add an account first so transactions can track a real balance.</Text>
          <Button title="Add Account" variant="secondary" size="sm" onPress={() => router.push('/(app)/(tabs)/accounts')} />
        </View>
      )}

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
        {(['all', 'income', 'expense'] as const).map((t) => (
          <Pressable key={t} onPress={() => setFilterType(t)} style={[styles.filterTab, filterType === t && styles.filterTabActive]}>
            <Text style={[styles.filterTabText, filterType === t && styles.filterTabTextActive]}>{t[0].toUpperCase() + t.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList extraData={fmt} 
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon={Wallet} title="No transactions found" />}
        renderItem={({ item: t }) => {
          const acc = accounts.find((a: any) => a.id === t.account);
          const ev = events.find((e: any) => e.id === t.eventId);
          return (
            <Card style={styles.txnCard}>
              <View style={styles.txnTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.txnBadgeRow}>
                    <Badge label={t.category} color={t.type === 'income' ? Colors.green : Colors.red} />
                    {t.group ? <Badge label={t.group} color={Colors.accent2} /> : null}
                    {ev ? <Badge label={ev.name} color={Colors.blue} /> : null}
                  </View>
                  {t.subcategory ? <Text style={styles.txnSub}>{t.subcategory}</Text> : null}
                  {t.notes ? <Text style={styles.txnNotes}>{t.notes}</Text> : null}
                  <Text style={styles.txnMeta}>{t.date} • {acc?.name || 'No account'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
                  <Text style={{ color: t.type === 'income' ? Colors.green : Colors.red, fontWeight: '700', fontSize: FontSize.md }}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <Pressable onPress={() => setModal({ mode: 'edit', data: t })} hitSlop={8}><Edit2 size={16} color={Colors.text2} /></Pressable>
                    <Pressable onPress={() => handleDelete(t.id)} hitSlop={8}><Trash2 size={16} color={Colors.red} /></Pressable>
                  </View>
                </View>
              </View>
            </Card>
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
      <Toast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  eyeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text1 },
  subtitle: { fontSize: FontSize.base, color: Colors.text2, marginTop: 2 },
  noAccountNotice: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.yellowBg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  noAccountText: { flex: 1, fontSize: FontSize.sm, color: Colors.text1 },
  searchWrap: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  searchInput: {
    paddingVertical: 10, paddingLeft: 36, paddingRight: 14, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(0,0,0,0.3)', color: Colors.text1, fontSize: FontSize.base,
  },
  filterTabs: { flexDirection: 'row', gap: 6, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  filterTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.sm },
  filterTabActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  filterTabText: { color: Colors.text2, fontWeight: '500', fontSize: FontSize.base },
  filterTabTextActive: { color: Colors.accentLight },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  txnCard: { gap: 4 },
  txnTop: { flexDirection: 'row', justifyContent: 'space-between' },
  txnBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  txnSub: { fontSize: FontSize.sm, color: Colors.text2 },
  txnNotes: { fontSize: FontSize.sm, color: Colors.text2, fontStyle: 'italic' },
  txnMeta: { fontSize: FontSize.sm, color: Colors.text3, marginTop: 4 },
});
