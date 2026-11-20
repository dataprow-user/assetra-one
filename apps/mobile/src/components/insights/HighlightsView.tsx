import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, TextInput } from '../ui/AppText';
import { TrendingUp, TrendingDown, Repeat, CalendarDays, Wallet, Lightbulb, ChevronRight, SlidersHorizontal, Plus, Pencil, Trash2, Check } from 'lucide-react-native';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import Tap from '../ui/Tap';
import Sheet from '../ui/Sheet';
import Button from '../ui/Button';
import FilterChips from '../ui/FilterChips';
import { useTxnExplorer } from '../TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { PERIODS, PeriodId, Dim, dimLabel } from '../../utils/insights';
import { feed, Highlight, BUILT_IN, CustomInsight, getPrefs, dimValues } from '../../utils/insightsHighlights';

export const TONE: Record<Highlight['tone'], { Icon: any; color: string }> = {
  up: { Icon: TrendingUp, color: Colors.accent2 },
  down: { Icon: TrendingDown, color: Colors.green },
  repeat: { Icon: Repeat, color: Colors.accentLight },
  calendar: { Icon: CalendarDays, color: Colors.blue },
  wallet: { Icon: Wallet, color: Colors.green },
  info: { Icon: Lightbulb, color: Colors.text2 },
};

const BUILDER_DIMS: Dim[] = ['category', 'subcategory', 'group', 'account', 'event'];
const SHOW: { key: CustomInsight['show']; label: string; hint: string }[] = [
  { key: 'total', label: 'Total', hint: 'How much in the period' },
  { key: 'compare', label: 'Compare', hint: 'Against the period before' },
  { key: 'share', label: 'Share', hint: '% of all spending / income' },
  { key: 'monthly', label: 'Per month', hint: 'Average a month' },
  { key: 'count', label: 'Count', hint: 'Number of payments' },
];
const blank = (): CustomInsight => ({ id: '', name: '', measure: 'expense', dim: 'category', values: [], query: '', show: 'total' });

// A feed of plain-language findings about the user's own data, for any period. The user decides which built-in
// findings to show and can design their own (what to watch, over which period, and how to show it).
export default function HighlightsView() {
  const { state, dispatch, fmt, uid } = useApp();
  const explorer = useTxnExplorer();
  const [period, setPeriod] = useState<PeriodId>('cycle');
  const [designing, setDesigning] = useState(false);
  const [edit, setEdit] = useState<CustomInsight | null>(null);
  const prefs = getPrefs(state);
  const list = useMemo(() => feed(state, fmt, period), [state, fmt, period]);

  const save = (patch: { hidden?: string[]; custom?: CustomInsight[] }) =>
    dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { insightPrefs: { hidden: prefs.hidden, custom: prefs.custom, ...patch } } });
  const toggle = (id: string) => save({ hidden: prefs.hidden.includes(id) ? prefs.hidden.filter((x) => x !== id) : [...prefs.hidden, id] });
  const upsert = (c: CustomInsight) => {
    save({ custom: c.id && prefs.custom.some((x) => x.id === c.id) ? prefs.custom.map((x) => (x.id === c.id ? c : x)) : [...prefs.custom, { ...c, id: uid() }] });
    setEdit(null);
  };
  const remove = (id: string) => save({ custom: prefs.custom.filter((x) => x.id !== id) });

  return (
    <>
      <FilterChips options={PERIODS.map((x) => ({ key: x.key, label: x.label }))} value={period} onChange={(k) => setPeriod(k as PeriodId)} />
      <View style={styles.leadRow}>
        <Text style={styles.lead}>{list.length} finding{list.length === 1 ? '' : 's'} • tap one to see the transactions</Text>
        <Pressable onPress={() => setDesigning(true)} style={styles.design} accessibilityRole="button" accessibilityLabel="Design your highlights">
          <SlidersHorizontal size={14} color={Colors.accentLight} /><Text style={styles.designText}>Design</Text>
        </Pressable>
      </View>

      {list.length === 0 ? (
        <Card><Text style={styles.empty}>Nothing to show for this period yet. Pick another period, switch findings back on in Design, or add a few transactions.</Text></Card>
      ) : null}
      {list.map((h) => {
        const { Icon, color } = TONE[h.tone];
        const tappable = !!h.txns?.length;
        const body = (
          <Card style={[styles.card, h.custom && { borderColor: Colors.accentLight + '66' }]}>
            <View style={[styles.icon, { backgroundColor: color + '1f' }]}><Icon size={18} color={color} /></View>
            <View style={{ flex: 1, gap: 3 }}>
              {h.custom ? <Text style={styles.mine}>YOURS</Text> : null}
              <Text style={styles.title}>{h.title}</Text>
              <Text style={styles.text}>{h.text}</Text>
            </View>
            {tappable ? <ChevronRight size={16} color={Colors.text3} /> : null}
          </Card>
        );
        return tappable
          ? <Tap key={h.id} onPress={() => explorer.show(h.txnsTitle || h.title, h.txns!, `${h.txns!.length} transaction${h.txns!.length === 1 ? '' : 's'}`)} accessibilityLabel={`${h.title}. ${h.text}. Tap to see transactions`}>{body}</Tap>
          : <View key={h.id}>{body}</View>;
      })}

      <Sheet visible={designing && !edit} title="Design your highlights" subtitle="Choose what appears, or build your own" onClose={() => setDesigning(false)}
        footer={<Button title="Create your own" icon={<Plus size={16} color="#fff" />} onPress={() => setEdit(blank())} style={{ flex: 1 }} />}>
        {prefs.custom.length > 0 ? <Text style={styles.sec}>Yours</Text> : null}
        {prefs.custom.map((c) => (
          <View key={c.id} style={styles.drow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dtitle}>{c.name}</Text>
              <Text style={styles.dmeta}>{c.measure === 'income' ? 'Income' : 'Spending'}{c.values.length ? ` • ${c.values.map((v) => v.label).join(', ')}` : ''}{c.query ? ` • “${c.query}”` : ''} • {SHOW.find((s) => s.key === c.show)?.label}</Text>
            </View>
            <Pressable onPress={() => setEdit(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${c.name}`}><Pencil size={17} color={Colors.text2} /></Pressable>
            <Pressable onPress={() => remove(c.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${c.name}`}><Trash2 size={17} color={Colors.text2} /></Pressable>
          </View>
        ))}
        <Text style={styles.sec}>Built-in findings</Text>
        {BUILT_IN.map((b) => {
          const on = !prefs.hidden.includes(b.id);
          return (
            <Pressable key={b.id} onPress={() => toggle(b.id)} style={styles.drow} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={b.label}>
              <View style={{ flex: 1 }}><Text style={styles.dtitle}>{b.label}</Text><Text style={styles.dmeta}>{b.desc}</Text></View>
              <View style={[styles.check, on && styles.checkOn]}>{on ? <Check size={14} color="#fff" /> : null}</View>
            </Pressable>
          );
        })}
      </Sheet>

      {edit ? <Designer value={edit} onClose={() => setEdit(null)} onSave={upsert} /> : null}
      {explorer.node}
    </>
  );
}

function Designer({ value, onClose, onSave }: { value: CustomInsight; onClose: () => void; onSave: (c: CustomInsight) => void }) {
  const { state } = useApp();
  const [c, setC] = useState<CustomInsight>(value);
  const options = useMemo(() => (c.dim ? dimValues(state, c.dim as Dim, c.measure) : []), [state, c.dim, c.measure]);
  const has = (k: string) => c.values.some((v) => v.key === k);
  const flip = (o: { key: string; label: string }) => setC((x) => ({ ...x, values: has(o.key) ? x.values.filter((v) => v.key !== o.key) : [...x.values, o] }));
  const ok = c.name.trim().length > 0;

  return (
    <Sheet visible title={value.id ? 'Edit highlight' : 'Create your own'} subtitle="Pick what to watch and how to show it" onClose={onClose}
      footer={<>
        <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Save" disabled={!ok} onPress={() => onSave({ ...c, name: c.name.trim() })} style={{ flex: 1 }} />
      </>}>
      <Text style={styles.sec}>Name</Text>
      <TextInput value={c.name} onChangeText={(v) => setC((x) => ({ ...x, name: v }))} placeholder="e.g. Eating out, Fuel, Family spends" placeholderTextColor={Colors.text3} maxLength={40} style={styles.input} />

      <Text style={styles.sec}>Watch</Text>
      <FilterChips options={[{ key: 'expense', label: 'Spending' }, { key: 'income', label: 'Income' }]} value={c.measure} onChange={(k) => setC((x) => ({ ...x, measure: k as any, values: [] }))} />

      <Text style={styles.sec}>By</Text>
      <FilterChips options={[{ key: '', label: 'Everything' }, ...BUILDER_DIMS.map((d) => ({ key: d, label: dimLabel(d) }))]} value={c.dim} onChange={(k) => setC((x) => ({ ...x, dim: k as any, values: [] }))} />
      {c.dim ? (
        <>
          <Text style={styles.dmeta}>Tap one or more {dimLabel(c.dim as Dim).toLowerCase()} values (none selected = all of them):</Text>
          <View style={styles.wrap}>
            {options.length === 0 ? <Text style={styles.dmeta}>Nothing recorded yet for this.</Text> : options.map((o) => (
              <Pressable key={o.key} onPress={() => flip(o)} style={[styles.pick, has(o.key) && styles.pickOn]} accessibilityRole="button" accessibilityState={{ selected: has(o.key) }}>
                <Text style={[styles.pickText, has(o.key) && { color: '#fff' }]} numberOfLines={1}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sec}>Containing the word (optional)</Text>
      <TextInput value={c.query} onChangeText={(v) => setC((x) => ({ ...x, query: v }))} placeholder="Looks in notes, categories and groups" placeholderTextColor={Colors.text3} maxLength={40} style={styles.input} />

      <Text style={styles.sec}>Show me</Text>
      <FilterChips options={SHOW.map((s) => ({ key: s.key, label: s.label }))} value={c.show} onChange={(k) => setC((x) => ({ ...x, show: k as any }))} />
      <Text style={styles.dmeta}>{SHOW.find((s) => s.key === c.show)?.hint}. It follows whichever period you pick on the Highlights page.</Text>
    </Sheet>
  );
}

const styles = createStyles(() => ({
  leadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  lead: { flex: 1, color: Colors.text2, fontSize: FontSize.sm },
  design: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.accentGlow },
  designText: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.sm },
  empty: { color: Colors.text2, textAlign: 'center', paddingVertical: Spacing.lg, fontSize: FontSize.base },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  icon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  mine: { color: Colors.accentLight, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base },
  text: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 19 },
  sec: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base, marginTop: Spacing.sm },
  drow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.panelHover },
  dtitle: { color: Colors.text1, fontWeight: '700', fontSize: FontSize.base },
  dmeta: { color: Colors.text2, fontSize: FontSize.sm },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  input: { minHeight: 46, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel, color: Colors.text1, paddingHorizontal: Spacing.md, fontSize: FontSize.base },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pick: { maxWidth: '100%', minHeight: 36, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: Colors.panelHover, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  pickOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pickText: { color: Colors.text2, fontWeight: '700', fontSize: FontSize.sm },
}));
