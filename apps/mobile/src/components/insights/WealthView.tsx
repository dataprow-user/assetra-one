import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '../ui/AppText';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import Tap from '../ui/Tap';
import Sheet from '../ui/Sheet';
import PageHero from '../ui/PageHero';
import ProgressBar from '../ui/ProgressBar';
import Donut from '../charts/Donut';
import { useTxnExplorer } from '../TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { wealth, hasSchedule } from '../../utils/wealth';

const short = (n: number) => (Math.abs(n) >= 100000 ? (n / 100000).toFixed(1) + 'L' : Math.abs(n) >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n)));
const H = 90;

// The other half of the picture: what you own (assets & investments), what you owe (loans), cash in hand, and how
// money is moving into investments — each part opens the detail behind it.
export default function WealthView() {
  const { state, fmt } = useApp();
  const router = useRouter();
  const explorer = useTxnExplorer();
  const w = useMemo(() => wealth(state), [state]);
  const [openType, setOpenType] = useState<string | null>(null);
  const group = w.byAssetType.find((g) => g.key === openType);
  const go = (route: string) => router.push(route as any);

  const maxInv = Math.max(1, ...w.investing.map((m) => Math.max(m.put, m.out)));
  const scheduled = w.loans.filter(hasSchedule);
  const informal = w.loans.filter((r) => !hasSchedule(r));
  const ranked = [...w.assets].filter((r) => r.st.invested > 0).sort((a, b) => b.st.gainPct - a.st.gainPct);
  const best = ranked.slice(0, 3), worst = ranked.length > 3 ? ranked.slice(-3).reverse() : [];
  const topShare = w.byAssetType[0] && w.current > 0 ? (w.byAssetType[0].value / w.current) * 100 : 0;

  return (
    <>
      <PageHero
        label="Net worth"
        value={`${w.netWorth < 0 ? '−' : ''}${fmt(w.netWorth)}`}
        sub={`${fmt(w.current)} owned − ${fmt(w.debt)} owed`}
        stats={[
          { label: 'Invested', value: fmt(w.invested), onPress: () => go('/(app)/assets') },
          { label: w.gain >= 0 ? 'Gain' : 'Loss', value: `${w.gain >= 0 ? '+' : '−'}${fmt(w.gain)}`, onPress: () => go('/(app)/assets') },
          { label: 'Loans', value: fmt(w.debt), onPress: () => go('/(app)/liabilities') },
        ]}
      />

      <View style={styles.tiles}>
        <View style={styles.tile}><Text style={styles.tileVal}>{fmt(w.liquid)}</Text><Text style={styles.tileLbl}>in accounts</Text></View>
        <View style={styles.tile}>
          <Text style={styles.tileVal}>{w.emergencyMonths === null ? '—' : w.emergencyMonths.toFixed(1) + ' mo'}</Text>
          <Text style={styles.tileLbl}>of spending covered</Text>
        </View>
        <View style={styles.tile}><Text style={styles.tileVal}>{w.avgIncome > 0 ? ((w.emiTotal / w.avgIncome) * 100).toFixed(0) + '%' : '—'}</Text><Text style={styles.tileLbl}>of income to EMIs</Text></View>
        <View style={styles.tile}><Text style={styles.tileVal}>{w.avgIncome > 0 ? ((w.avgKept / w.avgIncome) * 100).toFixed(0) + '%' : '—'}</Text><Text style={styles.tileLbl}>average kept</Text></View>
      </View>

      <Text style={styles.heading}>What you own</Text>
      {w.assets.length === 0 ? (
        <Card><Text style={styles.empty}>No assets added yet. Add gold, funds, deposits and more in Assets to see them here.</Text></Card>
      ) : (
        <>
          <Card style={styles.donutCard}>
            <Donut slices={w.byAssetType.map((g) => ({ key: g.key, label: g.label, value: g.value, color: g.color }))} size={140} thickness={19} centerTop="Assets" centerBottom={fmt(w.current)} />
            <View style={{ flex: 1, gap: 8 }}>
              {w.byAssetType.slice(0, 5).map((g) => (
                <Pressable key={g.key} onPress={() => setOpenType(g.key)} style={styles.legendRow} accessibilityRole="button" accessibilityLabel={`${g.label}, ${fmt(g.value)}`}>
                  <View style={[styles.dot, { backgroundColor: g.color }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{g.label}</Text>
                  <Text style={styles.legendPct}>{Math.round((g.value / Math.max(1, w.current)) * 100)}%</Text>
                </Pressable>
              ))}
            </View>
          </Card>
          <Card style={{ padding: 0 }}>
            {w.byAssetType.map((g, i) => {
              const gain = g.value - g.invested;
              return (
                <Tap key={g.key} onPress={() => setOpenType(g.key)} accessibilityLabel={`${g.label}. ${fmt(g.value)} across ${g.rows.length} holdings. Tap for the list`}>
                  <View style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={[styles.dot, { backgroundColor: g.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{g.label}</Text>
                      <Text style={styles.rowMeta}>{g.rows.length} holding{g.rows.length === 1 ? '' : 's'} • invested {fmt(g.invested)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.rowTitle}>{fmt(g.value)}</Text>
                      <Text style={styles.rowMeta}>{g.invested > 0 ? `${gain >= 0 ? '+' : '−'}${fmt(gain)} (${((gain / g.invested) * 100).toFixed(0)}%)` : '—'}</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.text3} />
                  </View>
                </Tap>
              );
            })}
          </Card>
          {topShare >= 60 ? <Text style={styles.note}>{Math.round(topShare)}% of what you own sits in {w.byAssetType[0].label}. A spread across more types can steady the total — see the Improve view.</Text> : null}

          {ranked.length >= 2 ? (
            <>
              <Text style={styles.heading}>Best and slowest holdings</Text>
              <Card style={{ padding: 0 }}>
                {[...best.map((r) => ({ r, k: 'b' })), ...worst.map((r) => ({ r, k: 'w' }))].map(({ r, k }, i) => (
                  <Tap key={r.a.id + k} onPress={() => go('/(app)/assets')} accessibilityLabel={`${r.a.name}, ${r.st.gainPct.toFixed(0)} percent`}>
                    <View style={[styles.row, i > 0 && styles.rowBorder]}>
                      <View style={{ flex: 1 }}><Text style={styles.rowTitle} numberOfLines={1}>{r.a.name}</Text><Text style={styles.rowMeta}>{r.typeLabel} • now {fmt(r.st.current)}</Text></View>
                      <Text style={[styles.rowTitle, { color: r.st.gainPct >= 0 ? Colors.green : Colors.text1 }]}>{r.st.gainPct >= 0 ? '+' : '−'}{Math.abs(r.st.gainPct).toFixed(0)}%</Text>
                    </View>
                  </Tap>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}

      <Text style={styles.heading}>Money going into investments</Text>
      <Card style={{ gap: Spacing.md }}>
        <Text style={styles.rowMeta}>Average {fmt(w.avgInvest)} a month over the last 6 budget months{w.avgIncome > 0 ? ` • ${((w.avgInvest / w.avgIncome) * 100).toFixed(0)}% of income` : ''}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.cols}>
            {w.investing.map((m) => (
              <Pressable key={m.label} onPress={() => m.txns.length && explorer.show(`Investments — ${m.label}`, m.txns, `${fmt(m.put)} in • ${fmt(m.out)} out`)} style={styles.col} accessibilityRole="button" accessibilityLabel={`${m.label}: ${fmt(m.net)} net into investments`}>
                <Text style={styles.colVal}>{short(m.put)}</Text>
                <View style={styles.track}><View style={[styles.fill, { height: Math.max(3, (m.put / maxInv) * H) }]} /></View>
                <Text style={styles.colLabel}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Card>

      <Text style={styles.heading}>What you owe</Text>
      {w.loans.length === 0 ? (
        <Card><Text style={styles.empty}>No open loans. Nothing owed.</Text></Card>
      ) : (
        <>
          <Card style={styles.debtSummary}>
            <View style={styles.sumCell}><Text style={styles.tileVal}>{fmt(w.debt)}</Text><Text style={styles.tileLbl}>outstanding</Text></View>
            <View style={styles.sumCell}><Text style={styles.tileVal}>{fmt(w.emiTotal)}</Text><Text style={styles.tileLbl}>EMIs a month</Text></View>
            <View style={styles.sumCell}><Text style={styles.tileVal}>{fmt(w.interestMonthly)}</Text><Text style={styles.tileLbl}>interest a month</Text></View>
          </Card>
          <Card style={{ padding: 0 }}>
            {[...scheduled, ...informal].map((r, i) => (
              <Tap key={r.l.id} onPress={() => go('/(app)/liabilities')} accessibilityLabel={`${r.l.name}, ${fmt(r.balance)} outstanding`}>
                <View style={[styles.row, i > 0 && styles.rowBorder, { alignItems: 'stretch' }]}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={styles.between}><Text style={styles.rowTitle} numberOfLines={1}>{r.l.name}</Text><Text style={styles.rowTitle}>{fmt(r.balance)}</Text></View>
                    {r.paidPct !== null ? <ProgressBar pct={r.paidPct} color={Colors.green} /> : null}
                    <Text style={styles.rowMeta}>
                      {r.rate > 0 ? `${r.rate}% interest` : 'no interest'} • {hasSchedule(r) ? `EMI ${fmt(r.emi)}${r.st.monthsLeft ? ` • ${r.st.monthsLeft} months left` : ''}` : 'no fixed repayment schedule'}{r.paidPct !== null ? ` • ${r.paidPct.toFixed(0)}% repaid` : ''}
                    </Text>
                  </View>
                </View>
              </Tap>
            ))}
          </Card>
        </>
      )}

      <Sheet visible={!!group} title={group?.label || ''} subtitle={group ? `${fmt(group.value)} • ${group.rows.length} holding${group.rows.length === 1 ? '' : 's'}` : undefined} onClose={() => setOpenType(null)}>
        {group?.rows.sort((a, b) => b.st.current - a.st.current).map((r) => (
          <Tap key={r.a.id} onPress={() => { setOpenType(null); go('/(app)/assets'); }} accessibilityLabel={`${r.a.name}, ${fmt(r.st.current)}`}>
            <View style={styles.sheetRow}>
              <View style={{ flex: 1 }}><Text style={styles.rowTitle} numberOfLines={2}>{r.a.name}</Text><Text style={styles.rowMeta}>invested {fmt(r.st.invested)}</Text></View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rowTitle}>{fmt(r.st.current)}</Text>
                <Text style={styles.rowMeta}>{r.st.invested > 0 ? `${r.st.gain >= 0 ? '+' : '−'}${fmt(r.st.gain)}` : ''}</Text>
              </View>
            </View>
          </Tap>
        ))}
      </Sheet>
      {explorer.node}
    </>
  );
}

const styles = createStyles(() => ({
  heading: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md, marginTop: Spacing.sm },
  empty: { color: Colors.text2, textAlign: 'center', paddingVertical: Spacing.md, fontSize: FontSize.base },
  note: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 19 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 2 },
  tileVal: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  tileLbl: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  donutCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, color: Colors.text1, fontSize: FontSize.sm, fontWeight: '600' },
  legendPct: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base, flexShrink: 1 },
  rowMeta: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  between: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  col: { alignItems: 'center', gap: 4, minWidth: 48 },
  colVal: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  colLabel: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  track: { height: H, width: 26, justifyContent: 'flex-end', backgroundColor: Colors.inset, borderRadius: 8, overflow: 'hidden' },
  fill: { width: '100%', borderRadius: 8, backgroundColor: Colors.green },
  debtSummary: { flexDirection: 'row', gap: Spacing.md },
  sumCell: { flex: 1, gap: 2 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panelHover },
}));
