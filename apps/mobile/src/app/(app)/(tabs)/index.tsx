import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Eye, EyeOff, Settings as SettingsIcon, LogOut, Search } from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Card, StatCard, ProgressBar, EmptyState, DriveConnectBanner } from '../../../components/ui';
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTxns = transactions.filter((t: any) => new Date(t.date) >= monthStart);
  const monthIncome = thisMonthTxns.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const monthExpense = thisMonthTxns.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);

  // Budgets set for the current month — drives both the "Budgeted vs Spent"
  // summary and the per-category list below. `spent` isn't stored on the
  // budget itself; it's derived by matching this month's expense
  // transactions to the budget's category/sub-category, same as web.
  const thisMonthBudgets = budgets.filter((b: any) => b.month === MONTH_NAMES[now.getMonth()] && String(b.year) === String(now.getFullYear()));
  const monthBudgeted = thisMonthBudgets.reduce((s: number, b: any) => s + Number(b.plannedAmount || 0), 0);
  const getBudgetSpent = (b: any) => thisMonthTxns
    .filter((t: any) => t.type === 'expense' && t.category === b.category && (!b.subcategory || t.subcategory === b.subcategory))
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

        <View style={styles.statsGrid}>
          <StatCard title="Net Worth" value={fmtSigned(netWorth)} sub={netWorth >= 0 ? 'Positive net worth' : 'Negative net worth'} subColor={netWorth >= 0 ? Colors.green : Colors.red} icon={TrendingUp} iconColor={Colors.accentLight} />
          <StatCard title="In Hand" value={fmtSigned(inHand)} sub="Across all accounts" subColor={inHand >= 0 ? Colors.text2 : Colors.red} icon={Wallet} iconColor={Colors.green} />
          <StatCard title="This Month Income" value={fmt(monthIncome)} sub="↑ Earnings" subColor={Colors.green} icon={ArrowDownRight} iconColor={Colors.green} />
          <StatCard title="This Month Expense" value={fmt(monthExpense)} sub={`Savings: ${fmt(monthIncome - monthExpense)}`} subColor={monthIncome - monthExpense >= 0 ? Colors.green : Colors.red} icon={ArrowUpRight} iconColor={Colors.red} />
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recentTxns.length === 0 ? (
          <EmptyState icon={ArrowUpRight} title="No transactions yet" />
        ) : (
          <Card style={{ gap: 0 }}>
            {recentTxns.map((t: any, i: number) => (
              <View key={t.id} style={[styles.txnRow, i < recentTxns.length - 1 && styles.txnRowBorder]}>
                <View style={[styles.txnDot, { backgroundColor: t.type === 'income' ? Colors.green : Colors.red }]} />
                <View style={styles.txnInfo}>
                  <Text style={styles.txnDesc} numberOfLines={1}>{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</Text>
                  <Text style={styles.txnMeta}>{t.date}</Text>
                </View>
                <Text style={{ color: t.type === 'income' ? Colors.green : Colors.red, fontWeight: '700' }}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </Text>
              </View>
            ))}
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
                      <Text style={styles.budgetName}>{b.category}{b.subcategory ? ` · ${b.subcategory}` : ''}</Text>
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
