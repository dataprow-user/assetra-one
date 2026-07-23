import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ShieldCheck, CloudCog, Wallet, TrendingUp, PieChart } from 'lucide-react-native';
import BrandMark from '../components/BrandMark';
import GoogleLogo from '../components/ui/GoogleLogo';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { useApp } from '../context/AppContext';
import { useGoogleSignIn } from '../utils/googleAuth';
import { trackUserEvent } from '../utils/userTracker';
import { Colors, FontSize, Spacing, Radius, Shadow } from '../constants/theme';

const TRUST_BADGES = [
  { icon: Lock, label: 'Secured by Google Sign-In' },
  { icon: ShieldCheck, label: 'Your data stays private' },
  { icon: CloudCog, label: 'Drive backup is optional' },
];

const FEATURES = [
  { icon: Wallet, title: 'Accounts & Transactions', desc: 'Every rupee tracked, balances always accurate.' },
  { icon: TrendingUp, title: 'Assets & Liabilities', desc: 'Gold, mutual funds, loans — all in one view.' },
  { icon: PieChart, title: 'Budgets & Insights', desc: 'Know exactly where your money goes each month.' },
];

export default function Login() {
  const { loginWithGoogle } = useApp();
  const { ready, signIn } = useGoogleSignIn();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const identity = await signIn();
      loginWithGoogle(identity);
      trackUserEvent(identity.name, identity.email, 'Google Sign-In');
    } catch (e: any) {
      setError(e?.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0e1c', '#120b2e', '#06111f']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <LinearGradient colors={Colors.accentGradient} style={styles.logoBadge}>
              <BrandMark size={30} />
            </LinearGradient>
            <Text style={styles.brandTitle}>Assetra One</Text>
            <Text style={styles.tagline}>Your complete personal finance & asset management command center</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to continue</Text>
            <Text style={styles.cardSubtitle}>Use your Google account — no separate password to create or remember.</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <Pressable onPress={handleSignIn} disabled={loading || !ready} style={({ pressed }) => [{ opacity: pressed || loading ? 0.85 : 1 }]}>
              <LinearGradient colors={Colors.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.signInBtn}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <View style={styles.googleBadge}><GoogleLogo size={18} /></View>
                    <Text style={styles.signInText}>Sign in with Google</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Text style={styles.helperText}>
              New here? Signing in automatically creates your Assetra account — you'll be asked to connect Google
              Drive as an optional next step, only when you want automatic backup.
            </Text>

            <View style={styles.cardFooter}>
              <Pressable onPress={() => setShowPrivacy(true)}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Pressable>
            </View>
          </View>

          {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}

          <View style={styles.trustStrip}>
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <View key={label} style={styles.trustItem}>
                <Icon size={17} color={Colors.accentLight} />
                <Text style={styles.trustLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.featuresGrid}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <View key={title} style={styles.featureCard}>
                <View style={styles.featureIcon}><Icon size={18} color={Colors.accentLight} /></View>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.copyright}>© {new Date().getFullYear()} Assetra One. All rights reserved.</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingTop: Spacing.xxxl, alignItems: 'center' },
  brandRow: { alignItems: 'center', marginBottom: Spacing.xl },
  logoBadge: { width: 60, height: 60, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, ...Shadow.glow },
  brandTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: '#fff', marginBottom: 8 },
  tagline: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 320, lineHeight: 20 },
  card: {
    width: '100%', backgroundColor: 'rgba(20,24,36,0.85)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderStrong, padding: Spacing.xl, ...Shadow.xl,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text1, textAlign: 'center', marginBottom: 6 },
  cardSubtitle: { fontSize: FontSize.base, color: Colors.text2, textAlign: 'center', marginBottom: Spacing.lg },
  errorBox: { backgroundColor: Colors.redBg, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)', borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.md },
  errorText: { color: Colors.red, fontSize: FontSize.sm, textAlign: 'center' },
  signInBtn: { flexDirection: 'row', gap: 10, paddingVertical: 15, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  googleBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  signInText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  helperText: { fontSize: FontSize.sm, color: Colors.text2, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
  cardFooter: { alignItems: 'center', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  footerLink: { fontSize: FontSize.sm, color: Colors.text2, fontWeight: '500' },
  trustStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  trustItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  trustLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  featuresGrid: { width: '100%', gap: Spacing.sm, marginTop: Spacing.xl },
  featureCard: {
    padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  featureIcon: {
    width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(99,102,241,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  featureTitle: { fontSize: FontSize.base, fontWeight: '600', color: '#fff', marginBottom: 2 },
  featureDesc: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.55)', lineHeight: 16 },
  copyright: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.35)', marginTop: Spacing.xl },
});
