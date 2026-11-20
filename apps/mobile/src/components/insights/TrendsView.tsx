import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '../ui/AppText';
import { ChevronRight } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import Tap from '../ui/Tap';
import FilterChips from '../ui/FilterChips';
import { useTxnExplorer } from '../TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { monthlyFlow, categoryTrend, byType } from '../../utils/insightsViews';

const short = (n: number) => (Math.abs(n) >= 100000 ? (n / 100000).toFixed(1) + 'L' : Math.abs(n) >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n)));
const H = 110;

// Month-by-month: income vs spending vs what's kept, and a "track one thing over time" view for any category.
export default function TrendsView() {
  const { state, fmt } = useApp();
  const explorer = useTxnExplorer();
  const [n, setN] = useState('6');
  const [cat, setCat] = useState<string>('');
  const months = Number(n);
  const flow = useMemo(() => monthlyFlow(state, months), [state, months]);
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    byType(state, 'expense').forEach((t: any) => m.set(t.category, (m.get(t.category) || 0) + Number(t.amount)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c]) => c);
  }, [state]);
  const trend = useMemo(() => categoryTrend(state, cat || null, months), [state, cat, months]);

  const maxFlow = Math.max(1, ...flow.flatMap((f) => [f.income, f.spent]));
  const maxT = Math.max(1, ...trend.map((t) => t.value));
  const totalIn = flow.reduce((s, f) => s + f.income, 0), totalOut = flow.reduce((s, f) => s + f.spent, 0);
  const avgT = trend.reduce((s, t) => s + t.value, 0) / Math.max(1, trend.length);
  const peak = trend.reduce((p, t) => (t.value > p.value ? t : p), trend[0]);

  return (
    <>
      <FilterChips options={[{ key: '3', label: '3 months' }, { key: '6', label: '6 months' }, { key: '12', label: '12 months' }]} value={n} onChange={setN} />

      <Text style={styles.heading}>Income vs spending</Text>
      <Card style={{ gap: Spacing.md }}>
        <View style={styles.legendRow}>
          <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.green }]} /><Text style={styles.legendText}>Income {fmt(totalIn)}</Text></View>
          <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.accentLight }]} /><Text style={styles.legendText}>Spent {fmt(totalOut)}</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.cols}>
            {flow.map((f) => (
              <Pressable key={f.label} onPress={() => explorer.show(`${f.label} — spending`, f.expenseTxns, `${fmt(f.spent)} spent • ${fmt(f.income)} income`)} style={styles.colGroup} accessibilityRole="button" accessibilityLabel={`${f.label}: income ${fmt(f.income)}, spent ${fmt(f.spent)}`}>
                <View style={styles.pair}>
                  <View style={styles.track}><View style={[styles.fill, { height: Math.max(3, (f.income / maxFlow) * H), backgroundColor: Colors.green }]} /></View>
                  <View style={styles.track}><View style={[styles.fill, { height: Math.max(3, (f.spent / maxFlow) * H), backgroundColor: Colors.accentLight }]} /></View>
                </View>
                <Text style={styles.colLabel}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Card style={{ padding: 0 }}>
        {[...flow].reverse().map((f, i) => (
          <Tap key={f.label} onPress={() => explorer.show(`${f.label} — spending`, f.expenseTxns, `${fmt(f.spent)} spent`)} accessibilityLabel={`${f.label}. Income ${fmt(f.income)}, spent ${fmt(f.spent)}, ${f.saved >= 0 ? 'kept' : 'short by'} ${fmt(f.saved)}`}>
            <View style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{f.label}</Text>
                <Text style={styles.rowMeta}>In {fmt(f.income)} • Out {fmt(f.spent)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rowTitle, { color: f.saved >= 0 ? Colors.green : Colors.text1 }]}>{f.saved >= 0 ? '+' : '−'}{fmt(f.saved)}</Text>
                <Text style={styles.rowMeta}>{f.rate === null ? 'no income' : `${f.rate >= 0 ? f.rate.toFixed(0) + '% kept' : 'above income'}`}</Text>
              </View>
              <ChevronRight size={16} color={Colors.text3} />
            </View>
          </Tap>
        ))}
      </Card>

      <Text style={styles.heading}>Track one thing over time</Text>
      <FilterChips options={[{ key: '', label: 'All spending' }, ...cats.map((c) => ({ key: c, label: c }))]} value={cat} onChange={setCat} />
      <Card style={{ gap: Spacing.md }}>
        <Text style={styles.rowMeta}>
          Average {fmt(avgT)} a month{peak && peak.value > 0 ? ` • highest in ${peak.label} (${fmt(peak.value)})` : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.cols}>
            {trend.map((t) => (
              <Pressable key={t.label} onPress={() => explorer.show(`${cat || 'Spending'} — ${t.label}`, t.txns, fmt(t.value))} style={styles.colGroup} accessibilityRole="button" accessibilityLabel={`${t.label}: ${fmt(t.value)}`}>
                <Text style={styles.colVal}>{short(t.value)}</Text>
                <View style={styles.track}><View style={[styles.fill, { height: Math.max(3, (t.value / maxT) * H), backgroundColor: t === peak ? Colors.accent : Colors.accentLight + 'aa' }]} /></View>
                <Text style={styles.colLabel}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.avgLine}><Text style={styles.rowMeta}>Dashed average: {fmt(avgT)}</Text></View>
      </Card>
      {explorer.node}
    </>
  );
}

const styles = createStyles(() => ({
  heading: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md, marginTop: Spacing.xs },
  legendRow: { flexDirection: 'row', gap: Spacing.lg },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '700' },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: Spacing.xs },
  colGroup: { alignItems: 'center', gap: 4, minWidth: 54 },
  pair: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  track: { height: H, width: 22, justifyContent: 'flex-end', backgroundColor: Colors.inset, borderRadius: 7, overflow: 'hidden' },
  fill: { width: '100%', borderRadius: 7 },
  colVal: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  colLabel: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  rowMeta: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  avgLine: { borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed', paddingTop: Spacing.xs },
}));
