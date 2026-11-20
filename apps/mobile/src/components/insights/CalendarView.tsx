import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../ui/AppText';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import { useTxnExplorer } from '../TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { getBudgetCycle, currentBudgetMonth, MONTH_NAMES } from '../../utils/budgetPeriod';
import { dailyTotals, isoAddDays, isoParse, isoOf } from '../../utils/insightsViews';
import { daysBetween } from '../../utils/insights';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const short = (n: number) => (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(Math.round(n)));

// Every day of a budget month as a heat-map: darker = more. Tap a day to see what happened.
export default function CalendarView() {
  const { state, fmt } = useApp();
  const explorer = useTxnExplorer();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [offset, setOffset] = useState(0);

  const cur = currentBudgetMonth(state);
  const t = cur.year * 12 + cur.month - offset;
  const ym = { year: Math.floor(t / 12), month: t % 12 };
  const cyc = getBudgetCycle(state, ym.year, ym.month);
  const totals = useMemo(() => dailyTotals(state, cyc, type), [state, cyc.start, cyc.end, type]);

  const len = daysBetween(cyc.start, cyc.end);
  const days = Array.from({ length: len }, (_, i) => isoAddDays(cyc.start, i));
  const lead = (isoParse(cyc.start).getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);

  const vals = days.map((d) => totals.get(d)?.total || 0);
  const total = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...vals);
  const today = isoOf(new Date());
  const elapsed = days.filter((d) => d <= today).length || len;
  const peakIdx = vals.indexOf(Math.max(...vals));
  const quiet = days.filter((d, i) => d <= today && vals[i] === 0).length;
  const alpha = (v: number) => (v <= 0 ? null : Math.round(0.16 * 255 + (v / max) * 0.84 * 255).toString(16).padStart(2, '0'));
  const base = type === 'expense' ? Colors.accent : Colors.green;

  const open = (d: string) => {
    const e = totals.get(d);
    if (e) explorer.show(isoParse(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }), e.txns, `${fmt(e.total)} • ${e.txns.length} transaction${e.txns.length === 1 ? '' : 's'}`);
  };

  return (
    <>
      <View style={styles.seg}>
        {(['expense', 'income'] as const).map((k) => (
          <Pressable key={k} onPress={() => setType(k)} style={[styles.segBtn, type === k && styles.segBtnActive]} accessibilityRole="button" accessibilityState={{ selected: type === k }}>
            <Text style={[styles.segText, type === k && { color: '#fff' }]}>{k === 'expense' ? 'Spending' : 'Income'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setOffset((o) => o + 1)} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Earlier month"><ChevronLeft size={18} color={Colors.text1} /></Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.month}>{MONTH_NAMES[ym.month]} {ym.year}</Text>
          <Text style={styles.range}>{cyc.start} → {cyc.end}</Text>
        </View>
        <Pressable onPress={() => setOffset((o) => Math.max(0, o - 1))} style={[styles.arrow, offset === 0 && { opacity: 0.35 }]} disabled={offset === 0} accessibilityRole="button" accessibilityLabel="Later month"><ChevronRight size={18} color={Colors.text1} /></Pressable>
      </View>

      <Card style={{ gap: Spacing.sm }}>
        <View style={styles.grid}>
          {DOW.map((d, i) => <View key={i} style={styles.cell}><Text style={styles.dow}>{d}</Text></View>)}
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const v = totals.get(d)?.total || 0;
            const a = alpha(v);
            const day = Number(d.slice(8, 10));
            return (
              <View key={i} style={styles.cell}>
                <Pressable onPress={() => open(d)} disabled={!v} style={[styles.day, { backgroundColor: a ? base + a : Colors.inset }, d === today && styles.today]} accessibilityRole="button" accessibilityLabel={`${d}, ${v ? fmt(v) : 'nothing'}`}>
                  <Text style={[styles.dayNum, a && v / max > 0.55 && { color: '#fff' }]}>{day}</Text>
                  {v ? <Text style={[styles.dayVal, v / max > 0.55 && { color: '#ffffffdd' }]} numberOfLines={1}>{short(v)}</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={styles.scale}><Text style={styles.range}>less</Text>{[0.2, 0.45, 0.7, 1].map((x) => <View key={x} style={[styles.swatch, { backgroundColor: base + alpha(x * max) }]} />)}<Text style={styles.range}>more</Text></View>
      </Card>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statVal}>{fmt(total)}</Text><Text style={styles.range}>total</Text></View>
        <View style={styles.stat}><Text style={styles.statVal}>{fmt(total / Math.max(1, elapsed))}</Text><Text style={styles.range}>per day</Text></View>
        <Pressable style={styles.stat} onPress={() => open(days[peakIdx])} disabled={!vals[peakIdx]}>
          <Text style={styles.statVal}>{vals[peakIdx] ? fmt(vals[peakIdx]) : '—'}</Text><Text style={styles.range}>busiest day{vals[peakIdx] ? ` (${Number(days[peakIdx].slice(8))})` : ''}</Text>
        </Pressable>
        <View style={styles.stat}><Text style={styles.statVal}>{quiet}</Text><Text style={styles.range}>quiet days</Text></View>
      </View>
      {explorer.node}
    </>
  );
}

const styles = createStyles(() => ({
  seg: { flexDirection: 'row', gap: 2, backgroundColor: Colors.inset, borderRadius: Radius.md, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.md - 2 },
  segBtnActive: { backgroundColor: Colors.accent },
  segText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.base },
  nav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  arrow: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  month: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  range: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', padding: 2, alignItems: 'center' },
  dow: { color: Colors.text3, fontSize: FontSize.xs, fontWeight: '800', paddingBottom: 2 },
  day: { width: '100%', aspectRatio: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: Colors.text1 },
  dayNum: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '800' },
  dayVal: { color: Colors.text1, fontSize: 9, fontWeight: '700' },
  scale: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  swatch: { width: 18, height: 12, borderRadius: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 2 },
  statVal: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
}));
