import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './ui/AppText';
import { CalendarClock, Minus, Plus } from 'lucide-react-native';
import { Card } from './ui';
import { useApp } from '../context/AppContext';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../constants/theme';
import { MONTH_NAMES, getBudgetCycle, getBudgetCycleMode, currentBudgetMonth, cycleRangeLabel, getSalaryCutoff } from '../utils/budgetPeriod';

// Settings → how a "budget month" is defined. Salary cycle (default): the month
// starts on the day your salary is credited, so spending right after payday
// counts toward the month you budgeted it for. Calendar: plain 1st → month-end.
export default function BudgetCycleCard() {
  const { state, dispatch } = useApp();
  const mode = getBudgetCycleMode(state);
  const cutoff = getSalaryCutoff(state);
  const bm = currentBudgetMonth(state);
  const cycle = getBudgetCycle(state, bm.year, bm.month);
  const set = (payload: any) => dispatch({ type: 'UPDATE_HOUSEHOLD', payload });

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.titleRow}>
        <CalendarClock size={18} color={Colors.text2} />
        <Text style={styles.title}>Budget month</Text>
      </View>
      <Text style={styles.desc}>Choose when your budget month starts, so your spending lines up with the month you planned it for.</Text>

      <View style={styles.row}>
        {([['salary', 'Salary cycle', 'Starts on payday'], ['calendar', 'Calendar month', '1st to month-end']] as const).map(([k, label, hint]) => {
          const active = mode === k;
          return (
            <Pressable key={k} onPress={() => set({ budgetCycle: k })} style={[styles.opt, active && styles.optActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
              <Text style={[styles.optText, active && { color: Colors.accentLight }]}>{label}</Text>
              <Text style={styles.optHint}>{hint}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'salary' ? (
        <View style={styles.stepRow}>
          <Text style={styles.stepText}>A salary credited on or after day <Text style={{ fontWeight: '800', color: Colors.text1 }}>{cutoff}</Text> starts the next month's budget.</Text>
          <View style={styles.stepper}>
            <Pressable onPress={() => set({ salaryCutoffDay: Math.max(1, cutoff - 1) })} style={styles.stepBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel="Earlier day"><Minus size={16} color={Colors.text1} /></Pressable>
            <Text style={styles.stepValue}>{cutoff}</Text>
            <Pressable onPress={() => set({ salaryCutoffDay: Math.min(31, cutoff + 1) })} style={styles.stepBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel="Later day"><Plus size={16} color={Colors.text1} /></Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.preview}>
        <Text style={styles.previewKicker}>RIGHT NOW</Text>
        <Text style={styles.previewText}>
          {MONTH_NAMES[bm.month]} {bm.year} budget month = <Text style={{ fontWeight: '800' }}>{cycleRangeLabel(cycle)}</Text>
        </Text>
        {mode === 'salary' && !cycle.anchored ? (
          <Text style={styles.previewSub}>No salary credit found for this month yet, so it uses the calendar dates until one is recorded (category “Salary”, sub-category “Monthly Salary”).</Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = createStyles(() => ({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text1 },
  desc: { fontSize: FontSize.sm, color: Colors.text2 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  opt: { flex: 1, minHeight: 64, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panelHover, borderWidth: 1.5, borderColor: 'transparent', justifyContent: 'center', gap: 2 },
  optActive: { borderColor: Colors.accentLight, backgroundColor: Colors.accentGlow },
  optText: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text1 },
  optHint: { fontSize: FontSize.xs, color: Colors.text2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepText: { flex: 1, fontSize: FontSize.sm, color: Colors.text2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.panelHover, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 26, textAlign: 'center', color: Colors.text1, fontWeight: '800', fontSize: FontSize.lg },
  preview: { backgroundColor: Colors.panelHover, borderRadius: Radius.md, padding: Spacing.md, gap: 3 },
  previewKicker: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.8 },
  previewText: { color: Colors.text1, fontSize: FontSize.base },
  previewSub: { color: Colors.text2, fontSize: FontSize.sm },
}));
