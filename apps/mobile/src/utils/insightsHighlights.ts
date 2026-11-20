import { daysBetween, resolvePeriod, analyse, bucketOf } from './insights';
import type { Dim, Filter, PeriodId } from './insights';
import { budgetMonths, monthlyFlow, byType, inWin, sum, sumN, isoAddDays, isoOf, isoParse } from './insightsViews';

// The findings feed. Works for any period (this month … all time); the user can hide any built-in finding and
// design their own ("custom insights") — both choices are stored in household.insightPrefs.

export type Highlight = { id: string; tone: 'up' | 'down' | 'info' | 'repeat' | 'calendar' | 'wallet'; title: string; text: string; txns?: any[]; txnsTitle?: string; custom?: boolean };

export type CustomInsight = {
  id: string; name: string;
  measure: 'expense' | 'income';
  dim: Dim | '';                       // what to look at, e.g. one category / account …
  values: { key: string; label: string }[];   // which ones of that dimension (empty = everything)
  query: string;                       // optional word to look for in notes / categories
  show: 'total' | 'compare' | 'share' | 'monthly' | 'count';
};
export type InsightPrefs = { hidden?: string[]; custom?: CustomInsight[] };
export const getPrefs = (state: any): Required<InsightPrefs> => ({ hidden: state?.household?.insightPrefs?.hidden || [], custom: state?.household?.insightPrefs?.custom || [] });

// Every built-in finding, so the user can switch each one on or off.
export const BUILT_IN: { id: string; label: string; desc: string }[] = [
  { id: 'pace', label: 'Spending so far & pace', desc: 'Total for the period, compared with the same point before' },
  { id: 'up', label: 'Category that went up', desc: 'The category with the biggest increase' },
  { id: 'down', label: 'Category that came down', desc: 'The category with the biggest decrease' },
  { id: 'save', label: 'Income kept', desc: 'How much of income was left after spending' },
  { id: 'repeat', label: 'Repeating payments', desc: 'Payments that recur every month (last 6 months)' },
  { id: 'fixed', label: 'Fixed vs flexible', desc: 'How much of spending is the same every month' },
  { id: 'loans', label: 'Loan share of income', desc: 'Payments linked to loans as a share of income' },
  { id: 'payday', label: 'First-week spending', desc: 'How much leaves right after the month starts' },
  { id: 'weekday', label: 'Busiest weekday', desc: 'The weekday carrying the most spending' },
  { id: 'odd', label: 'Bigger than usual', desc: 'Payments much larger than usual for their category' },
  { id: 'income', label: 'Income steadiness', desc: 'Average income and how much it varies' },
  { id: 'account', label: 'Main account', desc: 'The account most spending goes out of' },
  { id: 'ticket', label: 'Average payment size', desc: 'Typical payment against the period before' },
  { id: 'quiet', label: 'Days with no spending', desc: 'Count of quiet days' },
  { id: 'big', label: 'Biggest payment', desc: 'The single largest payment' },
];

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const dow = (iso: string) => (isoParse(iso.slice(0, 10)).getDay() + 6) % 7;
const DAY_NAMES = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

export function highlights(state: any, fmt: (n: any) => string, period: PeriodId = 'cycle', now: Date = new Date()): Highlight[] {
  const out: Highlight[] = [];
  const ex = byType(state, 'expense');
  const P = resolvePeriod(state, period, now);
  const curW = P.range, prevW = P.prev;
  const single = period === 'cycle' || period === 'prev';
  const when = period === 'cycle' ? 'this month' : period === 'prev' ? 'last month' : 'in this period';
  const before = single ? 'the month before' : 'the period before';
  const today = isoOf(now);
  const curEnd = curW.end < today ? curW.end : today;
  const elapsed = Math.max(1, daysBetween(curW.start, curEnd < curW.start ? curW.start : curEnd));
  const cycleLen = Math.max(elapsed, daysBetween(curW.start, curW.end));
  const ongoing = curW.end > today;
  const cur = ex.filter((t: any) => inWin(t, curW));
  const prev = prevW ? ex.filter((t: any) => inWin(t, prevW)) : [];
  const prevToDate = prevW ? prev.filter((t: any) => String(t.date).slice(0, 10) <= isoAddDays(prevW.start, elapsed - 1)) : [];
  const curTotal = sum(cur);
  if (!cur.length) return out;

  const curInc = byType(state, 'income').filter((t: any) => inWin(t, curW));
  const incTotal = sum(curInc);
  const wins = budgetMonths(state, 6, now);
  const six = ex.filter((t: any) => inWin(t, { start: wins[0].start, end: wins[wins.length - 1].end }));

  { // total & pace
    const prevSame = sum(prevToDate);
    const cmp = prevW && prevSame > 0 ? `${Math.abs(((curTotal - prevSame) / prevSame) * 100).toFixed(0)}% ${curTotal >= prevSame ? 'more' : 'less'} than ${ongoing ? 'the same point' : ''} ${before} (${fmt(prevSame)}). `.replace('  ', ' ') : '';
    const proj = ongoing ? `At this pace the month ends near ${fmt((curTotal / elapsed) * cycleLen)}.` : `That is about ${fmt(curTotal / elapsed)} a day.`;
    out.push({ id: 'pace', tone: curTotal >= prevSame ? 'up' : 'down', title: `${fmt(curTotal)} spent${ongoing ? ' so far' : ''}`, text: `${cmp}${proj}`, txns: cur, txnsTitle: `Spending ${when}` });
  }

  if (prevW) {
    const cats = new Map<string, { cur: number; prev: number }>();
    cur.forEach((t: any) => { const e = cats.get(t.category) || { cur: 0, prev: 0 }; e.cur += Number(t.amount); cats.set(t.category, e); });
    prevToDate.forEach((t: any) => { const e = cats.get(t.category) || { cur: 0, prev: 0 }; e.prev += Number(t.amount); cats.set(t.category, e); });
    const moves = [...cats.entries()].map(([c, v]) => ({ c, ...v, d: v.cur - v.prev })).filter((m) => Math.abs(m.d) >= 500 && m.prev > 0);
    const up = moves.filter((m) => m.d > 0).sort((a, b) => b.d - a.d)[0];
    const down = moves.filter((m) => m.d < 0).sort((a, b) => a.d - b.d)[0];
    if (up) out.push({ id: 'up', tone: 'up', title: `${up.c} is up ${fmt(up.d)}`, text: `${fmt(up.cur)} ${when} against ${fmt(up.prev)} ${ongoing ? 'at the same point ' : ''}${before} (${(((up.cur - up.prev) / up.prev) * 100).toFixed(0)}% more).`, txns: cur.filter((t: any) => t.category === up.c), txnsTitle: up.c });
    if (down) out.push({ id: 'down', tone: 'down', title: `${down.c} is down ${fmt(-down.d)}`, text: `${fmt(down.cur)} ${when} against ${fmt(down.prev)} ${ongoing ? 'at the same point ' : ''}${before}.`, txns: cur.filter((t: any) => t.category === down.c), txnsTitle: down.c });
  }

  if (incTotal > 0) {
    const saved = incTotal - curTotal;
    out.push({ id: 'save', tone: 'wallet', title: saved >= 0 ? `${((saved / incTotal) * 100).toFixed(0)}% of income kept` : `Spending is ${fmt(-saved)} above income`, text: `${fmt(incTotal)} came in and ${fmt(curTotal)} went out ${when}.`, txns: curInc, txnsTitle: `Income ${when}` });
  }

  // repeating payments: same label, steady amount, present in at least 3 of the last 6 months
  const groups = new Map<string, { label: string; byMonth: Map<number, number[]>; txns: any[] }>();
  ex.forEach((t: any) => {
    const wi = wins.findIndex((w) => inWin(t, w));
    const label = String(t.subcategory || t.notes || '').trim();
    if (wi < 0 || !label) return;
    const k = label.toLowerCase();
    const g = groups.get(k) || { label, byMonth: new Map(), txns: [] };
    g.byMonth.set(wi, [...(g.byMonth.get(wi) || []), Number(t.amount)]); g.txns.push(t); groups.set(k, g);
  });
  const rec = [...groups.values()].map((g) => {
    const monthly = [...g.byMonth.values()].map(sumN);
    const med = median(monthly);
    return { g, n: monthly.length, med, steady: monthly.every((m) => Math.abs(m - med) <= med * 0.15) };
  }).filter((r) => r.n >= 3 && r.steady && r.med >= 100).sort((a, b) => b.med - a.med);
  if (rec.length) {
    out.push({ id: 'repeat', tone: 'repeat', title: `${rec.length} payment${rec.length === 1 ? '' : 's'} repeat every month`, text: `${rec.slice(0, 3).map((r) => `${r.g.label} ≈ ${fmt(r.med)}`).join(' • ')}. Together about ${fmt(rec.reduce((s, r) => s + r.med, 0))} a month.`, txns: rec.flatMap((r) => r.g.txns).sort((a, b) => String(b.date).localeCompare(String(a.date))), txnsTitle: 'Repeating payments (6 months)' });
    const fixedKeys = new Set(rec.map((r) => r.g.label.toLowerCase()));
    const fixedTx = cur.filter((t: any) => fixedKeys.has(String(t.subcategory || t.notes || '').trim().toLowerCase()));
    const fixed = sum(fixedTx);
    if (fixed > 0 && curTotal > 0) out.push({ id: 'fixed', tone: 'info', title: `${((fixed / curTotal) * 100).toFixed(0)}% of spending is fixed`, text: `${fmt(fixed)} went to payments that repeat every month; ${fmt(curTotal - fixed)} was flexible spending you decide each time.`, txns: fixedTx, txnsTitle: 'Fixed payments' });
  }

  const loanPay = cur.filter((t: any) => t.liabilityId);
  if (loanPay.length && incTotal > 0) {
    const lp = sum(loanPay);
    out.push({ id: 'loans', tone: 'wallet', title: `${((lp / incTotal) * 100).toFixed(0)}% of income goes to loans`, text: `${fmt(lp)} across ${new Set(loanPay.map((t: any) => t.liabilityId)).size} loan(s) ${when}.`, txns: loanPay, txnsTitle: 'Loan payments' });
  }

  if (single && cur.length >= 10 && elapsed > 10) {
    const firstWeekEnd = isoAddDays(curW.start, 6);
    const fwTx = cur.filter((t: any) => String(t.date).slice(0, 10) <= firstWeekEnd);
    const fw = sum(fwTx);
    out.push({ id: 'payday', tone: 'calendar', title: `${((fw / Math.max(1, curTotal)) * 100).toFixed(0)}% spent in the first week`, text: `${fmt(fw)} of ${fmt(curTotal)} left within 7 days of the month starting${fw / curTotal > 0.5 ? ' — bills and EMIs usually cluster right after payday.' : '.'}`, txns: fwTx, txnsTitle: 'First week' });
  }

  const wdSet = cur.length >= 20 ? cur : six;
  if (wdSet.length >= 20) {
    const tot = new Array(7).fill(0);
    wdSet.forEach((t: any) => { tot[dow(String(t.date))] += Number(t.amount); });
    const i = tot.indexOf(Math.max(...tot));
    out.push({ id: 'weekday', tone: 'calendar', title: `${DAY_NAMES[i]} carry the most spending`, text: `${((tot[i] / Math.max(1, sumN(tot))) * 100).toFixed(0)}% of spending ${wdSet === cur ? when : 'in the last 6 months'} landed on that day.`, txns: wdSet.filter((t: any) => dow(String(t.date)) === i), txnsTitle: DAY_NAMES[i] });
  }

  const catAmts = new Map<string, number[]>();
  six.forEach((t: any) => catAmts.set(t.category, [...(catAmts.get(t.category) || []), Number(t.amount)]));
  const odd = cur.filter((t: any) => { const a = catAmts.get(t.category) || []; return a.length >= 5 && Number(t.amount) >= 3 * median(a) && Number(t.amount) >= 1000; })
    .sort((a: any, b: any) => Number(b.amount) - Number(a.amount));
  if (odd.length) out.push({ id: 'odd', tone: 'info', title: `${odd.length} payment${odd.length === 1 ? ' is' : 's are'} bigger than usual for ${odd.length === 1 ? 'its' : 'their'} category`, text: `For example ${odd[0].category}: ${fmt(odd[0].amount)} — about ${(Number(odd[0].amount) / median(catAmts.get(odd[0].category) || [1])).toFixed(1)}× its usual size.`, txns: odd, txnsTitle: 'Bigger than usual' });

  const flow = monthlyFlow(state, 6, now).filter((f) => f.income > 0);
  if (flow.length >= 3) {
    const avg = sumN(flow.map((f) => f.income)) / flow.length;
    const spread = Math.max(...flow.map((f) => f.income)) - Math.min(...flow.map((f) => f.income));
    const keptAvg = sumN(flow.map((f) => f.saved)) / flow.length;
    out.push({ id: 'income', tone: 'wallet', title: `Income averages ${fmt(avg)} a month`, text: `${spread / avg < 0.1 ? 'Very steady' : spread / avg < 0.3 ? 'Fairly steady' : 'Varies a lot'} over ${flow.length} months (range ${fmt(spread)}). On average ${keptAvg >= 0 ? fmt(keptAvg) + ' is kept' : fmt(-keptAvg) + ' more goes out than comes in'} each month.` });
  }

  const accTot = new Map<string, number>();
  cur.forEach((t: any) => accTot.set(t.account, (accTot.get(t.account) || 0) + Number(t.amount)));
  if (accTot.size > 1) {
    const [id, v] = [...accTot.entries()].sort((a, b) => b[1] - a[1])[0];
    const nm = (state.accounts || []).find((a: any) => a.id === id)?.name;
    if (nm) out.push({ id: 'account', tone: 'info', title: `${nm} carries most of the spending`, text: `${((v / curTotal) * 100).toFixed(0)}% (${fmt(v)}) of spending ${when} went out from it.`, txns: cur.filter((t: any) => t.account === id), txnsTitle: nm });
  }

  if (prevW && cur.length >= 5 && prev.length >= 5) {
    const a = curTotal / cur.length, b = sum(prev) / prev.length;
    out.push({ id: 'ticket', tone: a >= b ? 'up' : 'down', title: `Average payment ${fmt(a)}`, text: `${cur.length} payments ${when} against ${prev.length} ${before} (average then ${fmt(b)}).` });
  }

  const quiet = Math.max(0, elapsed - new Set(cur.map((t: any) => String(t.date).slice(0, 10))).size);
  if (quiet > 0) out.push({ id: 'quiet', tone: 'info', title: `${quiet} day${quiet === 1 ? '' : 's'} with no spending`, text: `Out of ${elapsed} days ${ongoing ? 'so far' : 'in the period'}.` });

  const big = cur.reduce((m: any, t: any) => (!m || Number(t.amount) > Number(m.amount) ? t : m), null);
  if (big) out.push({ id: 'big', tone: 'info', title: `Biggest payment: ${fmt(big.amount)}`, text: `${big.category}${big.subcategory ? ` · ${big.subcategory}` : ''} on ${String(big.date).slice(0, 10)}${big.notes ? ` — ${big.notes}` : ''}.`, txns: [big], txnsTitle: 'Biggest payment' });

  return out;
}

// A user-designed finding, evaluated for the chosen period.
export function customHighlight(state: any, fmt: (n: any) => string, c: CustomInsight, period: PeriodId, now: Date = new Date()): Highlight {
  const P = resolvePeriod(state, period, now);
  const filters: Filter[] = c.dim ? c.values.map((v) => ({ dim: c.dim as Dim, value: v.key, label: v.label, mode: 'in' as const })) : [];
  const run = (range: any, prev: any) => analyse(state, { range, prev, type: c.measure, dim: c.dim || 'category', filters, query: c.query || '' });
  const a = run(P.range, P.prev);
  const all = analyse(state, { range: P.range, prev: null, type: c.measure, dim: 'category', filters: [], query: '' });
  const what = c.values.length ? c.values.map((v) => v.label).join(', ') : c.query ? `“${c.query}”` : c.measure === 'income' ? 'all income' : 'all spending';
  const months = Math.max(1, daysBetween(P.range.start, P.range.end < isoOf(now) ? P.range.end : isoOf(now)) / 30.4);
  let title = `${c.name}: ${fmt(a.total)}`, text = `${what} • ${a.count} transaction${a.count === 1 ? '' : 's'}`;
  if (c.show === 'compare') {
    if (a.prevTotal && a.prevTotal > 0) { const d = ((a.total - a.prevTotal) / a.prevTotal) * 100; text = `${Math.abs(d).toFixed(0)}% ${d >= 0 ? 'more' : 'less'} than the period before (${fmt(a.prevTotal)}). ${what}.`; }
    else text = `Nothing to compare with in the period before. ${what}.`;
  } else if (c.show === 'share') {
    title = `${c.name}: ${all.total > 0 ? ((a.total / all.total) * 100).toFixed(0) : 0}%`; text = `${fmt(a.total)} of ${fmt(all.total)} ${c.measure === 'income' ? 'income' : 'spending'} — ${what}.`;
  } else if (c.show === 'monthly') {
    title = `${c.name}: ${fmt(a.total / months)} a month`; text = `${fmt(a.total)} in total — ${what}.`;
  } else if (c.show === 'count') {
    title = `${c.name}: ${a.count} payment${a.count === 1 ? '' : 's'}`; text = `${fmt(a.total)} in total — ${what}.`;
  }
  return { id: c.id, tone: c.measure === 'income' ? 'wallet' : 'info', title, text, txns: a.txns, txnsTitle: c.name, custom: true };
}

// The distinct values of a dimension in the user's own data (for the designer's pickers).
export function dimValues(state: any, dim: Dim, type: 'expense' | 'income'): { key: string; label: string }[] {
  const seen = new Map<string, string>();
  byType(state, type).forEach((t: any) => { const b = bucketOf(state, t, dim); if (b.key) seen.set(b.key, b.label); });
  return [...seen.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
}

// What the user actually sees: their own designed insights first, then the built-in ones they haven't hidden.
export function feed(state: any, fmt: (n: any) => string, period: PeriodId = 'cycle', now: Date = new Date()): Highlight[] {
  const prefs = getPrefs(state);
  const mine = prefs.custom.map((c) => customHighlight(state, fmt, c, period, now));
  return [...mine, ...highlights(state, fmt, period, now).filter((h) => !prefs.hidden.includes(h.id))];
}
