import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '../ui/AppText';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import Tap from '../ui/Tap';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { feed } from '../../utils/insightsHighlights';
import { TONE } from './HighlightsView';

// Home-screen teaser for Insights: a swipeable strip of the most telling findings, each opening the full view.
export default function HomeInsights() {
  const { state, fmt } = useApp();
  const router = useRouter();
  const list = useMemo(() => feed(state, fmt, 'cycle'), [state, fmt]);
  const go = (lens: string) => router.push({ pathname: '/(app)/insights', params: { lens } } as any);
  if (!list.length) return null;
  const order = ['pace', 'repeat', 'up', 'save', 'fixed', 'odd', 'payday', 'weekday'];
  const rank = (id: string) => (order.indexOf(id) < 0 ? 99 : order.indexOf(id));
  const picks = [...list.filter((h) => h.custom), ...list.filter((h) => !h.custom).sort((a, b) => rank(a.id) - rank(b.id))].slice(0, 6);

  return (
    <>
      <View style={styles.head}>
        <Text style={styles.title}>Insights for you</Text>
        <Pressable onPress={() => go('highlights')} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>See all ›</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} snapToInterval={252} decelerationRate="fast">
        {picks.map((h) => {
          const { Icon, color } = TONE[h.tone];
          return (
            <Tap key={h.id} onPress={() => go('highlights')} accessibilityLabel={`${h.title}. ${h.text}`}>
              <View style={styles.card}>
                <View style={[styles.icon, { backgroundColor: color + '1f' }]}><Icon size={16} color={color} /></View>
                <Text style={styles.ct} numberOfLines={2}>{h.title}</Text>
                <Text style={styles.cx} numberOfLines={3}>{h.text}</Text>
              </View>
            </Tap>
          );
        })}
      </ScrollView>
      <View style={styles.lenses}>
        {[['wealth', 'Wealth'], ['improve', 'Improve'], ['trends', 'Trends'], ['explore', 'Explore']].map(([k, l]) => (
          <Pressable key={k} onPress={() => go(k)} style={styles.lens} accessibilityRole="button" accessibilityLabel={`Open ${l} view`}>
            <Text style={styles.lensText}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = createStyles(() => ({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md, marginBottom: Spacing.xs },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text1 },
  link: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
  strip: { gap: Spacing.md, paddingRight: Spacing.lg },
  card: { width: 240, minHeight: 138, gap: 6, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border },
  icon: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  ct: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  cx: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 18 },
  lenses: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  lens: { flex: 1, minHeight: 40, borderRadius: Radius.pill, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  lensText: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.base },
}));
