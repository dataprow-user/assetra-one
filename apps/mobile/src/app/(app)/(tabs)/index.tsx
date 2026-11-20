import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '../../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Eye, EyeOff, Settings as SettingsIcon, Search, ChevronDown, ChevronRight,
  Target, Landmark, ShieldCheck, CalendarDays, Tags, PieChart as PieChartIcon, Sparkles,
} from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import HomeInsights from '../../../components/insights/HomeInsights';
import { Card, ProgressBar, EmptyState, DateField, Tap, Button, Sheet, BudgetBar, budgetTone } from '../../../components/ui';
import AuroraWash from '../../../components/ui/AuroraWash';
import SearchModal from '../../../components/SearchModal';
import NetWorthSheet from '../../../components/NetWorthSheet';
import Donut, { CHART_COLORS, OTHER_COLOR, Slice } from '../../../components/charts/Donut';
import Ring from '../../../components/charts/Ring';
import { HeroBackdrop } from '../../../components/ui/PageHero';
import { useTxnExplorer } from '../../../components/TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../../constants/theme';
import { loanStatus } from '../../../utils/loans';
import { assetStatus, policyStatus } from '../../../utils/entities';
import { getBudgetCycle, currentBudgetMonth, rangePace, inRange, cycleRangeLabel } from '../../../utils/budgetPeriod';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Dashboard() {
  const { state, toggleAmounts, amountsHidden, currentUser, fmt, fmtSigned } = useApp();
  const router = useRouter();
  const explorer = useTxnExplorer();
  const [showSearch, setShowSearch] = useState(false);
  const [showNetWorth, setShowNetWorth] = useState(false);
  const firstName = currentUser?.name?.split(' ')[0];
  const initials = (currentUser?.name || 'U').slice(0, 2).toUpperCase();

  // First-time hint pointing at the eye toggle while amounts are masked;
  // clears on reveal or after a few seconds. Mirrors the web eye-hint.
  const [showHint, setShowHint] = useState(true);
  useEffect(() => {
    if (!amountsHidden) { setShowHint(false); return; }
    const t = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(t);
  }, [amountsHidden]);
  const { transactions = [], accounts = [], assets = [], liabilities = [], budgets = [], insurance = [] } = state;

  const totalAssets = assets.reduce((s: number, a: any) => s + assetStatus(a, transactions).current, 0);
  const totalLiabilities = liabilities.reduce((s: number, l: any) => s + loanStatus(l, transactions).outstanding, 0);
  const netWorth = totalAssets - totalLiabilities;
  const inHand = accounts
    .filter((a: any) => ['bank', 'cash', 'wallet'].includes(a.type))
    .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];
  const calendarMonthStartISO = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // Dashboard period — defaults to the current calendar month, but a custom
  // range lets you match a salary cycle (e.g. "25th to 24th") instead of the
  // 1st-to-end-of-month default, so income/expense/budget figures reflect
  // when you actually get paid rather than the calendar.
  const [rangeMode, setRangeMode] = useState<'month' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState(calendarMonthStartISO);
  const [customTo, setCustomTo] = useState(todayISO);

  // "This month" is the BUDGET month we're in: it starts on the salary-credit
  // day (28 Oct for November) and runs to the day before the next one, so
  // spending right after payday counts toward the month it was budgeted for.
  const budgetMonth = currentBudgetMonth(state, now);
  const cycle = getBudgetCycle(state, budgetMonth.year, budgetMonth.month);
  const winStart = rangeMode === 'custom' ? customFrom : cycle.start;
  const winEnd = rangeMode === 'custom' ? customTo : (cycle.end < localISO(now) ? cycle.end : localISO(now));
  const periodStart = rangeMode === 'custom' ? new Date(customFrom) : new Date(budgetMonth.year, budgetMonth.month, 1);
  const periodEnd = new Date(new Date(winEnd).getFullYear(), new Date(winEnd).getMonth(), new Date(winEnd).getDate(), 23, 59, 59, 999);
  const cycleNote = rangeMode === 'month' && cycle.start.slice(8) !== '01' ? cycleRangeLabel(cycle) : '';
  const periodLabel = rangeMode === 'month'
    ? `${MONTH_NAMES[budgetMonth.month]} ${budgetMonth.year}${cycleNote ? ` (${cycleNote})` : ''}`
    : `${customFrom} to ${customTo}`;

  const thisMonthTxns = transactions.filter((t: any) => inRange(t.date, winStart, winEnd));
  const incomeTxns = thisMonthTxns.filter((t: any) => t.type === 'income');
  const expenseTxns = thisMonthTxns.filter((t: any) => t.type === 'expense');
  const monthIncome = incomeTxns.reduce((s: number, t: any) => s + t.amount, 0);
  const monthExpense = expenseTxns.reduce((s: number, t: any) => s + t.amount, 0);

  // Budgets are keyed by calendar month/year, so a custom range is matched by
  // including every month it touches (e.g. a 25th-Jul→24th-Aug range pulls in
  // both July's and August's budgeted categories).
  const periodMonths: { month: string; year: number }[] = [];
  if (rangeMode === 'month') periodMonths.push({ month: MONTH_NAMES[budgetMonth.month], year: budgetMonth.year });
  else {
    let d = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const last = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    while (d <= last) { periodMonths.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear() }); d.setMonth(d.getMonth() + 1); }
  }
  const periodBudgetsRaw = budgets.filter((b: any) => periodMonths.some((m) => m.month === b.month && String(m.year) === String(b.year)));

  // Rolled up to category level for the dashboard by default — a category
  // split across several sub-category budget rows shows as one combined line
  // — but each keeps its raw sub-rows so tapping it can expand the breakdown.
  const thisMonthBudgets: any[] = Object.values(
    periodBudgetsRaw.reduce((acc: Record<string, any>, b: any) => {
      if (!acc[b.category]) acc[b.category] = { id: `cat-${b.category}`, category: b.category, plannedAmount: 0, subBudgets: [] as any[] };
      acc[b.category].plannedAmount += Number(b.plannedAmount || 0);
      acc[b.category].subBudgets.push(b);
      return acc;
    }, {} as Record<string, any>),
  );
  const monthBudgeted = thisMonthBudgets.reduce((s: number, b: any) => s + Number(b.plannedAmount || 0), 0);
  const getBudgetSpent = (b: any) => expenseTxns.filter((t: any) => t.category === b.category).reduce((s: number, t: any) => s + t.amount, 0);
  const budgetUsagePct = monthBudgeted > 0 ? Math.min((monthExpense / monthBudgeted) * 100, 100) : 0;
  const monthRemaining = monthBudgeted - monthExpense;

  const openBudgetDetail = (category?: string, status?: string) => router.push({
    pathname: '/(app)/budget-vs-spent' as any, // typed-routes file regenerates on next `expo start`
    params: { month: String(rangeMode === 'month' ? budgetMonth.month : periodStart.getMonth()), year: String(rangeMode === 'month' ? budgetMonth.year : periodStart.getFullYear()), ...(category ? { category } : {}), ...(status ? { status } : {}) },
  });

  // ── "Safe to spend today": what's left (budget if set, else income), spread over the days remaining ──
  const pacing = rangeMode === 'month' ? rangePace(cycle.start, cycle.end, now) : undefined;
  const daysLeft = pacing && pacing.kind === 'current' ? pacing.daysLeft : Math.max(1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1);
  const usingBudget = monthBudgeted > 0;
  const pool = usingBudget ? monthBudgeted - monthExpense : monthIncome - monthExpense;
  const perDay = pool > 0 ? pool / daysLeft : 0;

  // ── Where the money went: top categories as a ring ──
  const spendByCat = new Map<string, number>();
  expenseTxns.forEach((t: any) => spendByCat.set(t.category, (spendByCat.get(t.category) || 0) + t.amount));
  const sortedCats = [...spendByCat.entries()].sort((a, b) => b[1] - a[1]);
  const TOP = 5;
  const donutSlices: Slice[] = sortedCats.slice(0, TOP).map(([cat, value], i) => ({ key: cat, label: cat, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  const othersValue = sortedCats.slice(TOP).reduce((s, [, v]) => s + v, 0);
  if (othersValue > 0) donutSlices.push({ key: '__other__', label: `Other (${sortedCats.length - TOP})`, value: othersValue, color: OTHER_COLOR });
  const topCats = new Set(sortedCats.slice(0, TOP).map(([c]) => c));
  const showCategory = (key: string, label: string) => {
    const list = key === '__other__' ? expenseTxns.filter((t: any) => !topCats.has(t.category)) : expenseTxns.filter((t: any) => t.category === key);
    explorer.show(label, list, periodLabel);
  };

  // ── Last 7 days of spending ──
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const iso = localISO(d);
    const txns = transactions.filter((t: any) => t.type === 'expense' && String(t.date).slice(0, 10) === iso);
    return { iso, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), long: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }), txns, total: txns.reduce((s: number, t: any) => s + t.amount, 0), isToday: i === 6 };
  });
  const maxDay = Math.max(...last7.map((d) => d.total), 0);
  const peak = last7.reduce((p, d) => (d.total > p.total ? d : p), last7[0]);
  const week7Total = last7.reduce((s, d) => s + d.total, 0);

  const quickActions = [
    { label: 'Insights', route: '/(app)/insights', Icon: PieChartIcon, color: Colors.accent2 },
    { label: 'Budget vs Spent', route: '/(app)/budget-vs-spent', Icon: PieChartIcon, color: Colors.accentLight },
    { label: 'Budgets', route: '/(app)/budgets', Icon: Target, color: Colors.blue },
    { label: 'Assets', route: '/(app)/assets', Icon: TrendingUp, color: Colors.green },
    { label: 'Liabilities', route: '/(app)/liabilities', Icon: Landmark, color: Colors.red },
    { label: 'Insurance', route: '/(app)/insurance', Icon: ShieldCheck, color: Colors.yellow },
    { label: 'Events', route: '/(app)/events', Icon: CalendarDays, color: Colors.accent2 },
    { label: 'Categories', route: '/(app)/categories', Icon: Tags, color: '#06b6d4' },
  ];

  const recentTxns = [...transactions].sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);

  const upcomingInsurance = insurance
    .map((p: any) => { const ps = policyStatus(p, transactions, now); return { ...p, nextDue: ps.nextDue || p.nextDue, daysLeft: ps.daysToDue ?? Infinity }; })
    .filter((p: any) => p.daysLeft >= 0 && p.daysLeft <= 60)
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

  // ── Budget health ──
  const { width: screenW } = useWindowDimensions();
  const CARD_W = Math.min(176, Math.round(screenW * 0.44));
  const DUE_W = Math.min(188, Math.round(screenW * 0.46));
  const budgetColor = budgetUsagePct >= 100 ? Colors.red : budgetUsagePct >= 80 ? Colors.yellow : Colors.accentLight;
  const budgetCards = thisMonthBudgets
    .map((b: any) => {
      const spent = getBudgetSpent(b);
      const planned = Number(b.plannedAmount || 0);
      const raw = planned > 0 ? (spent / planned) * 100 : 0;
      return { category: b.category, planned, spent, pct: Math.min(raw, 100), raw, color: raw > 100 ? Colors.red : raw >= 80 ? Colors.yellow : Colors.green };
    })
    .sort((a: any, b: any) => b.raw - a.raw);
  const budgetCounts = { over: 0, near: 0, ok: 0 } as Record<string, number>;
  budgetCards.forEach((c: any) => { budgetCounts[c.raw > 100 ? 'over' : c.raw >= 80 ? 'near' : 'ok']++; });

  // Pace: how far through the month are we vs how much budget is gone?
  const paceFrac = pacing && pacing.kind === 'current' ? pacing.elapsed : undefined;
  const projectedSpend = pacing && pacing.kind === 'current' ? (monthExpense / Math.max(pacing.daysElapsed, 1)) * pacing.daysTotal : monthExpense;
  const paceUnder = projectedSpend <= monthBudgeted;
  const paceLine = rangeMode === 'month' && monthBudgeted > 0 && monthExpense > 0
    ? (paceUnder ? `On pace to finish ${fmt(monthBudgeted - projectedSpend)} under` : `On pace to overshoot by ${fmt(projectedSpend - monthBudgeted)}`)
    : undefined;

  // ── Net worth mix ──
  const [dueSheet, setDueSheet] = useState<any>(null);
  const assetsShare = totalAssets + totalLiabilities > 0 ? (totalAssets / (totalAssets + totalLiabilities)) * 100 : 100;
  const liabRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const ratioColor = liabRatio < 30 ? Colors.green : liabRatio < 60 ? Colors.yellow : Colors.red;
  const ratioLabel = totalAssets === 0 ? 'No assets yet' : liabRatio < 30 ? 'Healthy' : liabRatio < 60 ? 'Moderate' : 'High';
  const ratioAdvice = liabRatio < 30 ? 'Great position.' : liabRatio < 60 ? 'Keep an eye on new loans.' : 'Prioritise paying down debt.';

  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
  const accName = (id: string) => accounts.find((a: any) => a.id === id)?.name || '';
  const savings = monthIncome - monthExpense;
  const spentOfIncomePct = monthIncome > 0 ? Math.min((monthExpense / monthIncome) * 100, 100) : monthExpense > 0 ? 100 : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AuroraWash />
      <ScrollView contentContainerStyle={styles.content}>
        {/* App bar */}
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={1}>{firstName ? `Hi, ${firstName}` : `Good ${greeting}`} 👋</Text>
            <Text style={styles.subGreeting} numberOfLines={1}>
              Good {greeting} • {now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => setShowSearch(true)} hitSlop={6} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel="Search">
              <Search size={20} color={Colors.text2} />
            </Pressable>
            <Pressable onPress={toggleAmounts} hitSlop={6} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel={amountsHidden ? 'Show amounts' : 'Hide amounts'}>
              {amountsHidden ? <EyeOff size={20} color={Colors.text2} /> : <Eye size={20} color={Colors.accentLight} />}
            </Pressable>
            <Pressable onPress={() => router.push('/(app)/settings')} hitSlop={6} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel="Settings">
              <SettingsIcon size={20} color={Colors.text2} />
            </Pressable>
          </View>
        </View>

        {showHint && amountsHidden ? (
          <Pressable onPress={() => setShowHint(false)} style={styles.hint}>
            <EyeOff size={14} color={Colors.accentLight} />
            <Text style={styles.hintText}>Amounts are hidden — tap the eye to show them.</Text>
          </Pressable>
        ) : null}

        {/* Net worth hero — tap for the full breakdown */}
        <Pressable onPress={() => setShowNetWorth(true)} accessibilityRole="button" accessibilityLabel={`Total net worth ${fmtSigned(netWorth)}. Tap for breakdown`}>
          <LinearGradient colors={[Colors.heroFrom, Colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <HeroBackdrop />
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Total Net Worth</Text>
              <View style={styles.heroMore}><Text style={styles.heroMoreText}>Details</Text><ChevronRight size={14} color="#fff" /></View>
            </View>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{fmtSigned(netWorth)}</Text>
            <View style={styles.heroChip}>
              <Wallet size={14} color="#fff" />
              <Text style={styles.heroChipText}>In hand {fmtSigned(inHand)}</Text>
            </View>
            <View style={styles.heroSplit}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSmallLabel}>Assets</Text>
                <Text style={styles.heroSmallValue} numberOfLines={1}>{fmt(totalAssets)}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={{ flex: 1, paddingLeft: Spacing.lg }}>
                <Text style={styles.heroSmallLabel}>Liabilities</Text>
                <Text style={styles.heroSmallValue} numberOfLines={1}>{fmt(totalLiabilities)}</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Safe to spend today */}
        {rangeMode === 'month' && (usingBudget || monthIncome > 0) ? (
          <Pressable onPress={() => (usingBudget ? openBudgetDetail() : router.push('/(app)/(tabs)/transactions'))} accessibilityRole="button"
            accessibilityLabel={pool > 0 ? `Safe to spend today ${fmt(perDay)}. ${daysLeft} days left this month. Tap for details` : 'You have used up this month. Tap for details'}>
            <Card style={[styles.safeCard, { borderColor: pool > 0 ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)' }]}>
              <View style={[styles.safeIcon, { backgroundColor: pool > 0 ? Colors.greenBg : Colors.redBg }]}>
                <Sparkles size={22} color={pool > 0 ? Colors.green : Colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.safeKicker}>{pool > 0 ? 'SAFE TO SPEND TODAY' : 'MONTH FULLY USED'}</Text>
                <Text style={[styles.safeValue, { color: pool > 0 ? Colors.text1 : Colors.red }]}>
                  {pool > 0 ? fmt(perDay) : `${fmt(-pool)} over`}
                </Text>
                <Text style={styles.safeSub}>
                  {pool > 0 ? `${fmt(pool)} left of your ${usingBudget ? 'budget' : 'income'} • ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go` : `You've spent more than your ${usingBudget ? 'budget' : 'income'} this month`}
                </Text>
              </View>
              <ChevronRight size={18} color={Colors.text3} />
            </Card>
          </Pressable>
        ) : null}

        {/* Quick actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quickActions.map((q) => (
            <Pressable key={q.label} onPress={() => router.push(q.route as any)} style={styles.quickItem} accessibilityRole="button" accessibilityLabel={q.label}>
              <View style={[styles.quickIcon, { backgroundColor: q.color + '1f' }]}><q.Icon size={24} color={q.color} /></View>
              <Text style={styles.quickLabel} numberOfLines={2}>{q.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Period */}
        <View style={styles.periodRow}>
          <Pressable onPress={() => setRangeMode('month')} style={[styles.periodPill, rangeMode === 'month' && styles.periodPillActive]} accessibilityRole="button" accessibilityState={{ selected: rangeMode === 'month' }}>
            <Text style={[styles.periodPillText, rangeMode === 'month' && styles.periodPillTextActive]}>This Month</Text>
          </Pressable>
          <Pressable onPress={() => setRangeMode('custom')} style={[styles.periodPill, rangeMode === 'custom' && styles.periodPillActive]} accessibilityRole="button" accessibilityState={{ selected: rangeMode === 'custom' }}>
            <Text style={[styles.periodPillText, rangeMode === 'custom' && styles.periodPillTextActive]}>Custom Range</Text>
          </Pressable>
        </View>
        {rangeMode === 'month' && cycleNote ? (
          <Text style={styles.cycleCaption}>{MONTH_NAMES[budgetMonth.month]} budget month • {cycleNote} • starts on your salary day</Text>
        ) : null}
        {rangeMode === 'custom' && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <DateField label="From" value={customFrom} onChange={setCustomFrom} maximumDate={new Date()} style={{ flex: 1 }} />
            <DateField label="To" value={customTo} onChange={setCustomTo} maximumDate={new Date()} style={{ flex: 1 }} />
          </View>
        )}

        {/* Money flow — each figure opens its transactions */}
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.snapHead}>
            <Text style={styles.cardTitle}>{rangeMode === 'month' ? 'This month' : 'Selected period'}</Text>
            <Text style={[styles.snapRate, { color: savings >= 0 ? Colors.green : Colors.red }]}>
              {monthIncome > 0 ? `${Math.round((savings / monthIncome) * 100)}% saved` : 'No income yet'}
            </Text>
          </View>
          <View style={styles.snapRow}>
            <Pressable style={styles.snapCell} onPress={() => explorer.show('Income', incomeTxns, periodLabel)} accessibilityRole="button" accessibilityLabel={`Income ${fmt(monthIncome)}. Tap for transactions`}>
              <View style={[styles.snapIcon, { backgroundColor: Colors.greenBg }]}><ArrowDownRight size={18} color={Colors.green} /></View>
              <Text style={styles.snapLabel}>Income ›</Text>
              <Text style={[styles.snapValue, { color: Colors.green }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(monthIncome)}</Text>
            </Pressable>
            <Pressable style={styles.snapCell} onPress={() => explorer.show('Expenses', expenseTxns, periodLabel)} accessibilityRole="button" accessibilityLabel={`Expense ${fmt(monthExpense)}. Tap for transactions`}>
              <View style={[styles.snapIcon, { backgroundColor: Colors.redBg }]}><ArrowUpRight size={18} color={Colors.red} /></View>
              <Text style={styles.snapLabel}>Expense ›</Text>
              <Text style={[styles.snapValue, { color: Colors.red }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(monthExpense)}</Text>
            </Pressable>
            <Pressable style={styles.snapCell} onPress={() => openBudgetDetail()} accessibilityRole="button" accessibilityLabel={`Savings ${fmtSigned(savings)}. Tap for budget details`}>
              <View style={[styles.snapIcon, { backgroundColor: Colors.blueBg }]}><TrendingUp size={18} color={Colors.blue} /></View>
              <Text style={styles.snapLabel}>Savings ›</Text>
              <Text style={[styles.snapValue, { color: savings >= 0 ? Colors.text1 : Colors.red }]} numberOfLines={1} adjustsFontSizeToFit>{fmtSigned(savings)}</Text>
            </Pressable>
          </View>
          <View>
            <ProgressBar pct={spentOfIncomePct} color={spentOfIncomePct >= 100 ? Colors.red : spentOfIncomePct >= 80 ? Colors.yellow : Colors.green} />
            <Text style={styles.snapHint}>
              {monthIncome > 0 ? `Spent ${spentOfIncomePct.toFixed(0)}% of income` : monthExpense > 0 ? 'Spending recorded, but no income in this period' : 'Nothing recorded yet'}
            </Text>
          </View>
        </Card>

        {/* Where your money went */}
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.snapHead}>
            <Text style={styles.cardTitle}>Where your money went</Text>
            <Pressable onPress={() => openBudgetDetail()} hitSlop={8} accessibilityRole="button"><Text style={styles.seeAll}>Budget ›</Text></Pressable>
          </View>
          {donutSlices.length === 0 ? (
            <Text style={styles.snapHint}>No spending recorded for this period yet.</Text>
          ) : (
            <View style={{ gap: Spacing.lg }}>
              <View style={{ alignItems: 'center' }}>
                <Donut slices={donutSlices} centerTop="Spent" centerBottom={fmt(monthExpense)} />
              </View>
              <View>
                {donutSlices.map((s) => (
                  <Pressable key={s.key} onPress={() => showCategory(s.key, s.key === '__other__' ? 'Other categories' : s.label)} style={styles.legendRow}
                    accessibilityRole="button" accessibilityLabel={`${s.label}, ${fmt(s.value)}, ${monthExpense ? ((s.value / monthExpense) * 100).toFixed(0) : 0} percent. Tap for transactions`}>
                    <View style={[styles.dot, { backgroundColor: s.color }]} />
                    <Text style={styles.legendName} numberOfLines={1}>{s.label}</Text>
                    <Text style={styles.legendPct}>{monthExpense ? ((s.value / monthExpense) * 100).toFixed(0) : 0}%</Text>
                    <Text style={styles.legendVal}>{fmt(s.value)}</Text>
                    <ChevronRight size={16} color={Colors.text3} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Last 7 days */}
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.snapHead}>
            <Text style={styles.cardTitle}>Last 7 days</Text>
            <Text style={styles.snapRate}>{fmt(week7Total)}</Text>
          </View>
          <View style={styles.barsRow}>
            {last7.map((d) => {
              const h = maxDay > 0 ? Math.max((d.total / maxDay) * 92, d.total > 0 ? 8 : 0) : 0;
              return (
                <Pressable key={d.iso} style={styles.barCol} disabled={d.txns.length === 0}
                  onPress={() => explorer.show(d.long, d.txns, 'Spending on this day')}
                  accessibilityRole="button" accessibilityLabel={`${d.long}: ${d.total > 0 ? fmt(d.total) : 'no spending'}${d.txns.length ? '. Tap for transactions' : ''}`}>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: h, backgroundColor: d.isToday ? Colors.accentLight : d.total === maxDay && d.total > 0 ? Colors.red : Colors.accent + '88' }]} />
                  </View>
                  <Text style={[styles.barLabel, d.isToday && { color: Colors.accentLight, fontWeight: '800' }]}>{d.isToday ? 'Today' : d.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.snapHint}>
            {maxDay > 0 ? `Highest: ${peak.long} • ${fmt(peak.total)} — tap a bar to see why` : 'No spending in the last 7 days.'}
          </Text>
        </Card>

        <HomeInsights />

        {/* Recent */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitleInline}>Recent Transactions</Text>
          <Pressable onPress={() => router.push('/(app)/(tabs)/transactions')} hitSlop={8} accessibilityRole="button"><Text style={styles.seeAll}>See all ›</Text></Pressable>
        </View>
        {recentTxns.length === 0 ? (
          <EmptyState icon={ArrowUpRight} title="No transactions yet" />
        ) : (
          <Card style={{ gap: 0, paddingVertical: Spacing.xs }}>
            {recentTxns.map((t: any, i: number) => {
              const isTransfer = t.type === 'transfer';
              const color = isTransfer ? Colors.blue : t.type === 'income' ? Colors.green : Colors.red;
              const title = isTransfer ? `${accName(t.account)} → ${accName(t.toAccount)}` : `${t.category}${t.subcategory ? ` · ${t.subcategory}` : ''}`;
              return (
                <Pressable key={t.id} onPress={() => explorer.showTxn(t)} style={[styles.txnRow, i < recentTxns.length - 1 && styles.txnRowBorder]}
                  accessibilityRole="button" accessibilityLabel={`${title}, ${isTransfer ? '' : t.type === 'income' ? 'plus ' : 'minus '}${fmt(t.amount)}, ${t.date}. Tap for details`}>
                  <View style={[styles.txnAvatar, { backgroundColor: color + '1f' }]}>
                    <Text style={[styles.txnAvatarText, { color }]}>{isTransfer ? '⇄' : String(t.category || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnDesc} numberOfLines={1}>{title}</Text>
                    <Text style={styles.txnMeta}>{t.date}{!isTransfer && accName(t.account) ? ` • ${accName(t.account)}` : ''}</Text>
                  </View>
                  <Text style={{ color, fontWeight: '800', fontSize: FontSize.md }}>
                    {isTransfer ? '' : t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        )}

        {/* ───────── Budget health ───────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitleInline}>Budget health</Text>
          <Pressable onPress={() => openBudgetDetail()} hitSlop={8} accessibilityRole="button"><Text style={styles.seeAll}>Full report ›</Text></Pressable>
        </View>
        {thisMonthBudgets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: Colors.blueBg }]}><Target size={26} color={Colors.blue} /></View>
            <Text style={styles.emptyTitle}>No budget set for this month</Text>
            <Text style={styles.emptyText}>Set limits for your categories and Assetra will track every rupee against them.</Text>
            <Button title="Set up budgets" onPress={() => router.push('/(app)/budgets')} />
          </Card>
        ) : (
          <>
            <Tap onPress={() => openBudgetDetail()} accessibilityLabel={`Budget ${budgetUsagePct.toFixed(0)} percent used. ${monthRemaining >= 0 ? fmt(monthRemaining) + ' left' : fmt(-monthRemaining) + ' over'}. Tap for full report`}>
              <Card style={styles.budgetHero}>
                <Ring pct={budgetUsagePct} color={budgetColor} size={104} thickness={13} center={`${budgetUsagePct.toFixed(0)}%`} caption="used" />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.safeKicker, { color: budgetColor }]}>{monthRemaining >= 0 ? 'LEFT IN BUDGET' : 'OVER BUDGET'}</Text>
                  <Text style={[styles.budgetBig, { color: monthRemaining >= 0 ? Colors.text1 : Colors.red }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(Math.abs(monthRemaining))}</Text>
                  <Text style={styles.safeSub}>{fmt(monthExpense)} spent of {fmt(monthBudgeted)}</Text>
                  {paceLine ? <Text style={[styles.paceLine, { color: paceUnder ? Colors.accentLight : Colors.yellow }]}>{paceLine}</Text> : null}
                </View>
                <ChevronRight size={18} color={Colors.text3} />
              </Card>
            </Tap>

            <View style={styles.statusRow}>
              {([['over', 'Over', Colors.red], ['near', 'Near limit', Colors.yellow], ['ok', 'On track', Colors.green]] as const).map(([k, label, c]) => (
                <Tap key={k} style={{ flex: 1 }} onPress={() => openBudgetDetail(undefined, k)} accessibilityLabel={`${budgetCounts[k]} categories ${label}. Tap to view`}>
                  <View style={[styles.statusPill, { backgroundColor: c + '14', borderColor: c + '33' }]}>
                    <Text style={[styles.statusNum, { color: c }]}>{budgetCounts[k]}</Text>
                    <Text style={[styles.statusLabel, { color: c }]}>{label}</Text>
                  </View>
                </Tap>
              ))}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} decelerationRate="fast" snapToInterval={CARD_W + Spacing.md}>
              {budgetCards.slice(0, 8).map((c) => (
                <Tap key={c.category} onPress={() => openBudgetDetail(c.category)} accessibilityLabel={`${c.category}, ${c.pct.toFixed(0)} percent used, ${c.spent > c.planned ? fmt(c.spent - c.planned) + ' over' : fmt(c.planned - c.spent) + ' left'}. Tap for transactions`}>
                  <View style={[styles.catCard, { width: CARD_W }]}>
                    <View style={styles.catTopRow}>
                      <Text style={styles.catName} numberOfLines={1}>{c.category}</Text>
                      <Text style={[styles.catPct, { color: budgetTone(c.spent, c.planned, paceFrac).color }]}>{c.raw.toFixed(0)}%</Text>
                    </View>
                    <BudgetBar spent={c.spent} planned={c.planned} pace={paceFrac} height={7} />
                    <Text style={[styles.catDiff, { color: c.spent > c.planned ? Colors.red : Colors.green }]} numberOfLines={1} adjustsFontSizeToFit>
                      {c.spent > c.planned ? `${fmt(c.spent - c.planned)} over` : `${fmt(c.planned - c.spent)} left`}
                    </Text>
                    <Text style={styles.catMeta} numberOfLines={1}>{fmt(c.spent)} of {fmt(c.planned)}</Text>
                  </View>
                </Tap>
              ))}
              <Tap onPress={() => openBudgetDetail()}>
                <View style={[styles.catCard, styles.catMore, { width: CARD_W - 20 }]}>
                  <Text style={styles.catMoreText}>All categories</Text>
                  <ChevronRight size={20} color={Colors.accentLight} />
                </View>
              </Tap>
            </ScrollView>
          </>
        )}

        {/* ───────── Upcoming dues ───────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitleInline}>Upcoming dues</Text>
          <Pressable onPress={() => router.push('/(app)/insurance')} hitSlop={8} accessibilityRole="button"><Text style={styles.seeAll}>Policies ›</Text></Pressable>
        </View>
        {upcomingInsurance.length === 0 ? (
          <Card style={styles.clearCard}>
            <View style={[styles.safeIcon, { backgroundColor: Colors.greenBg }]}><ShieldCheck size={22} color={Colors.green} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>All clear</Text>
              <Text style={styles.safeSub}>No premiums due in the next 60 days.</Text>
            </View>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} decelerationRate="fast" snapToInterval={DUE_W + Spacing.md}>
            {upcomingInsurance.map((p: any) => {
              const c = p.daysLeft <= 7 ? Colors.red : p.daysLeft <= 30 ? Colors.yellow : Colors.green;
              return (
                <Tap key={p.id} onPress={() => setDueSheet(p)} accessibilityLabel={`${p.name}, premium ${fmt(p.premium)}, ${p.daysLeft === 0 ? 'due today' : `${p.daysLeft} days left`}. Tap for details`}>
                  <View style={[styles.dueCard, { width: DUE_W, borderColor: c + '55' }]}>
                    <View style={[styles.dueDays, { backgroundColor: c + '1f' }]}>
                      <Text style={[styles.dueDaysNum, { color: c }]}>{p.daysLeft}</Text>
                      <Text style={[styles.dueDaysUnit, { color: c }]}>{p.daysLeft === 1 ? 'day' : 'days'}</Text>
                    </View>
                    <Text style={styles.dueName2} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.dueAmt}>{fmt(p.premium)}</Text>
                    <Text style={styles.catMeta}>{p.nextDue}</Text>
                  </View>
                </Tap>
              );
            })}
          </ScrollView>
        )}

        {/* ───────── Net worth mix ───────── */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitleInline}>Assets vs liabilities</Text>
          <Pressable onPress={() => setShowNetWorth(true)} hitSlop={8} accessibilityRole="button"><Text style={styles.seeAll}>Breakdown ›</Text></Pressable>
        </View>
        <Card style={{ gap: Spacing.lg }}>
          <Tap onPress={() => setShowNetWorth(true)} accessibilityLabel={`Assets ${assetsShare.toFixed(0)} percent, liabilities ${(100 - assetsShare).toFixed(0)} percent. Tap for breakdown`}>
            <View style={styles.mixBar}>
              <View style={{ flex: Math.max(assetsShare, 0.0001), backgroundColor: Colors.green }} />
              <View style={{ flex: Math.max(100 - assetsShare, 0.0001), backgroundColor: totalLiabilities > 0 ? Colors.red : 'transparent' }} />
            </View>
          </Tap>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <Tap style={{ flex: 1 }} onPress={() => router.push('/(app)/assets')} accessibilityLabel={`Assets ${fmt(totalAssets)}. Open assets`}>
              <View style={[styles.mixTile, { backgroundColor: Colors.greenBg }]}>
                <TrendingUp size={20} color={Colors.green} />
                <Text style={styles.mixLabel}>Assets ›</Text>
                <Text style={[styles.mixValue, { color: Colors.green }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(totalAssets)}</Text>
              </View>
            </Tap>
            <Tap style={{ flex: 1 }} onPress={() => router.push('/(app)/liabilities')} accessibilityLabel={`Liabilities ${fmt(totalLiabilities)}. Open liabilities`}>
              <View style={[styles.mixTile, { backgroundColor: Colors.redBg }]}>
                <Landmark size={20} color={Colors.red} />
                <Text style={styles.mixLabel}>Liabilities ›</Text>
                <Text style={[styles.mixValue, { color: Colors.red }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(totalLiabilities)}</Text>
              </View>
            </Tap>
          </View>
          <View style={[styles.healthRow, { backgroundColor: ratioColor + '1a' }]}>
            <View style={[styles.healthDot, { backgroundColor: ratioColor }]} />
            <Text style={styles.healthText}>
              <Text style={{ fontWeight: '800', color: ratioColor }}>{ratioLabel}</Text>
              {totalAssets > 0 ? ` — you owe ${liabRatio.toFixed(0)}% of what you own. ${ratioAdvice}` : ' — add your assets to see how healthy your balance sheet is.'}
            </Text>
          </View>
        </Card>
      </ScrollView>
      <SearchModal visible={showSearch} onClose={() => setShowSearch(false)} />
      <NetWorthSheet visible={showNetWorth} onClose={() => setShowNetWorth(false)} />
      <Sheet
        visible={!!dueSheet}
        title={dueSheet?.name || ''}
        subtitle={dueSheet ? `${String(dueSheet.type || '').replace(/_/g, ' ')} insurance` : undefined}
        onClose={() => setDueSheet(null)}
        footer={<Button title="Open policy" onPress={() => { setDueSheet(null); setTimeout(() => router.push('/(app)/insurance'), 200); }} style={{ flex: 1 }} />}
      >
        {dueSheet ? (
          <>
            <View style={styles.dueSheetHero}>
              <Text style={styles.safeKicker}>PREMIUM DUE</Text>
              <Text style={styles.budgetBig}>{fmt(dueSheet.premium)}</Text>
              <Text style={[styles.dueBadge, { color: dueSheet.daysLeft <= 7 ? Colors.red : Colors.yellow }]}>
                {dueSheet.daysLeft === 0 ? 'Due today' : `Due in ${dueSheet.daysLeft} day${dueSheet.daysLeft === 1 ? '' : 's'}`} • {dueSheet.nextDue}
              </Text>
            </View>
            <View style={styles.dueSheetCard}>
              {([['Policy number', dueSheet.policyNo], ['Frequency', dueSheet.frequency], ['Sum assured', dueSheet.sumAssured ? fmt(dueSheet.sumAssured) : undefined]] as [string, any][])
                .filter(([, v]) => v).map(([k, v], i, arr) => (
                  <View key={k} style={[styles.dueSheetRow, i < arr.length - 1 && styles.txnRowBorder]}>
                    <Text style={styles.txnMeta}>{k}</Text>
                    <Text style={styles.dueName}>{String(v)}</Text>
                  </View>
                ))}
            </View>
          </>
        ) : null}
      </Sheet>
      {explorer.node}
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.xs },
  headerText: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text1 },
  subGreeting: { fontSize: FontSize.sm, color: Colors.text2, marginTop: 2 },
  eyeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(79,70,229,0.12)', borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)',
    borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: 12,
  },
  hintText: { color: Colors.accentLight, fontSize: FontSize.sm, flex: 1 },

  hero: { borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.sm, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.base, fontWeight: '600' },
  heroMore: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingLeft: 10, paddingRight: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroMoreText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -0.6 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroChipText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  heroSplit: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  heroDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroSmallLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  heroSmallValue: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800', marginTop: 2 },

  safeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  safeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  safeKicker: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.8 },
  safeValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 1 },
  safeSub: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },

  quickRow: { gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: 2 },
  quickItem: { width: 70, alignItems: 'center', gap: 6 },
  quickIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center' },

  cycleCaption: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600', marginTop: -4 },
  periodRow: { flexDirection: 'row', gap: Spacing.sm },
  periodPill: { flex: 1, minHeight: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  periodPillActive: { backgroundColor: 'rgba(79,70,229,0.18)', borderColor: 'rgba(79,70,229,0.45)' },
  periodPillText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.base },
  periodPillTextActive: { color: Colors.accentLight },

  cardTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  snapHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  snapRate: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text1 },
  snapRow: { flexDirection: 'row', gap: Spacing.sm },
  snapCell: { flex: 1, gap: 3, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panelHover, minHeight: 92 },
  snapIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  snapLabel: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600' },
  snapValue: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  snapHint: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 6 },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendName: { flex: 1, color: Colors.text1, fontSize: FontSize.base, fontWeight: '600' },
  legendPct: { color: Colors.text2, fontSize: FontSize.base, width: 40, textAlign: 'right' },
  legendVal: { color: Colors.text1, fontSize: FontSize.base, fontWeight: '800', minWidth: 74, textAlign: 'right' },

  barsRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 6, minHeight: 48 },
  barTrack: { height: 96, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 8, minHeight: 3 },
  barLabel: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, marginBottom: Spacing.xs },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text1, marginTop: Spacing.md, marginBottom: Spacing.xs },
  sectionTitleInline: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text1 },
  seeAll: { color: Colors.accentLight, fontSize: FontSize.base, fontWeight: '700' },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, minHeight: 56 },
  txnRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  txnAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnAvatarText: { fontWeight: '800', fontSize: FontSize.md },
  txnInfo: { flex: 1 },
  txnDesc: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  txnMeta: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },

  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  budgetSummaryLabel: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  budgetPct: { fontWeight: '800', fontSize: FontSize.base },
  budgetNums: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetNumText: { fontSize: FontSize.sm, color: Colors.text2 },
  budgetDiff: { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  budgetDetailLink: { color: Colors.accentLight, fontSize: FontSize.base, fontWeight: '700', textAlign: 'right' },
  budgetRemainingText: { fontSize: FontSize.base, fontWeight: '800', textAlign: 'right' },
  subBudgetList: { marginTop: Spacing.sm, marginLeft: Spacing.lg, gap: Spacing.sm, paddingLeft: Spacing.sm, borderLeftWidth: 1, borderLeftColor: Colors.border },
  subBudgetRow: { gap: 4 },
  subBudgetName: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '600', flex: 1 },

  emptyCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: Colors.text1, fontSize: FontSize.md, fontWeight: '800' },
  emptyText: { color: Colors.text2, fontSize: FontSize.base, textAlign: 'center' },
  budgetHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  budgetBig: { color: Colors.text1, fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', gap: Spacing.sm },
  statusPill: { minHeight: 60, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm },
  statusNum: { fontSize: FontSize.xl, fontWeight: '800' },
  statusLabel: { fontSize: FontSize.xs, fontWeight: '800' },
  carousel: { gap: Spacing.md, paddingRight: Spacing.lg, paddingVertical: 2 },
  catCard: { backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.sm, minHeight: 132, justifyContent: 'space-between' },
  catTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  catName: { flex: 1, color: Colors.text1, fontSize: FontSize.base, fontWeight: '800' },
  catPct: { fontSize: FontSize.base, fontWeight: '800' },
  catDiff: { fontSize: FontSize.lg, fontWeight: '800' },
  paceLine: { fontSize: FontSize.sm, fontWeight: '800', marginTop: 2 },
  catMeta: { color: Colors.text2, fontSize: FontSize.sm },
  catMore: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderStyle: 'dashed', borderColor: Colors.borderStrong },
  catMoreText: { color: Colors.accentLight, fontSize: FontSize.base, fontWeight: '800' },
  clearCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dueCard: { backgroundColor: Colors.panel, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.lg, gap: 6 },
  dueDays: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.pill },
  dueDaysNum: { fontSize: FontSize.xl, fontWeight: '800' },
  dueDaysUnit: { fontSize: FontSize.sm, fontWeight: '700' },
  dueName2: { color: Colors.text1, fontSize: FontSize.base, fontWeight: '800', marginTop: 4 },
  dueAmt: { color: Colors.text1, fontSize: FontSize.lg, fontWeight: '800' },
  dueSheetHero: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, padding: Spacing.lg, gap: 2 },
  dueSheetCard: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, paddingHorizontal: Spacing.lg },
  dueSheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  mixBar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: Colors.track },
  mixTile: { borderRadius: Radius.md, padding: Spacing.lg, gap: 4, minHeight: 104 },
  mixLabel: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '700', marginTop: 4 },
  mixValue: { fontSize: FontSize.lg, fontWeight: '800' },
  healthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  healthDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  healthText: { flex: 1, color: Colors.text1, fontSize: FontSize.base, lineHeight: 20 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, minHeight: 60 },
  dueName: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  dueBadge: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 2 },
  avRow: { flexDirection: 'row', justifyContent: 'space-between' },
  avLabel: { fontSize: FontSize.sm, color: Colors.text2, marginBottom: 4 },
  avValue: { fontSize: FontSize.lg, fontWeight: '800' },
  liabilityRatio: { fontSize: FontSize.sm, color: Colors.text2, marginTop: 6 },
}));
