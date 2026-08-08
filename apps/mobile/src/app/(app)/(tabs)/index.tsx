import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Eye, EyeOff, Settings as SettingsIcon, LogOut, Search } from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Card, StatCard, ProgressBar, EmptyState, DriveConnectBanner, DateField } from '../../../components/ui';
import SearchModal from '../../../components/SearchModal';
import { Colors, FontSize, Spacing, GroupColors, Radius } from '../../../constants/theme';
import { PieChart as PieChartIcon } from 'lucide-react-native';

export default function Dashboard() {
  const { state, toggleAmounts, amountsHidden, logout, currentUser, fmt, fmtSigned, fmtN } = useApp();
  const router = useRouter();
  const confirmLogout = () => Alert.alert('Sign out?', 'You can sign back in with Google anytime.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
  ]);
  const [showSearch, setShowSearch] = useState(false);
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

  const totalAssets = assets.reduce((s: number, a: any) => s + (a.quantity * a.currentPrice), 0);
  const totalLiabilities = liabilities.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const inHand = accounts
    .filter((a: any) => ['bank', 'cash', 'wallet'].includes(a.type))
    .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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

  const periodStart = rangeMode === 'custom' ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEndRaw = rangeMode === 'custom' ? new Date(customTo) : now;
  const periodEnd = new Date(periodEndRaw.getFullYear(), periodEndRaw.getMonth(), periodEndRaw.getDate(), 23, 59, 59, 999);

  const thisMonthTxns = transactions.filter((t: any) => { const d = new Date(t.date); return d >= periodStart && d <= periodEnd; });
  const monthIncome = thisMonthTxns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const monthExpense = thisMonthTxns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  // Budgets are keyed by calendar month/year, so a custom range is matched by
  // including every month it touches (e.g. a 25th-Jul→24th-Aug range pulls in
  // both July's and August's budgeted categories).
  const periodMonths: { month: string; year: number }[] = [];
  {
    let d = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const last = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    while (d <= last) { periodMonths.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear() }); d.setMonth(d.getMonth() + 1); }
  }
  const periodBudgetsRaw = budgets.filter((b: any) => periodMonths.some((m) => m.month === b.month && String(m.year) === String(b.year)));

  // Rolled up to category level for the dashboard — a category split across
  // several sub-category budget rows shows as one combined line here.
  const thisMonthBudgets: any[] = Object.values(
    periodBudgetsRaw.reduce((acc: Record<string, any>, b: any) => {
      if (!acc[b.category]) acc[b.category] = { id: `cat-${b.category}`, category: b.category, plannedAmount: 0 };
      acc[b.category].plannedAmount += Number(b.plannedAmount || 0);
      return acc;
    }, {} as Record<string, any>),
  );
  const monthBudgeted = thisMonthBudgets.reduce((s: number, b: any) => s + Number(b.plannedAmount || 0), 0);
  const getBudgetSpent = (b: any) => thisMonthTxns
    .filter((t: any) => t.type === 'expense' && t.category === b.category)
    .reduce((s: number, t: any) => s + t.amount, 0);
  const budgetUsagePct = monthBudgeted > 0 ? Math.min((monthExpense / monthBudgeted) * 100, 100) : 0;

  const recentTxns = [...transactions].sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);

  const upcomingInsurance = insurance
    .map((p: any) => ({ ...p, daysLeft: Math.ceil((+new Date(p.nextDue) - +now) / 86400000) }))
    .filter((p: any) => p.daysLeft >= 0 && p.daysLeft <= 60)
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <DriveConnectBanner />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Good {greeting}{firstName ? `, ${firstName}` : ''} 👋</Text>
            <Text style={styles.subGreeting}>
              {state.household?.name} • {now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => setShowSearch(true)} hitSlop={10} style={styles.eyeBtn}>
              <Search size={20} color={Colors.text2} />
            </Pressable>
            <Pressable onPress={toggleAmounts} hitSlop={10} style={styles.eyeBtn}>
              {amountsHidden ? <EyeOff size={20} color={Colors.text2} /> : <Eye size={20} color={Colors.accentLight} />}
            </Pressable>
            <Pressable onPress={() => router.push('/(app)/settings')} hitSlop={10} style={styles.eyeBtn}>
              <SettingsIcon size={20} color={Colors.text2} />
            </Pressable>
            <Pressable onPress={confirmLogout} hitSlop={10} style={styles.eyeBtn}>
              <LogOut size={20} color={Colors.red} />
            </Pressable>
          </View>
        </View>

        {showHint && amountsHidden ? (
          <Pressable onPress={() => setShowHint(false)} style={styles.hint}>
            <EyeOff size={13} color={Colors.accentLight} />
            <Text style={styles.hintText}>Amounts are hidden — tap the eye to show them.</Text>
          </Pressable>
        ) : null}

        <View style={styles.periodRow}>
          <Pressable onPress={() => setRangeMode('month')} style={[styles.periodPill, rangeMode === 'month' && styles.periodPillActive]}>
            <Text style={[styles.periodPillText, rangeMode === 'month' && styles.periodPillTextActive]}>This Month</Text>
          </Pressable>
          <Pressable onPress={() => setRangeMode('custom')} style={[styles.periodPill, rangeMode === 'custom' && styles.periodPillActive]}>
            <Text style={[styles.periodPillText, rangeMode === 'custom' && styles.periodPillTextActive]}>Custom Range</Text>
          </Pressable>
        </View>
        {rangeMode === 'custom' && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <DateField label="From" value={customFrom} onChange={setCustomFrom} maximumDate={new Date()} style={{ flex: 1 }} />
            <DateField label="To" value={customTo} onChange={setCustomTo} maximumDate={new Date()} style={{ flex: 1 }} />
          </View>
        )}

        <View style={styles.statsGrid}>
          <StatCard title="Net Worth" value={fmtSigned(netWorth)} sub={netWorth >= 0 ? 'Positive net worth' : 'Negative net worth'} subColor={netWorth >= 0 ? Colors.green : Colors.red} icon={TrendingUp} iconColor={Colors.accentLight} />
          <StatCard title="In Hand" value={fmtSigned(inHand)} sub="Across all accounts" subColor={inHand >= 0 ? Colors.text2 : Colors.red} icon={Wallet} iconColor={Colors.green} />
          <StatCard title={rangeMode === 'month' ? 'This Month Income' : 'Period Income'} value={fmt(monthIncome)} sub="↑ Earnings" subColor={Colors.green} icon={ArrowDownRight} iconColor={Colors.green} />
          <StatCard title={rangeMode === 'month' ? 'This Month Expense' : 'Period Expense'} value={fmt(monthExpense)} sub={`Savings: ${fmt(monthIncome - monthExpense)}`} subColor={monthIncome - monthExpense >= 0 ? Colors.green : Colors.red} icon={ArrowUpRight} iconColor={Colors.red} />
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTxns.length === 0 ? (
          <EmptyState icon={ArrowUpRight} title="No transactions yet" />
        ) : (
          <Card style={{ gap: 0 }}>
            {recentTxns.map((t: any, i: number) => {
              const isTransfer = t.type === 'transfer';
              const color = isTransfer ? Colors.blue : t.type === 'income' ? Colors.green : Colors.red;
              const accName = (id: string) => accounts.find((a: any) => a.id === id)?.name || '';
              return (
                <View key={t.id} style={[styles.txnRow, i < recentTxns.length - 1 && styles.txnRowBorder]}>
                  <View style={[styles.txnDot, { backgroundColor: color }]} />
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnDesc} numberOfLines={1}>
                      {isTransfer ? `${accName(t.account)} → ${accName(t.toAccount)}` : `${t.category}${t.subcategory ? ` · ${t.subcategory}` : ''}`}
                    </Text>
                    <Text style={styles.txnMeta}>{t.date}</Text>
                  </View>
                  <Text style={{ color, fontWeight: '700' }}>
                    {isTransfer ? '⇄ ' : t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}

        <Text style={styles.sectionTitle}>This Month's Budget</Text>
        {thisMonthBudgets.length === 0 ? (
          <EmptyState icon={PieChartIcon} title="No budgets set for this month" />
        ) : (
          <>
            <Card style={{ gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <View style={styles.budgetTop}>
                <Text style={styles.budgetSummaryLabel}>Budgeted vs Spent</Text>
                <Text style={[styles.budgetPct, { color: budgetUsagePct >= 100 ? Colors.red : budgetUsagePct >= 80 ? Colors.yellow : Colors.green }]}>
                  {budgetUsagePct.toFixed(0)}%
                </Text>
              </View>
              <ProgressBar pct={budgetUsagePct} color={budgetUsagePct >= 100 ? Colors.red : budgetUsagePct >= 80 ? Colors.yellow : Colors.green} />
              <View style={styles.budgetNums}>
                <Text style={styles.budgetNumText}>{fmt(monthExpense)} spent</Text>
                <Text style={styles.budgetNumText}>{fmt(monthBudgeted)} budgeted</Text>
              </View>
            </Card>

            <Card style={{ gap: Spacing.md }}>
              {thisMonthBudgets.map((b: any) => {
                const spent = getBudgetSpent(b);
                const pct = b.plannedAmount > 0 ? Math.min((spent / b.plannedAmount) * 100, 100) : 0;
                const color = pct >= 100 ? Colors.red : pct >= 80 ? Colors.yellow : Colors.green;
                return (
                  <View key={b.id}>
                    <View style={styles.budgetTop}>
                      <Text style={styles.budgetName}>{b.category}</Text>
                      <Text style={[styles.budgetPct, { color }]}>{pct.toFixed(0)}%</Text>
                    </View>
                    <ProgressBar pct={pct} color={color} />
                    <View style={styles.budgetNums}>
                      <Text style={styles.budgetNumText}>{fmt(spent)} spent</Text>
                      <Text style={styles.budgetNumText}>{fmt(b.plannedAmount)} limit</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        <Text style={styles.sectionTitle}>Upcoming Due</Text>
        {upcomingInsurance.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No upcoming dues in 60 days" />
        ) : (
          <Card style={{ gap: Spacing.md }}>
            {upcomingInsurance.map((p: any) => (
              <View key={p.id} style={styles.dueRow}>
                <View>
                  <Text style={styles.dueName}>{p.name}</Text>
                  <Text style={[styles.dueBadge, { color: p.daysLeft <= 7 ? Colors.red : Colors.yellow }]}>
                    {p.daysLeft === 0 ? 'Today' : `${p.daysLeft}d left`}
                  </Text>
                </View>
                <Text style={{ color: Colors.red, fontWeight: '700' }}>-{fmt(p.premium)}</Text>
              </View>
            ))}
          </Card>
        )}

        <Text style={styles.sectionTitle}>Assets vs Liabilities</Text>
        <Card>
          <View style={styles.avRow}>
            <View>
              <Text style={styles.avLabel}>Total Assets</Text>
              <Text style={[styles.avValue, { color: Colors.green }]}>{fmt(totalAssets)}</Text>
            </View>
            <View>
              <Text style={styles.avLabel}>Total Liabilities</Text>
              <Text style={[styles.avValue, { color: Colors.red }]}>{fmt(totalLiabilities)}</Text>
            </View>
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <ProgressBar pct={totalAssets ? (totalLiabilities / totalAssets) * 100 : 0} color={Colors.red} />
          </View>
          <Text style={styles.liabilityRatio}>
            Liability ratio: {totalAssets ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : 0}%
          </Text>
        </Card>
      </ScrollView>
      <SearchModal visible={showSearch} onClose={() => setShowSearch(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.md },
  headerText: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  periodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  periodPill: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  periodPillActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
  periodPillText: { color: Colors.text2, fontWeight: '600', fontSize: FontSize.sm },
  periodPillTextActive: { color: Colors.accentLight },
  eyeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  hint: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm,
    backgroundColor: 'rgba(99,102,241,0.12)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: Radius.sm, paddingVertical: 8, paddingHorizontal: 12,
  },
  hintText: { color: Colors.accentLight, fontSize: FontSize.sm, flex: 1 },
  greeting: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text1 },
  subGreeting: { fontSize: FontSize.base, color: Colors.text2, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1, marginTop: Spacing.md, marginBottom: Spacing.xs },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  txnRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  txnDot: { width: 8, height: 8, borderRadius: 4 },
  txnInfo: { flex: 1 },
  txnDesc: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  txnMeta: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  budgetName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  budgetSummaryLabel: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  budgetPct: { fontWeight: '700', fontSize: FontSize.base },
  budgetNums: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetNumText: { fontSize: FontSize.sm, color: Colors.text2 },
  dueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  dueBadge: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 2 },
  avRow: { flexDirection: 'row', justifyContent: 'space-between' },
  avLabel: { fontSize: FontSize.sm, color: Colors.text2, marginBottom: 4 },
  avValue: { fontSize: FontSize.lg, fontWeight: '700' },
  liabilityRatio: { fontSize: FontSize.sm, color: Colors.text2, marginTop: 6 },
});
