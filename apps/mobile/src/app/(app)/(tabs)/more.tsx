import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  TrendingUp, CreditCard, PieChart, CalendarDays, Shield, Tags, Settings as SettingsIcon, ChevronRight, LogOut,
} from 'lucide-react-native';
import { useApp } from '../../../context/AppContext';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';

const MENU = [
  { id: 'assets', label: 'Assets', desc: 'Gold, mutual funds, stocks & more', icon: TrendingUp, color: Colors.green },
  { id: 'liabilities', label: 'Liabilities', desc: 'Loans and debts', icon: CreditCard, color: Colors.red },
  { id: 'budgets', label: 'Budgets', desc: 'Plan monthly & event spending', icon: PieChart, color: Colors.accentLight },
  { id: 'events', label: 'Events', desc: 'Trips, functions & occasions', icon: CalendarDays, color: Colors.blue },
  { id: 'insurance', label: 'Insurance', desc: 'Policies & renewal reminders', icon: Shield, color: Colors.yellow },
  { id: 'categories', label: 'Categories', desc: 'Customize income & expense categories', icon: Tags, color: Colors.accent2 },
  { id: 'settings', label: 'Settings', desc: 'Household, backup & account', icon: SettingsIcon, color: Colors.text2 },
];

export default function More() {
  const { currentUser, logout } = useApp();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser?.name?.slice(0, 2).toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{currentUser?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{currentUser?.email}</Text>
          </View>
        </View>

        <View style={styles.menuList}>
          {MENU.map((item) => (
            <Pressable key={item.id} style={styles.menuRow} onPress={() => router.push(`/(app)/${item.id}` as any)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '22' }]}>
                <item.icon size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <ChevronRight size={18} color={Colors.text3} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.signOutBtn} onPress={logout}>
          <LogOut size={16} color={Colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPrimary },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text1, marginBottom: Spacing.lg },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  profileName: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.md },
  profileEmail: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 1 },
  menuList: { gap: Spacing.sm },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.md },
  menuDesc: { color: Colors.text2, fontSize: FontSize.sm, marginTop: 1 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.xl,
    padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.redBg, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
  },
  signOutText: { color: Colors.red, fontWeight: '700' },
});
