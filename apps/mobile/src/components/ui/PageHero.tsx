import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';

// Two soft translucent rings behind hero content — depth without noise.
export function HeroBackdrop() {
  return (
    <>
      <View pointerEvents="none" style={styles.orbA} />
      <View pointerEvents="none" style={styles.orbB} />
    </>
  );
}

export type HeroStat = {
  label: string; value: string; onPress?: () => void; active?: boolean; a11y?: string;
};

// The summary card that opens every main page (same family as the Home hero):
// a headline number, an optional one-line insight, and up to three stats —
// each stat is tappable (usually to filter the list below it).
export default function PageHero({
  label, value, sub, stats = [], onPress, actionLabel = 'Details',
}: {
  label: string; value: string; sub?: string; stats?: HeroStat[]; onPress?: () => void; actionLabel?: string;
}) {
  const body = (
    <LinearGradient colors={[Colors.heroFrom, Colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <HeroBackdrop />
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        {onPress ? (
          <View style={styles.more}><Text style={styles.moreText}>{actionLabel}</Text><ChevronRight size={14} color="#fff" /></View>
        ) : null}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      {stats.length > 0 ? (
        <View style={styles.statRow}>
          {stats.map((s) => {
            const inner = (
              <>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{s.value}</Text>
              </>
            );
            return s.onPress ? (
              <Pressable key={s.label} onPress={s.onPress} style={[styles.stat, s.active && styles.statActive]}
                accessibilityRole="button" accessibilityLabel={s.a11y || `${s.label} ${s.value}`} accessibilityState={{ selected: !!s.active }}>
                {inner}
              </Pressable>
            ) : (
              <View key={s.label} style={styles.stat}>{inner}</View>
            );
          })}
        </View>
      ) : null}
    </LinearGradient>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} ${value}. ${actionLabel}`}>{body}</Pressable>
  ) : body;
}

const styles = createStyles(() => ({
  hero: { borderRadius: Radius.lg, padding: Spacing.xl, gap: 4, overflow: 'hidden' },
  orbA: { position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95, borderWidth: 28, borderColor: 'rgba(255,255,255,0.06)' },
  orbB: { position: 'absolute', right: 40, bottom: -70, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.base, fontWeight: '600' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingLeft: 10, paddingRight: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  moreText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  value: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.base, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  stat: { flex: 1, minHeight: 54, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'transparent' },
  statActive: { backgroundColor: 'rgba(255,255,255,0.26)', borderColor: 'rgba(255,255,255,0.7)' },
  statLabel: { color: 'rgba(255,255,255,0.78)', fontSize: FontSize.xs, fontWeight: '600' },
  statValue: { color: '#fff', fontSize: FontSize.md, fontWeight: '800', marginTop: 2 },
}));
