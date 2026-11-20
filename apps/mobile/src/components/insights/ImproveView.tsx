import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/AppText';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import Card from '../ui/Card';
import Tap from '../ui/Tap';
import FilterChips from '../ui/FilterChips';
import { useTxnExplorer } from '../TxnExplorer';
import { Colors, FontSize, Spacing, Radius, createStyles } from '../../constants/theme';
import { wealth, payoff, futureValue, flexibleSpending, hasSchedule } from '../../utils/wealth';

const addMonths = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); };
const span = (m: number) => `${Math.floor(m / 12) ? Math.floor(m / 12) + ' yr ' : ''}${m % 12 ? (m % 12) + ' mo' : ''}`.trim() || '0 mo';

// "What could I do about it?" — what-if tools built on the user's own numbers: clear loans sooner, keep more,
// invest more. Every figure is an estimate from their records; nothing is advice about a specific product.
export default function ImproveView() {
  const { state, fmt } = useApp();
  const router = useRouter();
  const explorer = useTxnExplorer();
  const w = useMemo(() => wealth(state), [state]);
  const flex = useMemo(() => flexibleSpending(state), [state]);

  // loans
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extra, setExtra] = useState('2000');
  // keeping more
  const [target, setTarget] = useState('20');
  const [trim, setTrim] = useState('10');
  // investing
  const [step, setStep] = useState('5000');
  const [ret, setRet] = useState('10');
  const [years, setYears] = useState('10');

  const pl = w.loans.map((r) => ({ id: r.l.id, name: r.l.name, balance: r.balance, rate: r.rate, emi: hasSchedule(r) ? r.emi : 0 }));
  const informal = w.loans.filter((r) => !hasSchedule(r));
  const asIs = useMemo(() => payoff(pl.filter((l) => l.emi > 0), 0, strategy, false), [w, strategy]);
  const rolled = useMemo(() => payoff(pl, 0, strategy, true), [w, strategy]);
  const plan = useMemo(() => payoff(pl, Number(extra), strategy, true), [w, strategy, extra]);
  const planOther = useMemo(() => payoff(pl, Number(extra), strategy === 'avalanche' ? 'snowball' : 'avalanche', true), [w, strategy, extra]);
  const savedInt = rolled.interest - plan.interest;

  // keeping more
  const income = w.avgIncome, kept = w.avgKept;
  const needed = (Number(target) / 100) * income;
  const gap = Math.max(0, needed - kept);
  const trimPct = Number(trim) / 100;
  const freed = flex.slice(0, 6).map((f) => ({ ...f, free: f.monthly * trimPct }));
  const freedTotal = freed.reduce((s, f) => s + f.free, 0);

  // investing
  const now = Math.max(0, w.avgInvest);
  const add = Number(step);
  const fvNow = futureValue(now, Number(ret), Number(years)), fvMore = futureValue(now + add, Number(ret), Number(years));
  const contributed = (now + add) * Number(years) * 12;

  // checks
  const checks: { id: string; title: string; text: string; ok?: boolean }[] = [];
  if (w.emergencyMonths !== null) checks.push({ id: 'em', ok: w.emergencyMonths >= 3, title: `${w.emergencyMonths.toFixed(1)} months of spending in accounts`, text: `${fmt(w.liquid)} against about ${fmt(w.avgSpent)} spent a month. A cushion of 3–6 months is a common rule of thumb${w.emergencyMonths < 3 ? ` — that would be roughly ${fmt(w.avgSpent * 3 - w.liquid)} more for 3 months.` : '.'}` });
  if (w.avgIncome > 0 && w.emiTotal > 0) { const p = (w.emiTotal / w.avgIncome) * 100; checks.push({ id: 'emi', ok: p <= 40, title: `${p.toFixed(0)}% of income goes to EMIs`, text: `${fmt(w.emiTotal)} of ${fmt(w.avgIncome)} a month. Lenders usually like this under about 40%${p > 40 ? '; clearing the smallest loans first frees EMIs fastest.' : '.'}` }); }
  if (w.byAssetType.length && w.current > 0) { const t = w.byAssetType[0]; const p = (t.value / w.current) * 100; checks.push({ id: 'mix', ok: p < 60, title: `${p.toFixed(0)}% of assets are in ${t.label}`, text: p >= 60 ? 'One type carries most of the value. Spreading new money across other types makes the total less dependent on one market.' : 'Your assets are reasonably spread across types.' }); }
  if (w.avgIncome > 0 && w.yearlyPremium > 0) checks.push({ id: 'ins', title: `Insurance costs ${fmt(w.yearlyPremium)} a year`, text: `About ${((w.yearlyPremium / (w.avgIncome * 12)) * 100).toFixed(1)}% of yearly income${w.overdue.length ? `. ${w.overdue.length} polic${w.overdue.length === 1 ? 'y shows' : 'ies show'} a missed due date — record the premium or fix the date.` : '.'}` });
  const highRate = w.loans.filter((r) => r.rate >= 12 && r.balance > 0).sort((a, b) => b.rate - a.rate);
  if (highRate.length) checks.push({ id: 'rate', title: `${highRate.length} loan${highRate.length === 1 ? '' : 's'} at 12% or more`, text: `${highRate.slice(0, 2).map((r) => `${r.l.name} (${r.rate}%)`).join(', ')}. Interest on these is ${fmt(highRate.reduce((s, r) => s + r.monthlyInterest, 0))} a month — asking the lender for a lower rate or moving the balance to a cheaper loan are both worth a call.` });
  if (informal.length) checks.push({ id: 'inf', title: `${informal.length} loan${informal.length === 1 ? '' : 's'} without a repayment schedule`, text: `${fmt(informal.reduce((s, r) => s + r.balance, 0))} owed to people or lenders with no fixed EMI. Setting a monthly amount for these makes them show up in the payoff plan above.` });

  return (
    <>
      {/* ───── loans ───── */}
      <Text style={styles.heading}>Clear loans sooner</Text>
      {w.loans.length === 0 ? <Card><Text style={styles.empty}>No open loans — nothing to pay down.</Text></Card> : (
        <>
          <Card style={{ gap: Spacing.md }}>
            <Text style={styles.label}>Pay the extra on the…</Text>
            <FilterChips options={[{ key: 'avalanche', label: 'Highest interest first' }, { key: 'snowball', label: 'Smallest balance first' }]} value={strategy} onChange={(k) => setStrategy(k as any)} />
            <Text style={styles.label}>Extra each month</Text>
            <FilterChips options={['0', '1000', '2000', '5000', '10000', '25000'].map((k) => ({ key: k, label: k === '0' ? 'None' : fmt(Number(k)) }))} value={extra} onChange={setExtra} />
          </Card>

          <View style={styles.cmp}>
            <View style={styles.cmpCell}><Text style={styles.cmpLbl}>As things are</Text><Text style={styles.cmpVal}>{asIs.months ? span(asIs.months) : '—'}</Text><Text style={styles.cmpSub}>{asIs.months ? `scheduled loans end ${addMonths(asIs.months)}` : 'no scheduled loans'}</Text></View>
            <View style={styles.cmpCell}><Text style={styles.cmpLbl}>Freed EMIs roll on</Text><Text style={styles.cmpVal}>{rolled.neverEnds ? 'not ending' : span(rolled.months)}</Text><Text style={styles.cmpSub}>{rolled.neverEnds ? 'some loans have no EMI' : `all clear ${addMonths(rolled.months)}`}</Text></View>
            <View style={[styles.cmpCell, styles.cmpBest]}><Text style={styles.cmpLbl}>+ {fmt(Number(extra))} extra</Text><Text style={[styles.cmpVal, { color: Colors.green }]}>{plan.neverEnds ? 'not ending' : span(plan.months)}</Text><Text style={styles.cmpSub}>{plan.neverEnds ? '' : `all clear ${addMonths(plan.months)}`}</Text></View>
          </View>
          <Text style={styles.note}>
            {savedInt > 100 ? `That extra ${fmt(Number(extra))} saves about ${fmt(savedInt)} in interest and ${rolled.months - plan.months} month${rolled.months - plan.months === 1 ? '' : 's'}. ` : ''}
            Every time a loan ends, its EMI moves to the next one instead of going back into spending.
            {plan.interest !== planOther.interest ? ` ${strategy === 'avalanche' ? 'Smallest-balance-first' : 'Highest-interest-first'} would cost ${fmt(Math.abs(planOther.interest - plan.interest))} ${planOther.interest > plan.interest ? 'more' : 'less'} in interest.` : ''}
          </Text>

          <Text style={styles.label}>Payoff order with {fmt(Number(extra))} extra</Text>
          <Card style={{ padding: 0 }}>
            {plan.order.map((o, i) => (
              <Tap key={o.name} onPress={() => router.push('/(app)/liabilities' as any)} accessibilityLabel={`${i + 1}. ${o.name}, cleared in ${span(o.month)}`}>
                <View style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{i + 1}</Text></View>
                  <Text style={styles.rowTitle} numberOfLines={2}>{o.name}</Text>
                  <Text style={styles.rowMeta}>{addMonths(o.month)}</Text>
                </View>
              </Tap>
            ))}
          </Card>
        </>
      )}

      {/* ───── keep more ───── */}
      <Text style={styles.heading}>Keep more each month</Text>
      {income <= 0 ? <Card><Text style={styles.empty}>Record some income to see savings options.</Text></Card> : (
        <>
          <Card style={{ gap: Spacing.md }}>
            <Text style={styles.label}>Aim to keep this much of income</Text>
            <FilterChips options={['10', '20', '30', '40'].map((k) => ({ key: k, label: k + '%' }))} value={target} onChange={setTarget} />
            <Text style={styles.big}>{kept >= needed ? 'Already there' : `${fmt(gap)} more a month`}</Text>
            <Text style={styles.note}>You keep about {fmt(Math.max(0, kept))} ({((kept / income) * 100).toFixed(0)}%) of {fmt(income)} income on average. {Number(target)}% would be {fmt(needed)}.</Text>
          </Card>
          <Card style={{ gap: Spacing.sm }}>
            <Text style={styles.label}>Where the flexible spending is (monthly average, excluding loans, assets & insurance)</Text>
            <FilterChips options={['5', '10', '15', '20'].map((k) => ({ key: k, label: `trim ${k}%` }))} value={trim} onChange={setTrim} />
            {freed.map((f) => (
              <Tap key={f.category} onPress={() => explorer.show(f.category, f.txns, `${fmt(f.total)} over the last 6 budget months`)} accessibilityLabel={`${f.category}, ${fmt(f.monthly)} a month`}>
                <View style={styles.flexRow}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{f.category}</Text>
                  <Text style={styles.rowMeta}>{fmt(f.monthly)}/mo</Text>
                  <Text style={[styles.rowTitle, { color: Colors.green }]}>+{fmt(f.free)}</Text>
                </View>
              </Tap>
            ))}
            <Text style={styles.note}>Trimming these by {trim}% would free about {fmt(freedTotal)} a month{gap > 0 ? ` — ${freedTotal >= gap ? 'enough' : Math.round((freedTotal / gap) * 100) + '% of what is needed'} for a ${target}% goal.` : '.'} Some of this is essential; it's just where the room is.</Text>
          </Card>
        </>
      )}

      {/* ───── invest ───── */}
      <Text style={styles.heading}>Grow your investments</Text>
      <Card style={{ gap: Spacing.md }}>
        <Text style={styles.label}>Add each month</Text>
        <FilterChips options={['1000', '2000', '5000', '10000'].map((k) => ({ key: k, label: fmt(Number(k)) }))} value={step} onChange={setStep} />
        <Text style={styles.label}>Yearly return you assume</Text>
        <FilterChips options={['6', '8', '10', '12'].map((k) => ({ key: k, label: k + '%' }))} value={ret} onChange={setRet} />
        <Text style={styles.label}>For</Text>
        <FilterChips options={['5', '10', '15', '20'].map((k) => ({ key: k, label: k + ' years' }))} value={years} onChange={setYears} />
        <View style={styles.cmp}>
          <View style={styles.cmpCell}><Text style={styles.cmpLbl}>Now: {fmt(now)}/mo</Text><Text style={styles.cmpVal}>{fmt(fvNow)}</Text></View>
          <View style={[styles.cmpCell, styles.cmpBest]}><Text style={styles.cmpLbl}>+{fmt(add)}: {fmt(now + add)}/mo</Text><Text style={[styles.cmpVal, { color: Colors.green }]}>{fmt(fvMore)}</Text></View>
        </View>
        <Text style={styles.note}>The extra {fmt(add)} a month adds about {fmt(fvMore - fvNow)} after {years} years, of which {fmt(add * Number(years) * 12)} is your own money and {fmt(Math.max(0, fvMore - fvNow - add * Number(years) * 12))} is growth at the assumed {ret}%. Returns are not guaranteed — this is arithmetic, not a forecast.</Text>
      </Card>

      {/* ───── checks ───── */}
      {checks.length ? <Text style={styles.heading}>Quick checks</Text> : null}
      {checks.map((c) => (
        <Card key={c.id} style={styles.check}>
          <View style={[styles.dotBig, { backgroundColor: c.ok === undefined ? Colors.text3 : c.ok ? Colors.green : Colors.accent2 }]} />
          <View style={{ flex: 1, gap: 3 }}><Text style={styles.rowTitle}>{c.title}</Text><Text style={styles.note}>{c.text}</Text></View>
        </Card>
      ))}
      {explorer.node}
    </>
  );
}

const styles = createStyles(() => ({
  heading: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md, marginTop: Spacing.sm },
  empty: { color: Colors.text2, textAlign: 'center', paddingVertical: Spacing.md, fontSize: FontSize.base },
  label: { color: Colors.text2, fontSize: FontSize.sm, fontWeight: '700' },
  note: { color: Colors.text2, fontSize: FontSize.sm, lineHeight: 19 },
  big: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.xl },
  cmp: { flexDirection: 'row', gap: Spacing.sm },
  cmpCell: { flex: 1, backgroundColor: Colors.panel, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: 2 },
  cmpBest: { borderColor: Colors.green + '66', backgroundColor: Colors.green + '12' },
  cmpLbl: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '700' },
  cmpVal: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.md },
  cmpSub: { color: Colors.text2, fontSize: FontSize.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowTitle: { color: Colors.text1, fontWeight: '800', fontSize: FontSize.base, flex: 1 },
  rowMeta: { color: Colors.text2, fontSize: FontSize.xs, fontWeight: '600' },
  badge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: Colors.accentLight, fontWeight: '800', fontSize: FontSize.xs },
  flexRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 36 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  dotBig: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
}));
