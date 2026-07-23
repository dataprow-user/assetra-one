import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Sparkles, LayoutDashboard, Wallet, List, TrendingUp,
  PieChart, Shield, Tags, Settings as SettingsIcon,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react-native';
import { Colors, Radius, FontSize, Spacing, Shadow } from '../constants/theme';

// Mirrors apps/web/src/components/OnboardingTour.jsx — same 10 steps.
const STEPS = [
  { icon: Sparkles, title: 'Welcome to Assetra One 👋', desc: "Let's take a quick look around so you know exactly where everything lives. This takes less than a minute." },
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Your financial overview at a glance — net worth, income vs. expenses, and recent activity, all in one place.' },
  { icon: Wallet, title: 'Accounts — start here', desc: 'Add your bank accounts, credit cards, and cash first. Every transaction is linked to an account so its balance always stays accurate.' },
  { icon: List, title: 'Transactions', desc: 'Log income and expenses here. Balances update automatically on the account you select.' },
  { icon: TrendingUp, title: 'Assets & Liabilities', desc: 'Track investments like gold, mutual funds, and fixed deposits under Assets — and loans or debts under Liabilities.' },
  { icon: PieChart, title: 'Budgets & Events', desc: 'Set monthly budgets per category, or create an Event (like a trip) with its own one-time budget.' },
  { icon: Shield, title: 'Insurance', desc: 'Keep your policy renewal dates here — Assetra reminds you when a due date is within 30 days.' },
  { icon: Tags, title: 'Categories', desc: 'Customize expense and income categories and groups to match how you actually spend and earn.' },
  { icon: SettingsIcon, title: 'Settings & Backup', desc: 'Manage your household name, export or import a backup, and connect Google Drive for automatic cloud sync — all here.' },
  { icon: Sparkles, title: "You're all set!", desc: 'Quick tip: add at least one Account before your first Transaction, so balances track correctly from day one.' },
];

export default function OnboardingTour({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFinish}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Pressable onPress={onFinish} hitSlop={10} style={styles.skipBtn}>
            <X size={16} color={Colors.text2} />
          </Pressable>

          <View style={styles.iconWrap}><Icon size={30} color={Colors.accentLight} /></View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.desc}>{current.desc}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable disabled={isFirst} onPress={() => setStep((s) => s - 1)} style={[styles.ghostBtn, isFirst && { opacity: 0.4 }]}>
              <ChevronLeft size={16} color={Colors.text1} />
              <Text style={styles.ghostText}>Back</Text>
            </Pressable>
            <Pressable onPress={() => (isLast ? onFinish() : setStep((s) => s + 1))} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>{isLast ? 'Get Started' : 'Next'}</Text>
              {!isLast && <ChevronRight size={16} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  box: {
    width: '100%', maxWidth: 380, backgroundColor: '#141824', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderStrong, padding: Spacing.xl, alignItems: 'center', ...Shadow.xl,
  },
  skipBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md, padding: 6 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text1, textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: FontSize.base, color: Colors.text2, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.accentLight, width: 18 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: Spacing.md },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: Radius.sm },
  ghostText: { color: Colors.text1, fontWeight: '600', fontSize: FontSize.base },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingVertical: 10 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },
});
