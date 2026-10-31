import React from 'react';
import { View } from 'react-native';
import { Colors, createStyles } from '../../constants/theme';

// Budget "bullet" bar: fill = how much is spent, tick = where you SHOULD be by
// today if spending were even. Colour speaks in three calm steps — teal when
// comfortable, amber when running ahead of pace, coral only once truly over —
// so trouble shows up early and gently instead of as a red surprise.
export function budgetTone(spent: number, planned: number, pace?: number): { color: string; level: 'ok' | 'ahead' | 'over' } {
  if (planned <= 0) return { color: Colors.text3, level: 'ok' };
  const used = spent / planned;
  if (used > 1) return { color: Colors.red, level: 'over' };
  const limit = pace !== undefined ? Math.min(pace + 0.08, 0.92) : 0.8;
  if (used > limit) return { color: Colors.yellow, level: 'ahead' };
  return { color: Colors.accentLight, level: 'ok' };
}

export default function BudgetBar({
  spent, planned, pace, height = 8,
}: { spent: number; planned: number; pace?: number; height?: number }) {
  const used = planned > 0 ? Math.min(spent / planned, 1) : spent > 0 ? 1 : 0;
  const { color } = budgetTone(spent, planned, pace);
  const showPace = pace !== undefined && planned > 0 && pace > 0 && pace < 1;
  return (
    <View style={{ height: height + 8, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <View style={{ width: `${used * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
      </View>
      {showPace ? <View style={[styles.tick, { left: `${pace * 100}%`, height: height + 8 }]} /> : null}
    </View>
  );
}

const styles = createStyles(() => ({
  track: { width: '100%', backgroundColor: Colors.track, overflow: 'hidden' },
  tick: { position: 'absolute', width: 3, marginLeft: -1.5, borderRadius: 2, backgroundColor: Colors.text1, opacity: 0.85 },
}));
