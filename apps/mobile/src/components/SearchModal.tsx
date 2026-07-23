import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X, List, Wallet, TrendingUp, CreditCard, PieChart, CalendarDays, Shield, Tags } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { Colors, Radius, FontSize, Spacing, Shadow } from '../constants/theme';

// Mirrors web Header.jsx's searchAppData — same entity types, same fields.
function searchAppData(state: any, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const results: { id: string; type: string; icon: any; label: string; sub?: string; route: string }[] = [];

  (state.transactions || []).forEach((t: any) => {
    const hay = [t.description, t.category, t.subcategory, t.notes].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q)) {
      results.push({ id: `txn-${t.id}`, type: 'Transaction', icon: List, label: t.category + (t.subcategory ? ` › ${t.subcategory}` : ''), sub: t.notes || t.date, route: '/(app)/(tabs)/transactions' });
    }
  });
  (state.accounts || []).forEach((a: any) => {
    if (a.name.toLowerCase().includes(q)) results.push({ id: `acc-${a.id}`, type: 'Account', icon: Wallet, label: a.name, sub: a.type, route: '/(app)/(tabs)/accounts' });
  });
  (state.assets || []).forEach((a: any) => {
    if (a.name.toLowerCase().includes(q)) results.push({ id: `ast-${a.id}`, type: 'Asset', icon: TrendingUp, label: a.name, sub: a.type, route: '/(app)/assets' });
  });
  (state.liabilities || []).forEach((l: any) => {
    if (l.name.toLowerCase().includes(q)) results.push({ id: `lia-${l.id}`, type: 'Liability', icon: CreditCard, label: l.name, sub: l.type, route: '/(app)/liabilities' });
  });
  (state.budgets || []).forEach((b: any) => {
    const hay = `${b.name || ''} ${b.category || ''}`.toLowerCase();
    if (hay.includes(q)) results.push({ id: `bud-${b.id}`, type: 'Budget', icon: PieChart, label: b.name || b.category, sub: [b.month, b.year].filter(Boolean).join(' '), route: '/(app)/budgets' });
  });
  (state.events || []).forEach((e: any) => {
    if (e.name.toLowerCase().includes(q)) results.push({ id: `evt-${e.id}`, type: 'Event', icon: CalendarDays, label: e.name, sub: e.startDate, route: '/(app)/events' });
  });
  (state.insurance || []).forEach((p: any) => {
    const hay = `${p.name || ''} ${p.policyNo || ''}`.toLowerCase();
    if (hay.includes(q)) results.push({ id: `ins-${p.id}`, type: 'Insurance', icon: Shield, label: p.name, sub: p.policyNo, route: '/(app)/insurance' });
  });
  [...(state.expenseCategories || []), ...(state.incomeCategories || [])].forEach((c: any) => {
    if (c.name.toLowerCase().includes(q)) results.push({ id: `cat-${c.id}`, type: 'Category', icon: Tags, label: c.name, sub: c.group, route: '/(app)/categories' });
  });

  return results.slice(0, 30);
}

export default function SearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchAppData(state, query), [state, query]);

  const goTo = (route: string) => {
    setQuery('');
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.searchRow}>
            <Search size={16} color={Colors.text3} />
            <TextInput
              style={styles.input}
              placeholder="Search transactions, accounts, assets…"
              placeholderTextColor={Colors.text3}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            <Pressable onPress={onClose} hitSlop={10}><X size={20} color={Colors.text2} /></Pressable>
          </View>

          <FlatList
            data={results}
            keyExtractor={(r) => r.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 420 }}
            ListEmptyComponent={
              query.trim() ? <Text style={styles.emptyText}>No results found for "{query}"</Text> : null
            }
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => goTo(item.route)}>
                <item.icon size={16} color={Colors.accentLight} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultLabel} numberOfLines={1}>{item.label}</Text>
                  {item.sub ? <Text style={styles.resultSub} numberOfLines={1}>{item.sub}</Text> : null}
                </View>
                <Text style={styles.resultType}>{item.type}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: Spacing.lg },
  box: {
    backgroundColor: '#141824', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderStrong,
    ...Shadow.xl, overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  input: { flex: 1, color: Colors.text1, fontSize: FontSize.md, paddingVertical: 4 },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center', padding: Spacing.xl },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12,
    paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  resultLabel: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  resultSub: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 1 },
  resultType: { color: Colors.text3, fontSize: FontSize.xs, fontWeight: '600' },
});
