import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './ui/AppText';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import Sheet from './ui/Sheet';
import { loanStatus } from '../utils/loans';
import { assetStatus } from '../utils/entities';
import Donut, { CHART_COLORS, Slice } from './charts/Donut';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';

// Tap the Home hero → this: what your net worth is made of.
export default function NetWorthSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, fmt, fmtSigned } = useApp();
  const router = useRouter();
  const { assets = [], liabilities = [], accounts = [], assetTypes = [], liabilityTypes = [] } = state;

  const assetValue = (a: any) => assetStatus(a, state.transactions || []).current;
  const totalAssets = assets.reduce((s: number, a: any) => s + assetValue(a), 0);
  const liveBalance = (l: any) => loanStatus(l, state.transactions || []).outstanding;
  const totalLiab = liabilities.reduce((s: number, l: any) => s + liveBalance(l), 0);
  const net = totalAssets - totalLiab;

  const typeLabel = (list: any[], id: string) => list.find((t: any) => t.id === id)?.label || String(id || 'Other').replace(/_/g, ' ');

  const byType = new Map<string, number>();
  assets.forEach((a: any) => byType.set(a.type, (byType.get(a.type) || 0) + assetValue(a)));
  const slices: Slice[] = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, value], i) => ({ key: type, label: typeLabel(assetTypes, type), value, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const cash = accounts.filter((a: any) => ['bank', 'cash', 'wallet'].includes(a.type));
  const go = (path: string) => { onClose(); setTimeout(() => router.push(path as any), 150); };

  return (
    <Sheet visible={visible} title="Net worth" subtitle="What you own minus what you owe" onClose={onClose}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Net worth</Text>
        <Text style={[styles.heroValue, { color: net >= 0 ? Colors.text1 : Colors.red }]}>{fmtSigned(net)}</Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}><Text style={styles.small}>Assets</Text><Text style={[styles.pairVal, { color: Colors.green }]}>{fmt(totalAssets)}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.small}>Liabilities</Text><Text style={[styles.pairVal, { color: Colors.red }]}>{fmt(totalLiab)}</Text></View>
        </View>
      </View>

      <Text style={styles.section}>Your assets</Text>
      {slices.length === 0 ? <Text style={styles.empty}>No assets added yet.</Text> : (
        <View style={{ alignItems: 'center', gap: Spacing.lg }}>
          <Donut slices={slices} centerTop="Assets" centerBottom={fmt(totalAssets)} />
          <View style={{ alignSelf: 'stretch' }}>
            {slices.map((s) => (
              <Pressable key={s.key} onPress={() => go('/(app)/assets')} style={styles.legendRow} accessibilityRole="button" accessibilityLabel={`${s.label}, ${fmt(s.value)}, ${totalAssets ? ((s.value / totalAssets) * 100).toFixed(0) : 0} percent. Open assets`}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text style={styles.legendName} numberOfLines={1}>{s.label}</Text>
                <Text style={styles.legendPct}>{totalAssets ? ((s.value / totalAssets) * 100).toFixed(0) : 0}%</Text>
                <Text style={styles.legendVal}>{fmt(s.value)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.section}>What you owe</Text>
      {liabilities.length === 0 ? <Text style={styles.empty}>No loans or liabilities. 🎉</Text> : liabilities.map((l: any) => (
        <Pressable key={l.id} onPress={() => go('/(app)/liabilities')} style={styles.itemRow} accessibilityRole="button" accessibilityLabel={`${l.name}, outstanding ${fmt(liveBalance(l))}. Open liabilities`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{l.name}</Text>
            <Text style={styles.itemMeta}>{typeLabel(liabilityTypes, l.type)}{l.emi ? ` • EMI ${fmt(l.emi)}` : ''}</Text>
          </View>
          <Text style={[styles.itemVal, { color: Colors.red }]}>{fmt(liveBalance(l))}</Text>
          <ChevronRight size={16} color={Colors.text3} />
        </Pressable>
      ))}

      {cash.length > 0 ? (
        <>
          <Text style={styles.section}>Cash in hand</Text>
          {cash.map((a: any) => (
            <Pressable key={a.id} onPress={() => go('/(app)/(tabs)/accounts')} style={styles.itemRow} accessibilityRole="button" accessibilityLabel={`${a.name}, balance ${fmt(a.balance)}. Open accounts`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{a.name}</Text>
                <Text style={styles.itemMeta}>{String(a.type).replace('_', ' ')}</Text>
              </View>
              <Text style={[styles.itemVal, { color: a.balance < 0 ? Colors.red : Colors.text1 }]}>{fmtSigned(a.balance)}</Text>
              <ChevronRight size={16} color={Colors.text3} />
            </Pressable>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = createStyles(() => ({
  hero: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, padding: Spacing.lg, gap: 4 },
  heroLabel: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600' },
  heroValue: { fontSize: FontSize.xxxl, fontWeight: '800', letterSpacing: -0.5 },
  pair: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  small: { color: Colors.text2, fontSize: FontSize.sm },
  pairVal: { fontSize: FontSize.lg, fontWeight: '800', marginTop: 2 },
  section: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: '800', marginTop: Spacing.md },
  empty: { color: Colors.text2, fontSize: FontSize.base },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendName: { flex: 1, color: Colors.text1, fontSize: FontSize.base, fontWeight: '600' },
  legendPct: { color: Colors.text2, fontSize: FontSize.base, width: 42, textAlign: 'right' },
  legendVal: { color: Colors.text1, fontSize: FontSize.base, fontWeight: '800', minWidth: 80, textAlign: 'right' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingVertical: Spacing.sm },
  itemName: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '700' },
  itemMeta: { color: Colors.text2, fontSize: FontSize.sm, textTransform: 'capitalize' },
  itemVal: { fontSize: FontSize.md, fontWeight: '800' },
}));
