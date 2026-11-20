import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, TextInput } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import HighlightsView from '../../components/insights/HighlightsView';
import TrendsView from '../../components/insights/TrendsView';
import CalendarView from '../../components/insights/CalendarView';
import WealthView from '../../components/insights/WealthView';
import ImproveView from '../../components/insights/ImproveView';
import { Search, X, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, ScreenHeader, PageHero, FilterChips, Sheet, Button, Tap } from '../../components/ui';
import { useTxnExplorer } from '../../components/TxnExplorer';
import Donut, { CHART_COLORS, OTHER_COLOR } from '../../components/charts/Donut';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { DIMS, PERIODS, Dim, Filter, PeriodId, Row, analyse, resolvePeriod, dimLabel, isTimeDim, nextDim } from '../../utils/insights';

// Insights — an explorer, not a fixed report. Pick what to look at (spent / income) and when, then slice it
// any way: break it down by category, sub-category, group, account, event, month or weekday; tap any bar to
// see its transactions, narrow to it, leave it out, or break it down further. Everything is read from the
// user's own data, so it works the same for any household.

function ExploreView() {
  const { state, fmt } = useApp();
  const explorer = useTxnExplorer();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [period, setPeriod] = useState<PeriodId>('cycle');
  const [dim, setDim] = useState<Dim>('category');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [query, setQuery] = useState('');
  const [compare, setCompare] = useState(true);
  const [picked, setPicked] = useState<Row | null>(null);
  const [showAll, setShowAll] = useState(false);

  const p = useMemo(() => resolvePeriod(state, period), [state, period]);
  const a = useMemo(() => analyse(state, { range: p.range, prev: compare ? p.prev : null, type, dim, filters, query }), [state, p, compare, type, dim, filters, query]);
  const time = isTimeDim(dim);
  const noun = type === 'expense' ? 'Spent' : 'Income';
  const max = Math.max(1, ...a.rows.map((r) => r.value));
  const colorOf = (i: number) => (i < CHART_COLORS.length - 1 ? CHART_COLORS[i] : OTHER_COLOR);

  const slices = (() => {
    const top = a.rows.slice(0, CHART_COLORS.length - 1).map((r, i) => ({ key: r.key, label: r.label, value: r.value, color: colorOf(i) }));
    const rest = a.rows.slice(CHART_COLORS.length - 1).reduce((s, r) => s + r.value, 0);
    return rest > 0 ? [...top, { key: '__rest', label: 'Others', value: rest, color: OTHER_COLOR }] : top;
  })();

  const has = (r: Row) => filters.some((f) => f.dim === dim && f.value === r.key && f.mode === 'in');
  const addFilter = (r: Row, mode: 'in' | 'out', thenDim?: Dim) => {
    setFilters((fs) => [...fs.filter((f) => !(f.dim === dim && f.value === r.key)), { dim, value: r.key, label: r.label, mode }]);
    if (thenDim) setDim(thenDim);
    else if (mode === 'in') setDim(nextDim(dim));
    setPicked(null);
  };
  const removeFilter = (f: Filter) => setFilters((fs) => fs.filter((x) => x !== f));
  const delta = (cur: number, prev: number | null) => (prev && prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const total = delta(a.total, a.prevTotal);
  const reset = () => { setFilters([]); setQuery(''); setDim('category'); };

  const sub = a.count === 0 ? 'Nothing matches these filters'
    : total === null ? `${a.count} transaction${a.count === 1 ? '' : 's'}`
      : `${total >= 0 ? '▲' : '▼'} ${Math.abs(total).toFixed(0)}% vs the period before (${fmt(a.prevTotal)})`;

  const visible = showAll ? a.rows : a.rows.slice(0, 8);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.seg}>
          {(['expense', 'income'] as const).map((k) => (
            <Pressable key={k} onPress={() => { setType(k); setFilters([]); }} style={[styles.segBtn, type === k && styles.segBtnActive]} accessibilityRole="button" accessibilityState={{ selected: type === k }}>
              <Text style={[styles.segText, type === k && { color: '#fff' }]}>{k === 'expense' ? 'Spending' : 'Income'}</Text>
            </Pressable>
          ))}
        </View>

        <FilterChips options={PERIODS.map((x) => ({ key: x.key, label: x.label }))} value={period} onChange={(k) => setPeriod(k as PeriodId)} />

        <View style={styles.search}>
          <Search size={16} color={Colors.text3} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search notes, categories…" placeholderTextColor={Colors.text3} style={styles.searchInput} returnKeyType="search" />
          {query ? <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search"><X size={16} color={Colors.text3} /></Pressable> : null}
        </View>

        {filters.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {filters.map((f, i) => (
              <Pressable key={i} onPress={() => removeFilter(f)} style={[styles.fchip, f.mode === 'out' && styles.fchipOut]} accessibilityRole="button" accessibilityLabel={`Remove filter ${f.mode === 'out' ? 'excluding' : 'only'} ${f.label}`}>
                <Text style={styles.fchipText} numberOfLines={1}>{f.mode === 'out' ? 'Not ' : ''}{f.label}</Text>
                <X size={13} color={Colors.accentLight} />
              </Pressable>
            ))}
            <Pressable onPress={reset} style={styles.clear} accessibilityRole="button"><Text style={styles.clearText}>Clear all</Text></Pressable>
          </ScrollView>
        ) : null}

        <PageHero
          label={`${noun} • ${p.label}`}
          value={fmt(a.total)}
          sub={sub}
          onPress={a.count ? () => explorer.show(`${noun} — ${p.label}`, a.txns, `${a.count} transactions`) : undefined}
          actionLabel="See all"
          stats={[
            { label: 'Transactions', value: String(a.count) },
            { label: 'Per day', value: fmt(a.total / a.days) },
            { label: 'Biggest', value: a.biggest ? fmt(a.biggest.amount) : '—', onPress: a.biggest ? () => explorer.showTxn(a.biggest) : undefined },
          ]}
        />

        <View style={styles.rowBetween}>
          <Text style={styles.heading}>Break down by</Text>
          {p.prev ? (
            <Pressable onPress={() => setCompare((c) => !c)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: compare }}>
              <Text style={styles.link}>{compare ? '✓ Comparing' : 'Compare'}</Text>
            </Pressable>
          ) : null}
        </View>
        <FilterChips options={DIMS.map((d) => ({ key: d.key, label: d.label }))} value={dim} onChange={(d) => { setDim(d as Dim); setShowAll(false); }} />

        {a.rows.length === 0 ? (
          <Card><Text style={styles.empty}>No transactions to show. Try another period or clear a filter.</Text></Card>
        ) : (
          <>
            {time ? (
              <Card>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.cols}>
                    {a.rows.map((r) => (
                      <Pressable key={r.key} onPress={() => setPicked(r)} style={styles.col} accessibilityRole="button" accessibilityLabel={`${r.label}, ${fmt(r.value)}, ${r.count} transactions`}>
                        <Text style={styles.colVal} numberOfLines={1}>{r.value >= 100000 ? (r.value / 100000).toFixed(1) + 'L' : r.value >= 1000 ? Math.round(r.value / 1000) + 'k' : Math.round(r.value)}</Text>
                        <View style={styles.colTrack}><View style={[styles.colFill, { height: `${Math.max(4, (r.value / max) * 100)}%`, backgroundColor: has(r) ? Colors.accent : Colors.accentLight + 'aa' }]} /></View>
                        <Text style={styles.colLabel} numberOfLines={1}>{r.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </Card>
            ) : (
              <Card style={styles.donutCard}>
                <Donut slices={slices} size={150} thickness={20} centerTop={noun} centerBottom={fmt(a.total)} />
                <View style={styles.legend}>
                  {slices.slice(0, 5).map((s) => (
                    <View key={s.key} style={styles.legendRow}>
                      <View style={[styles.dot, { backgroundColor: s.color }]} />
                      <Text style={styles.legendText} numberOfLines={1}>{s.label}</Text>
                      <Text style={styles.legendPct}>{Math.round((s.value / Math.max(1, a.total)) * 100)}%</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            <Card style={{ padding: 0 }}>
              {visible.map((r, i) => {
                const dl = delta(r.value, compare ? r.prev || null : null);
                return (
                  <Tap key={r.key} onPress={() => setPicked(r)} accessibilityLabel={`${r.label}, ${fmt(r.value)}, ${Math.round((r.value / Math.max(1, a.total)) * 100)} percent. Tap for options`}>
                    <View style={[styles.row, i > 0 && styles.rowBorder]}>
                      <View style={{ flex: 1, gap: 5 }}>
                        <View style={styles.rowTop}>
                          <Text style={styles.rowLabel} numberOfLines={1}>{r.label}</Text>
                          <Text style={styles.rowValue}>{fmt(r.value)}</Text>
                        </View>
                        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(2, (r.value / max) * 100)}%`, backgroundColor: time ? Colors.accentLight : colorOf(i) }]} /></View>
                        <View style={styles.rowTop}>
                          <Text style={styles.rowMeta}>{r.count} txn{r.count === 1 ? '' : 's'} • {Math.round((r.value / Math.max(1, a.total)) * 100)}%</Text>
                          {dl !== null ? (
                            <View style={styles.deltaWrap}>
                              {dl >= 0 ? <ArrowUpRight size={12} color={Colors.text2} /> : <ArrowDownRight size={12} color={Colors.text2} />}
                              <Text style={styles.rowMeta}>{Math.abs(dl).toFixed(0)}% vs before</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <ChevronRight size={16} color={Colors.text3} />
                    </View>
                  </Tap>
                );
              })}
            </Card>
            {a.rows.length > 8 ? (
              <Pressable onPress={() => setShowAll((s) => !s)} style={styles.more} accessibilityRole="button">
                <Text style={styles.link}>{showAll ? 'Show fewer' : `Show all ${a.rows.length}`}</Text>
              </Pressable>
            ) : null}

            <Text style={styles.heading}>Biggest transactions</Text>
            <Card style={{ padding: 0 }}>
              {[...a.txns].sort((x, y) => Number(y.amount) - Number(x.amount)).slice(0, 5).map((t, i) => (
                <Tap key={t.id} onPress={() => explorer.showTxn(t)} accessibilityLabel={`${t.category} ${fmt(t.amount)} on ${t.date}`}>
                  <View style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel} numberOfLines={1}>{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>{String(t.date).slice(0, 10)}{t.notes ? ` • ${t.notes}` : ''}</Text>
                    </View>
                    <Text style={styles.rowValue}>{fmt(t.amount)}</Text>
                    <ChevronRight size={16} color={Colors.text3} />
                  </View>
                </Tap>
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      <Sheet
        visible={!!picked}
        title={picked?.label || ''}
        subtitle={picked ? `${fmt(picked.value)} • ${picked.count} transaction${picked.count === 1 ? '' : 's'} • ${Math.round((picked.value / Math.max(1, a.total)) * 100)}% of ${noun.toLowerCase()}` : undefined}
        onClose={() => setPicked(null)}
        footer={picked ? (
          <>
            <Button title="Leave out" variant="secondary" onPress={() => addFilter(picked, 'out', dim)} style={{ flex: 1 }} />
            <Button title="Transactions" onPress={() => { const r = picked; setPicked(null); explorer.show(`${r.label}`, r.txns, `${fmt(r.value)} • ${p.label}`); }} style={{ flex: 1 }} />
          </>
        ) : null}
      >
        {picked ? (
          <>
            <Text style={styles.sheetHint}>Focus on “{picked.label}” and break it down by:</Text>
            <View style={styles.dimWrap}>
              {DIMS.filter((d) => d.key !== dim || true).map((d) => (
                <Pressable key={d.key} onPress={() => addFilter(picked, 'in', d.key)} style={styles.dimBtn} accessibilityRole="button" accessibilityLabel={`Focus on ${picked.label}, break down by ${d.label}`}>
                  <Text style={styles.dimBtnText}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sheetHint}>Or tap “Leave out” to see everything except this, or “Transactions” for the list behind it.</Text>
          </>
        ) : null}
      </Sheet>
      {explorer.node}
    </>
  );
}

const LENSES = [
  { key: 'highlights', label: 'Highlights' }, { key: 'explore', label: 'Explore' },
  { key: 'trends', label: 'Trends' }, { key: 'calendar', label: 'Calendar' },
  { key: 'wealth', label: 'Wealth' }, { key: 'improve', label: 'Improve' },
];

export default function Insights() {
  const params = useLocalSearchParams<{ lens?: string }>();
  const [lens, setLens] = useState(LENSES.some((l) => l.key === params.lens) ? String(params.lens) : 'highlights');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Insights" showBack subtitle="Look at your money from every angle" />
        <View style={{ marginTop: Spacing.sm }}><FilterChips options={LENSES} value={lens} onChange={setLens} /></View>
      </View>
      {lens === 'explore' ? <ExploreView /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {lens === 'highlights' ? <HighlightsView /> : lens === 'trends' ? <TrendsView /> : lens === 'wealth' ? <WealthView /> : lens === 'improve' ? <ImproveView /> : <CalendarView />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  seg: { flexDirection: 'row', gap: 2, backgroundColor: Colors.inset, borderRadius: Radius.md, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.md - 2 },
  segBtnActive: { backgroundColor: Colors.accent },
  segText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.base },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, minHeight: 44 },
  searchInput: { flex: 1, color: Colors.text1, fontSize: FontSize.base, paddingVertical: 8 },
  chipRow: { gap: Spacing.sm, alignItems: 'center' },
  fchip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, maxWidth: 220, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accentLight + '55' },
  fchipOut: { backgroundColor: Colors.panelHover, borderColor: Colors.border },
  fchipText: { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.sm, flexShrink: 1 },
  clear: { paddingHorizontal: Spacing.sm, minHeight: 34, justifyContent: 'center' },
  clearText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  heading: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  link: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  more: { alignItems: 'center', paddingVertical: Spacing.xs },
  empty: { color: Colors.text2, textAlign: 'center', paddingVertical: Spacing.lg, fontSize: FontSize.base },
  donutCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, color: Colors.text1, fontSize: FontSize.sm, fontWeight: '600' },
  legendPct: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '700' },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: Spacing.xs },
  col: { width: 44, alignItems: 'center', gap: 4 },
  colVal: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  colTrack: { height: 120, width: 26, justifyContent: 'flex-end', backgroundColor: Colors.inset, borderRadius: 8, overflow: 'hidden' },
  colFill: { width: '100%', borderRadius: 8 },
  colLabel: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  rowLabel: { flex: 1, color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  rowValue: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  rowMeta: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  deltaWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.inset, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  sheetHint: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 19 },
  dimWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dimBtn: { minHeight: 40, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  dimBtnText: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
}));
