import React, { useState, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { Text, TextInput } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Edit2, Minus, Plus, Search, SlidersHorizontal, Lightbulb, Gauge, CheckCircle2, Check } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import { Card, EmptyState, ScreenHeader, ProgressBar, BudgetBar, budgetTone } from '../../components/ui';
import TransactionFormModal from '../../components/TransactionFormModal';
import { Colors, FontSize, Spacing, Radius, GroupColors, createStyles } from '../../constants/theme';
import { MONTH_NAMES, parseYMD, getSalaryCutoff, getBudgetCycle, getYearWindow, currentBudgetMonth, rangePace, inRange, cycleRangeLabel } from '../../utils/budgetPeriod';

// Budget vs Spent — the drill-down behind the dashboard's budget card.
// Top-down reading order: the answer (left / over) → what needs attention →
// every category with its difference → the actual transactions behind a row.

type Status = 'over' | 'near' | 'ok' | 'none';
type StatusFilter = 'all' | Status;
type SortKey = 'over' | 'pct' | 'spent' | 'name';

const STATUS_META: Record<Status, { label: string; color: string }> = {
  over: { label: 'Over', color: Colors.red },
  near: { label: 'Near limit', color: Colors.yellow },
  ok: { label: 'On track', color: Colors.green },
  none: { label: 'No budget', color: Colors.text2 },
};

const SORT_OPTIONS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'over', label: 'Most over budget', hint: 'Biggest overspend in ₹ first' },
  { key: 'pct', label: 'Highest % used', hint: 'Closest to (or past) the limit first' },
  { key: 'spent', label: 'Most spent', hint: 'Largest spending first' },
  { key: 'name', label: 'A–Z', hint: 'Alphabetical' },
];

const statusOf = (planned: number, spent: number): Status => {
  if (planned > 0) return spent > planned ? 'over' : spent / planned >= 0.8 ? 'near' : 'ok';
  return spent > 0 ? 'none' : 'ok';
};

type SubRow = { key: string; label: string; planned: number; spent: number; txns: any[] };
type Row = { category: string; group: string; planned: number; spent: number; txns: any[]; subs: SubRow[] };

export default function BudgetVsSpent() {
  const { state, dispatch, fmt } = useApp();
  const { transactions = [], budgets = [], expenseCategories = [], accounts = [] } = state;
  const params = useLocalSearchParams<{ category?: string; sub?: string; month?: string; year?: string; status?: string }>();

  const initial = currentBudgetMonth(state);
  const [viewMonth, setViewMonth] = useState(params.month != null ? Number(params.month) : initial.month);
  const [viewYear, setViewYear] = useState(params.year != null ? Number(params.year) : initial.year);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [groupFilter, setGroupFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(['over', 'near', 'ok', 'none'].includes(String(params.status)) ? (params.status as StatusFilter) : 'all');
  const [sortKey, setSortKey] = useState<SortKey>('over');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCutoff, setShowCutoff] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<{ category: string; sub?: string } | null>(
    params.category ? { category: String(params.category), sub: params.sub != null ? String(params.sub) : undefined } : null,
  );
  const [txnSort, setTxnSort] = useState<'date' | 'amount'>('date');
  const [editTxn, setEditTxn] = useState<any>(null);
  const router = useRouter();
  // Opened straight onto a category (e.g. from Home)? Then closing that sheet
  // should take you back where you came from — one tap, not two. Rows tapped
  // inside this page, or "See full report", keep you on the page.
  const autoOpened = useRef(!!params.category);
  const openSel = (v: { category: string; sub?: string }) => { autoOpened.current = false; setSel(v); };
  const closeSel = () => {
    if (autoOpened.current) { autoOpened.current = false; setSel(null); router.back(); } else setSel(null);
  };
  const stayOnReport = () => { autoOpened.current = false; setSel(null); };

  const cutoff = getSalaryCutoff(state);
  const win = period === 'month' ? getBudgetCycle(state, viewYear, viewMonth) : getYearWindow(state, viewYear);
  const calendarLike = win.start.slice(8) === '01';
  const cycleNote = period === 'month' && !calendarLike ? cycleRangeLabel(win) : period === 'year' ? cycleRangeLabel(win) : '';
  const pace = rangePace(win.start, win.end);
  const paceFrac = pace.kind === 'current' ? pace.elapsed : undefined;
  const periodLabel = period === 'month' ? `${MONTH_NAMES[viewMonth]} ${viewYear}` : `${viewYear}`;
  const setCutoff = (n: number) => dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { salaryCutoffDay: Math.min(31, Math.max(1, n)) } });

  const prev = () => { if (period === 'year') return setViewYear((y) => y - 1); if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); };
  const next = () => { if (period === 'year') return setViewYear((y) => y + 1); if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); };


  const groupOfCategory = (name: string) => expenseCategories.find((c: any) => c.name === name)?.group || '';

  const { rows, income } = useMemo(() => {
    const map = new Map<string, Row>();
    const getRow = (category: string, group: string): Row => {
      let r = map.get(category);
      if (!r) { r = { category, group: group || groupOfCategory(category) || 'Other', planned: 0, spent: 0, txns: [], subs: [] }; map.set(category, r); }
      else if (group && r.group === 'Other') r.group = group;
      return r;
    };
    const getSub = (r: Row, key: string): SubRow => {
      let s = r.subs.find((x) => x.key === key);
      if (!s) { s = { key, label: key || '(No sub-category)', planned: 0, spent: 0, txns: [] }; r.subs.push(s); }
      return s;
    };

    budgets.forEach((b: any) => {
      if (String(b.year) !== String(viewYear) || (period === 'month' && b.month !== MONTH_NAMES[viewMonth])) return;
      const amt = Number(b.plannedAmount || 0);
      const r = getRow(b.category, b.group);
      r.planned += amt;
      getSub(r, b.subcategory || '').planned += amt;
    });

    let inc = 0;
    transactions.forEach((t: any) => {
      if (!inRange(t.date, win.start, win.end)) return;
      if (t.type === 'income') { inc += Number(t.amount || 0); return; }
      if (t.type !== 'expense') return;
      const amt = Number(t.amount || 0);
      const r = getRow(t.category, t.group);
      r.spent += amt;
      r.txns.push(t);
      const s = getSub(r, t.subcategory || '');
      s.spent += amt;
      s.txns.push(t);
    });

    return { rows: [...map.values()], income: inc };
  }, [budgets, transactions, expenseCategories, viewMonth, viewYear, period, cutoff, win.start, win.end]);

  const totalPlanned = rows.reduce((s, r) => s + r.planned, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const diff = totalPlanned - totalSpent;
  const usedPct = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : totalSpent > 0 ? 100 : 0;
  const heroColor = totalPlanned > 0 ? (totalSpent > totalPlanned ? Colors.red : usedPct >= 80 ? Colors.yellow : Colors.green) : Colors.text2;
  const savings = income - totalSpent;

  const groups = useMemo(() => ['All', ...new Set(rows.map((r) => r.group))], [rows]);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, over: 0, near: 0, ok: 0, none: 0 };
    rows.forEach((r) => { c[statusOf(r.planned, r.spent)]++; });
    return c;
  }, [rows]);

  const worst = useMemo(
    () => rows.filter((r) => r.planned > 0 && r.spent > r.planned).sort((a, b) => (b.spent - b.planned) - (a.spent - a.planned)).slice(0, 3),
    [rows],
  );

  const visible = useMemo(() => {
    const pct = (r: Row) => (r.planned > 0 ? r.spent / r.planned : r.spent > 0 ? Infinity : 0);
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => groupFilter === 'All' || r.group === groupFilter)
      .filter((r) => statusFilter === 'all' || statusOf(r.planned, r.spent) === statusFilter)
      .filter((r) => !q || r.category.toLowerCase().includes(q) || r.subs.some((s) => s.label.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sortKey === 'name') return a.category.localeCompare(b.category);
        if (sortKey === 'spent') return b.spent - a.spent;
        if (sortKey === 'pct') return pct(b) - pct(a) || b.spent - a.spent;
        return (b.spent - b.planned) - (a.spent - a.planned);
      });
  }, [rows, groupFilter, statusFilter, sortKey, query]);

  const extraFilters = (groupFilter !== 'All' ? 1 : 0) + (sortKey !== 'over' ? 1 : 0);
  const visPlanned = visible.reduce((s, r) => s + r.planned, 0);
  const visSpent = visible.reduce((s, r) => s + r.spent, 0);
  const anyFilter = statusFilter !== 'all' || extraFilters > 0 || query.trim() !== '';
  const resetFilters = () => { setStatusFilter('all'); setGroupFilter('All'); setSortKey('over'); setQuery(''); };

  // ── Drill-down data, derived live so edits in the modal reflect instantly ──
  const selRow = sel ? rows.find((r) => r.category === sel.category) : undefined;
  const selSub = selRow && sel?.sub !== undefined ? selRow.subs.find((s) => s.key === sel.sub) : undefined;
  const selTxns = useMemo(() => {
    const list = [...((selSub ? selSub.txns : selRow?.txns) || [])];
    return list.sort((a, b) => (txnSort === 'amount' ? b.amount - a.amount : +new Date(b.date) - +new Date(a.date)));
  }, [selRow, selSub, txnSort]);
  const selPlanned = selSub ? selSub.planned : selRow?.planned || 0;
  const selSpent = selSub ? selSub.spent : selRow?.spent || 0;
  const selMeta = STATUS_META[statusOf(selPlanned, selSpent)];
  const accName = (id: string) => accounts.find((a: any) => a.id === id)?.name || 'No account';

  const diffLabel = (planned: number, spent: number) => {
    if (planned <= 0) return { text: 'No budget', color: Colors.text2 };
    const d = planned - spent;
    return d >= 0 ? { text: `${fmt(d)} left`, color: Colors.green } : { text: `${fmt(-d)} over`, color: Colors.red };
  };
  const barPct = (planned: number, spent: number) => (planned > 0 ? (spent / planned) * 100 : spent > 0 ? 100 : 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader title="Budget vs Spent" showBack subtitle="See where your money went" />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Compact period bar */}
        <View style={styles.periodBar}>
          <Pressable onPress={prev} style={styles.navArrow} hitSlop={8}><ChevronLeft size={18} color={Colors.text1} /></Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.periodLabel}>{periodLabel}</Text>
            {cycleNote ? <Text style={styles.cycleNote}>{cycleNote}</Text> : null}
          </View>
          <Pressable onPress={next} style={styles.navArrow} hitSlop={8}><ChevronRight size={18} color={Colors.text1} /></Pressable>
          <View style={styles.seg}>
            {(['month', 'year'] as const).map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.segBtn, period === p && styles.segBtnActive]}>
                <Text style={[styles.segText, period === p && { color: '#fff' }]}>{p === 'month' ? 'Month' : 'Year'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Hero: the answer first */}
        <Card style={styles.hero}>
          <Text style={[styles.heroKicker, { color: Colors.text2 }]}>
            {totalPlanned <= 0 ? 'NO BUDGET SET' : diff >= 0 ? 'LEFT TO SPEND' : 'OVER BUDGET'}
          </Text>
          <Text style={styles.heroValue}>{totalPlanned <= 0 ? fmt(totalSpent) : fmt(Math.abs(diff))}</Text>
          <Text style={styles.heroSub}>
            {totalPlanned <= 0 ? 'spent this period — add a budget to compare' : `${usedPct.toFixed(0)}% of ${fmt(totalPlanned)} budget used`}
          </Text>
          <View style={{ marginTop: Spacing.sm }}><BudgetBar spent={totalSpent} planned={totalPlanned} pace={paceFrac} height={10} /></View>
          {paceFrac !== undefined && totalPlanned > 0 ? <Text style={styles.heroSub}>{`Tick = where you'd be today if spending were even (${Math.round(paceFrac * 100)}% of the period)`}</Text> : null}

          <View style={styles.statRow}>
            <View style={styles.stat}><Text style={styles.statLabel}>Income</Text><Text style={[styles.statValue, { color: Colors.green }]}>{fmt(income)}</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statLabel}>Spent</Text><Text style={styles.statValue}>{fmt(totalSpent)}</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statLabel}>Savings</Text><Text style={[styles.statValue, { color: savings >= 0 ? Colors.green : Colors.red }]}>{fmt(savings)}</Text></View>
          </View>

          <Pressable onPress={() => setShowCutoff((v) => !v)} style={styles.cutoffToggle} hitSlop={6}>
            <Text style={styles.cutoffToggleText}>Budget month starts at salary (from day {cutoff}) · {showCutoff ? 'Hide' : 'Change'}</Text>
          </Pressable>
          {showCutoff && (
            <View style={styles.cutoffBox}>
              <Text style={styles.cutoffText}>
                A salary credited on or after this day starts the <Text style={{ color: Colors.text1, fontWeight: '700' }}>next month</Text>'s budget — spending from that day counts toward it.
              </Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => setCutoff(cutoff - 1)} style={styles.stepBtn} hitSlop={6}><Minus size={16} color={Colors.text1} /></Pressable>
                <Text style={styles.stepValue}>{cutoff}</Text>
                <Pressable onPress={() => setCutoff(cutoff + 1)} style={styles.stepBtn} hitSlop={6}><Plus size={16} color={Colors.text1} /></Pressable>
              </View>
            </View>
          )}
        </Card>

        {/* Pace check — the story behind the numbers */}
        {totalPlanned > 0 && pace.kind === 'current' ? (() => {
          const dailyNow = totalSpent / pace.daysElapsed;
          const projected = dailyNow * pace.daysTotal;
          const under = projected <= totalPlanned;
          const leftNow = totalPlanned - totalSpent;
          const tone = under ? Colors.accentLight : Colors.yellow;
          return (
            <Card style={styles.paceCard}>
              <View style={[styles.paceIcon, { backgroundColor: tone + '1f' }]}><Gauge size={20} color={tone} /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.paceKicker}>PACE CHECK</Text>
                <Text style={styles.paceTitle}>
                  {under ? `On pace to finish ${fmt(totalPlanned - projected)} under budget` : `On pace to overshoot by ${fmt(projected - totalPlanned)}`}
                </Text>
                <Text style={styles.paceSub}>
                  {under
                    ? `You're spending about ${fmt(dailyNow)} a day — at this rate you'll end near ${fmt(projected)} of ${fmt(totalPlanned)}.`
                    : leftNow > 0
                      ? `You're spending ${fmt(dailyNow)} a day. To stay within budget from here you'd have about ${fmt(leftNow / pace.daysLeft)} a day for the next ${pace.daysLeft} day${pace.daysLeft === 1 ? '' : 's'}.`
                      : 'The budget for this period is fully used — anything further goes beyond it.'}
                </Text>
              </View>
            </Card>
          );
        })() : null}

        {/* Where to trim (or a pat on the back) */}
        {totalPlanned > 0 && (worst.length > 0 ? (
          <Card style={styles.alertCard}>
            <View style={styles.alertHead}>
              <Lightbulb size={17} color={Colors.yellow} />
              <Text style={styles.alertTitle}>Spent beyond budget</Text>
            </View>
            {worst.map((r) => (
              <Pressable key={r.category} onPress={() => openSel({ category: r.category })} style={styles.alertRow} accessibilityRole="button"
                accessibilityLabel={`${r.category}, ${fmt(r.spent - r.planned)} over budget. Tap for transactions`}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.alertLine}>
                    <Text style={styles.alertName} numberOfLines={1}>{r.category}</Text>
                    <Text style={styles.alertAmt}>{fmt(r.spent - r.planned)} over</Text>
                  </View>
                  <BudgetBar spent={r.spent} planned={r.planned} pace={paceFrac} height={6} />
                </View>
                <ChevronRight size={14} color={Colors.text3} />
              </Pressable>
            ))}
            <Text style={styles.alertHint}>
              {fmt(rows.filter((r) => r.planned > 0 && r.spent > r.planned).reduce((t, r) => t + (r.spent - r.planned), 0))} spent beyond budget across {rows.filter((r) => r.planned > 0 && r.spent > r.planned).length} categor{rows.filter((r) => r.planned > 0 && r.spent > r.planned).length === 1 ? 'y' : 'ies'}.
            </Text>
          </Card>
        ) : (
          <Card style={styles.okCard}>
            <CheckCircle2 size={20} color={Colors.green} />
            <Text style={styles.okText}>Every category is within budget. Nicely done.</Text>
          </Card>
        ))}

        {/* Status tabs (primary filter) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {(['all', 'over', 'near', 'ok', 'none'] as StatusFilter[]).map((s) => {
            const active = statusFilter === s;
            const color = s === 'all' ? Colors.accentLight : STATUS_META[s].color;
            return (
              <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.tab, active && { backgroundColor: color + '26', borderColor: color + '66' }]}>
                {s !== 'all' && <View style={[styles.dot, { backgroundColor: color }]} />}
                <Text style={[styles.tabText, active && { color }]}>{s === 'all' ? 'All' : STATUS_META[s].label}</Text>
                <Text style={[styles.tabCount, active && { color }]}>{statusCounts[s]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search + more filters */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={Colors.text3} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search category or sub-category"
              placeholderTextColor={Colors.text3}
              value={query}
              onChangeText={setQuery}
            />
            {query ? <Pressable onPress={() => setQuery('')} hitSlop={8}><X size={16} color={Colors.text2} /></Pressable> : null}
          </View>
          <Pressable onPress={() => setShowFilters(true)} style={[styles.filterBtn, extraFilters > 0 && styles.filterBtnActive]}>
            <SlidersHorizontal size={18} color={extraFilters > 0 ? Colors.accentLight : Colors.text1} />
            {extraFilters > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{extraFilters}</Text></View> : null}
          </Pressable>
        </View>

        {anyFilter ? (
          <View style={styles.resultBar}>
            <Text style={styles.resultText} numberOfLines={2}>
              {visible.length} of {rows.length} categories{groupFilter !== 'All' ? ` · ${groupFilter}` : ''} · Spent {fmt(visSpent)} vs {fmt(visPlanned)}
            </Text>
            <Pressable onPress={resetFilters} hitSlop={8}><Text style={styles.resetText}>Clear</Text></Pressable>
          </View>
        ) : null}

        {/* Category cards */}
        {visible.length === 0 ? (
          <EmptyState icon={Search} title={rows.length === 0 ? `No budgets or spending for ${periodLabel}` : 'Nothing matches these filters'} />
        ) : (
          visible.map((r) => {
            const status = statusOf(r.planned, r.spent);
            const meta = STATUS_META[status];
            const tone = budgetTone(r.spent, r.planned, paceFrac);
            const toneLabel = r.planned <= 0 ? (r.spent > 0 ? 'No budget' : '') : tone.level === 'over' ? 'Over budget' : tone.level === 'ahead' ? 'Ahead of pace' : 'On track';
            const toneColor = r.planned <= 0 ? Colors.text2 : tone.color;
            const d = diffLabel(r.planned, r.spent);
            const gColor = GroupColors[r.group] || Colors.text2;
            const subRows = r.subs.filter((s) => s.planned > 0 || s.spent > 0);
            const canExpand = subRows.some((s) => s.key !== '');
            const open = !!expanded[r.category];
            return (
              <Card key={r.category} style={styles.catCard}>
                <Pressable onPress={() => openSel({ category: r.category })} style={{ gap: Spacing.sm }}>
                  <View style={styles.catTop}>
                    <View style={[styles.avatar, { backgroundColor: gColor + '26' }]}>
                      <Text style={[styles.avatarText, { color: gColor }]}>{r.category.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.catName} numberOfLines={1}>{r.category}</Text>
                      <Text style={styles.catMeta} numberOfLines={1}>{r.group} · {r.txns.length} transaction{r.txns.length === 1 ? '' : 's'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.catDiff, { color: d.color }]}>{d.text}</Text>
                      <Text style={[styles.catStatus, { color: toneColor }]}>{toneLabel}</Text>
                    </View>
                  </View>
                  <BudgetBar spent={r.spent} planned={r.planned} pace={paceFrac} />
                  <View style={styles.catNums}>
                    <Text style={styles.numText}><Text style={styles.numStrong}>{fmt(r.spent)}</Text> of {r.planned > 0 ? fmt(r.planned) : 'no budget'}</Text>
                    {r.planned > 0 ? <Text style={[styles.numText, { color: toneColor, fontWeight: '700' }]}>{((r.spent / r.planned) * 100).toFixed(0)}%</Text> : null}
                  </View>
                </Pressable>

                {canExpand ? (
                  <Pressable onPress={() => setExpanded((e) => ({ ...e, [r.category]: !e[r.category] }))} style={styles.expandBtn} hitSlop={6}>
                    <Text style={styles.expandText}>{open ? 'Hide' : 'See'} sub-categories ({subRows.length})</Text>
                    {open ? <ChevronUp size={14} color={Colors.accentLight} /> : <ChevronDown size={14} color={Colors.accentLight} />}
                  </Pressable>
                ) : null}

                {open && (
                  <View style={styles.subList}>
                    {[...subRows].sort((a, b) => (b.spent - b.planned) - (a.spent - a.planned)).map((s) => {
                      const sm = STATUS_META[statusOf(s.planned, s.spent)];
                      const sd = diffLabel(s.planned, s.spent);
                      return (
                        <Pressable key={s.key} onPress={() => openSel({ category: r.category, sub: s.key })} style={styles.subItem}>
                          <View style={styles.catTop}>
                            <Text style={styles.subName} numberOfLines={1}>{s.label}</Text>
                            <Text style={[styles.subDiff, { color: s.planned > 0 ? sd.color : Colors.text2 }]}>
                              {s.planned > 0 ? sd.text : `${r.spent > 0 ? ((s.spent / r.spent) * 100).toFixed(0) : 0}% of total`}
                            </Text>
                          </View>
                          {s.planned > 0 ? <BudgetBar spent={s.spent} planned={s.planned} pace={paceFrac} height={6} /> : <ProgressBar pct={r.spent > 0 ? (s.spent / r.spent) * 100 : 0} color={Colors.text3} />}
                          <Text style={styles.numText}>{fmt(s.spent)}{s.planned > 0 ? ` of ${fmt(s.planned)}` : ''} · {s.txns.length} txn{s.txns.length === 1 ? '' : 's'} ›</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Filter bottom sheet */}
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Filter & sort</Text>
              <Pressable onPress={() => { setGroupFilter('All'); setSortKey('over'); }} hitSlop={8}><Text style={styles.resetText}>Reset</Text></Pressable>
            </View>

            <Text style={styles.sheetLabel}>Group</Text>
            <View style={styles.wrapRow}>
              {groups.map((g) => {
                const active = groupFilter === g;
                const c = GroupColors[g] || Colors.accentLight;
                return (
                  <Pressable key={g} onPress={() => setGroupFilter(g)} style={[styles.chip, active && { backgroundColor: c + '26', borderColor: c + '66' }]}>
                    <Text style={[styles.chipText, active && { color: c }]}>{g}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sheetLabel}>Sort by</Text>
            {SORT_OPTIONS.map((o) => (
              <Pressable key={o.key} onPress={() => setSortKey(o.key)} style={styles.sortRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sortLabel, sortKey === o.key && { color: Colors.accentLight }]}>{o.label}</Text>
                  <Text style={styles.sortHint}>{o.hint}</Text>
                </View>
                {sortKey === o.key ? <Check size={18} color={Colors.accentLight} /> : null}
              </Pressable>
            ))}

            <Pressable onPress={() => setShowFilters(false)} style={styles.applyBtn}>
              <Text style={styles.applyText}>Show {visible.length} categor{visible.length === 1 ? 'y' : 'ies'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Transactions behind a row */}
      <Modal visible={!!sel} animationType="slide" onRequestClose={closeSel}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {sel?.category}{sel?.sub !== undefined ? ` › ${sel.sub || '(No sub-category)'}` : ''}
              </Text>
              <Text style={styles.modalSub}>{periodLabel}</Text>
            </View>
            <Pressable onPress={closeSel} hitSlop={10} style={styles.navArrow}><X size={18} color={Colors.text1} /></Pressable>
          </View>

          <FlatList
            data={selTxns}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 60 }}
            ListHeaderComponent={
              <View style={{ gap: Spacing.md, marginBottom: Spacing.sm }}>
                <Card style={{ gap: 6 }}>
                  <Text style={[styles.heroKicker, { color: selMeta.color }]}>
                    {selPlanned <= 0 ? 'NO BUDGET SET' : selSpent > selPlanned ? 'OVER BUDGET' : 'LEFT TO SPEND'}
                  </Text>
                  <Text style={[styles.heroValue, { color: selMeta.color, fontSize: FontSize.xxl }]}>
                    {selPlanned <= 0 ? fmt(selSpent) : fmt(Math.abs(selPlanned - selSpent))}
                  </Text>
                  <ProgressBar pct={barPct(selPlanned, selSpent)} color={selMeta.color} />
                  <View style={styles.catNums}>
                    <Text style={styles.numText}>Spent <Text style={styles.numStrong}>{fmt(selSpent)}</Text></Text>
                    <Text style={styles.numText}>Budget <Text style={styles.numStrong}>{selPlanned > 0 ? fmt(selPlanned) : '—'}</Text></Text>
                  </View>
                </Card>
                <View style={styles.seg}>
                  {([['date', 'Newest first'], ['amount', 'Highest amount']] as const).map(([k, label]) => (
                    <Pressable key={k} onPress={() => setTxnSort(k)} style={[styles.segBtn, { flex: 1, alignItems: 'center' }, txnSort === k && styles.segBtnActive]}>
                      <Text style={[styles.segText, txnSort === k && { color: '#fff' }]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {params.category ? (
                  <Pressable onPress={stayOnReport} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.reportLink}>See the full budget report ›</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.listCount}>{selTxns.length} transaction{selTxns.length === 1 ? '' : 's'}</Text>
              </View>
            }
            ListEmptyComponent={<EmptyState icon={Search} title="No transactions in this period" />}
            renderItem={({ item: t }) => {
              const { day, month } = parseYMD(t.date);
              const share = selSpent > 0 ? (t.amount / selSpent) * 100 : 0;
              return (
                <Card style={styles.txnCard}>
                  <View style={styles.dateChip}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMon}>{MONTH_NAMES[month].slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.txnTitle} numberOfLines={1}>{t.subcategory || t.category}</Text>
                    {t.notes ? <Text style={styles.txnNotes} numberOfLines={2}>{t.notes}</Text> : null}
                    <Text style={styles.txnMeta}>{accName(t.account)} · {share.toFixed(0)}% of spend</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
                    <Text style={styles.txnAmt}>-{fmt(t.amount)}</Text>
                    <Pressable onPress={() => setEditTxn(t)} hitSlop={10} style={styles.editBtn}><Edit2 size={14} color={Colors.text2} /></Pressable>
                  </View>
                </Card>
              );
            }}
          />
        </SafeAreaView>

        {editTxn && <TransactionFormModal visible mode="edit" transaction={editTxn} onClose={() => setEditTxn(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  headerWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  periodBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cycleNote: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600', marginTop: 1 },
  periodLabel: { textAlign: 'center', fontSize: FontSize.md, fontWeight: '700', color: Colors.text1 },
  navArrow: { width: 34, height: 34, borderRadius: Radius.sm, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', gap: 2, backgroundColor: Colors.inset, borderRadius: Radius.sm, padding: 3 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.sm - 2 },
  segBtnActive: { backgroundColor: Colors.accent },
  segText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },

  hero: { gap: 2, paddingVertical: Spacing.lg },
  heroKicker: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 },
  heroValue: { color: Colors.text1, fontSize: FontSize.xxxl, fontWeight: '800' },
  heroSub: { color: Colors.text2, fontSize: FontSize.base },
  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { color: Colors.text2, fontSize: FontSize.xs },
  statValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text1 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  cutoffToggle: { alignSelf: 'center', marginTop: Spacing.md },
  cutoffToggleText: { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '600' },
  cutoffBox: { marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.inset },
  cutoffText: { flex: 1, color: Colors.text2, fontSize: FontSize.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.panelHover, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 26, textAlign: 'center', color: Colors.text1, fontWeight: '800', fontSize: FontSize.lg },

  paceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  paceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  paceKicker: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.8 },
  paceTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  paceSub: { color: Colors.text2, fontSize: FontSize.base, lineHeight: 19 },
  reportLink: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base, paddingVertical: 4 },
  alertLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  alertHint: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  alertCard: { gap: Spacing.md },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertTitle: { color: Colors.red, fontWeight: '700', fontSize: FontSize.base },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  alertName: { flex: 1, color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  alertAmt: { color: Colors.red, fontWeight: '700', fontSize: FontSize.base },
  okCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.greenBg, borderColor: 'rgba(16,185,129,0.3)' },
  okText: { flex: 1, color: Colors.text1, fontSize: FontSize.base, fontWeight: '600' },

  tabRow: { gap: Spacing.sm, paddingVertical: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  tabText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },
  tabCount: { color: Colors.text3, fontWeight: '700', fontSize: FontSize.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },

  searchRow: { flexDirection: 'row', gap: Spacing.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text1, fontSize: FontSize.base, paddingVertical: 10 },
  filterBtn: { width: 44, borderRadius: Radius.md, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: 'rgba(79,70,229,0.15)', borderColor: 'rgba(79,70,229,0.4)' },
  filterBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  resultBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  resultText: { flex: 1, color: Colors.text2, fontSize: FontSize.sm },
  resetText: { color: Colors.accentLight, fontWeight: '700', fontSize: FontSize.sm },

  catCard: { gap: Spacing.sm },
  catTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: FontSize.md },
  catName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  catMeta: { color: Colors.text2, fontSize: FontSize.xs, marginTop: 1 },
  catDiff: { fontWeight: '800', fontSize: FontSize.md },
  catStatus: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 1 },
  catNums: { flexDirection: 'row', justifyContent: 'space-between' },
  numText: { color: Colors.text2, fontSize: FontSize.sm },
  numStrong: { color: Colors.text1, fontWeight: '700' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  expandText: { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '600' },
  subList: { gap: Spacing.sm },
  subItem: { gap: 6, padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.inset },
  subName: { flex: 1, color: Colors.text1, fontSize: FontSize.base, fontWeight: '600' },
  subDiff: { fontSize: FontSize.base, fontWeight: '700' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderStrong, marginBottom: Spacing.sm },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: '700' },
  sheetLabel: { color: Colors.text3, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Spacing.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  chipText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  sortLabel: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.md },
  sortHint: { color: Colors.text2, fontSize: FontSize.xs, marginTop: 1 },
  applyBtn: { marginTop: Spacing.md, backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  applyText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  modalTitle: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: '700' },
  modalSub: { color: Colors.text2, fontSize: FontSize.sm },
  listCount: { color: Colors.text3, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  txnCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dateChip: { width: 44, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.panelHover, alignItems: 'center' },
  dateDay: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  dateMon: { color: Colors.text2, fontSize: FontSize.xs, textTransform: 'uppercase' },
  txnTitle: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  txnNotes: { color: Colors.text2, fontSize: FontSize.sm, fontStyle: 'italic' },
  txnMeta: { color: Colors.text3, fontSize: FontSize.xs },
  txnAmt: { color: Colors.red, fontWeight: '800', fontSize: FontSize.md },
  editBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.panel, alignItems: 'center', justifyContent: 'center' },
}));
