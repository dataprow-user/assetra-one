import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '../../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  TrendingUp, CreditCard, PieChart, CalendarDays, Shield, Tags, Settings as SettingsIcon, ChevronRight, LogOut, Target, Sparkles, BarChart3,
} from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Card, Tap } from '../../../components/ui';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../../constants/theme';

type Item = { id: string; route: string; label: string; desc: string; icon: any; color: string; badge?: string };
type Section = { title: string; items: Item[] };

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export default function More() {
  const { state, currentUser, logout, setForceOnboarding } = useApp();
  const router = useRouter();
  const { assets = [], liabilities = [], insurance = [], events = [], budgets = [] } = state;

  const now = new Date();
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthBudgets = budgets.filter((b: any) => b.month === MONTHS[now.getMonth()] && String(b.year) === String(now.getFullYear())).length;

  const sections: Section[] = [
    {
      title: 'Money',
      items: [
        { id: 'assets', route: '/(app)/assets', label: 'Assets', desc: 'Gold, mutual funds, stocks & more', icon: TrendingUp, color: Colors.green, badge: assets.length ? String(assets.length) : undefined },
        { id: 'liabilities', route: '/(app)/liabilities', label: 'Liabilities', desc: 'Loans and debts', icon: CreditCard, color: Colors.red, badge: liabilities.length ? String(liabilities.length) : undefined },
        { id: 'insurance', route: '/(app)/insurance', label: 'Insurance', desc: 'Policies & renewal reminders', icon: Shield, color: Colors.yellow, badge: insurance.length ? plural(insurance.length, 'policy', 'policies') : undefined },
      ],
    },
    {
      title: 'Planning',
      items: [
        { id: 'insights', route: '/(app)/insights', label: 'Insights', desc: 'Explore & slice your money any way', icon: BarChart3, color: Colors.accent2 },
        { id: 'budgets', route: '/(app)/budgets', label: 'Budgets', desc: 'Plan monthly & yearly spending', icon: Target, color: Colors.accentLight, badge: monthBudgets ? `${monthBudgets} this month` : undefined },
        { id: 'budget-vs-spent', route: '/(app)/budget-vs-spent', label: 'Budget vs Spent', desc: 'See where you are over or under', icon: PieChart, color: Colors.blue },
        { id: 'events', route: '/(app)/events', label: 'Events', desc: 'Trips, functions & occasions', icon: CalendarDays, color: Colors.accent2, badge: events.length ? String(events.length) : undefined },
        { id: 'categories', route: '/(app)/categories', label: 'Categories', desc: 'Customize income & expense categories', icon: Tags, color: '#06b6d4' },
      ],
    },
    {
      title: 'App',
      items: [
        { id: 'settings', route: '/(app)/settings', label: 'Settings', desc: 'Household, backup, PIN & account', icon: SettingsIcon, color: Colors.text2 },
      ],
    },
  ];

  const initials = currentUser?.name?.slice(0, 2).toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>

        <Tap onPress={() => router.push('/(app)/settings' as any)} accessibilityLabel={`${currentUser?.name || 'User'}, ${currentUser?.email || ''}. Open settings`}>
          <Card style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName} numberOfLines={1}>{currentUser?.name || 'User'}</Text>
              {currentUser?.email ? <Text style={styles.profileEmail} numberOfLines={1}>{currentUser.email}</Text> : null}
            </View>
            <ChevronRight size={18} color={Colors.text3} />
          </Card>
        </Tap>

        {sections.map((sec) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.menuList}>
              {sec.items.map((item) => (
                <Tap key={item.id} onPress={() => router.push(item.route as any)} accessibilityLabel={`${item.label}. ${item.desc}${item.badge ? `. ${item.badge}` : ''}`}>
                  <View style={styles.menuRow}>
                    <View style={[styles.menuIcon, { backgroundColor: item.color + '1f' }]}>
                      <item.icon size={22} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
                      <Text style={styles.menuDesc} numberOfLines={1}>{item.desc}</Text>
                    </View>
                    {item.badge ? (
                      <View style={[styles.badge, { backgroundColor: item.color + '1f' }]}>
                        <Text style={[styles.badgeText, { color: item.color }]} numberOfLines={1}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <ChevronRight size={18} color={Colors.text3} />
                  </View>
                </Tap>
              ))}
              {sec.title === 'App' ? (
                <Tap onPress={() => setForceOnboarding(true)} accessibilityLabel="Replay welcome guide">
                  <View style={styles.menuRow}>
                    <View style={[styles.menuIcon, { backgroundColor: Colors.accentLight + '1f' }]}>
                      <Sparkles size={22} color={Colors.accentLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuLabel} numberOfLines={1}>Welcome guide</Text>
                      <Text style={styles.menuDesc} numberOfLines={1}>Replay the quick tour</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.text3} />
                  </View>
                </Tap>
              ) : null}
            </View>
          </View>
        ))}

        <Tap onPress={logout} accessibilityLabel="Sign out" style={{ marginTop: Spacing.sm }}>
          <View style={styles.signOutBtn}>
            <LogOut size={18} color={Colors.red} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </Tap>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createStyles(() => ({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },
  profileName: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.lg },
  profileEmail: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  section: { gap: Spacing.sm },
  sectionTitle: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 2 },
  menuList: { gap: Spacing.sm },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, minHeight: 68,
    backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.md },
  menuDesc: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 2 },
  badge: { maxWidth: 110, paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill },
  badgeText: { fontSize: FontSize.xs, fontWeight: '800' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52,
    padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.redBg, borderWidth: 1, borderColor: Colors.red + '4d',
  },
  signOutText: { color: Colors.red, fontWeight: '800', fontSize: FontSize.base },
}));
