import { getBudgetCycle, currentBudgetMonth, parseYMD } from './budgetPeriod';
import { daysBetween } from './insights';
import type { Range } from './insights';

// Data behind the extra Insights lenses (Highlights, Trends, Calendar) and the Home card.
// Everything is derived from the user's own transactions — no names, categories or amounts are assumed.

const pad2 = (n: number) => String(n).padStart(2, '0');
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const isoParse = (s: string) => { const { year, month, day } = parseYMD(s); return new Date(year, month, day); };
export const isoAddDays = (s: string, n: number) => { const d = isoParse(s); d.setDate(d.getDate() + n); return isoOf(d); };
const shiftMonth = (ym: { year: number; month: number }, n: number) => { const t = ym.year * 12 + ym.month + n; return { year: Math.floor(t / 12), month: t % 12 }; };
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type MonthWindow = { year: number; month: number; label: string; start: string; end: string };

// The last `n` budget months (salary-cycle aware), oldest first. `offset` skips the most recent ones.
export function budgetMonths(state: any, n: number, now: Date = new Date(), offset = 0): MonthWindow[] {
  const cur = currentBudgetMonth(state, now);
  const out: MonthWindow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ym = shiftMonth(cur, -(i + offset));
    const c = getBudgetCycle(state, ym.year, ym.month);
    out.push({ ...ym, label: `${SHORT_MONTHS[ym.month]} ${String(ym.year).slice(2)}`, start: c.start, end: c.end });
  }
  return out;
}

export const inWin = (t: any, w: { start: string; end: string }) => { const d = String(t.date).slice(0, 10); return d >= w.start && d <= w.end; };
export const sum = (l: any[]) => l.reduce((s, t) => s + Number(t.amount || 0), 0);
export const sumN = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const byType = (state: any, type: 'expense' | 'income') => (state.transactions || []).filter((t: any) => t.type === type);

export type FlowRow = MonthWindow & { income: number; spent: number; saved: number; rate: number | null; expenseTxns: any[]; incomeTxns: any[] };
export function monthlyFlow(state: any, n: number, now: Date = new Date()): FlowRow[] {
  const ex = byType(state, 'expense'), inc = byType(state, 'income');
  return budgetMonths(state, n, now).map((w) => {
    const expenseTxns = ex.filter((t: any) => inWin(t, w)), incomeTxns = inc.filter((t: any) => inWin(t, w));
    const income = sum(incomeTxns), spent = sum(expenseTxns);
    return { ...w, income, spent, saved: income - spent, rate: income > 0 ? ((income - spent) / income) * 100 : null, expenseTxns, incomeTxns };
  });
}

// Spend per budget month, for all spending or one category — "track one thing over time".
export function categoryTrend(state: any, category: string | null, n: number, now: Date = new Date()) {
  const ex = byType(state, 'expense').filter((t: any) => !category || t.category === category);
  return budgetMonths(state, n, now).map((w) => { const txns = ex.filter((t: any) => inWin(t, w)); return { ...w, value: sum(txns), txns }; });
}

export function dailyTotals(state: any, range: Range, type: 'expense' | 'income') {
  const map = new Map<string, { total: number; txns: any[] }>();
  byType(state, type).forEach((t: any) => {
    const d = String(t.date).slice(0, 10);
    if (d < range.start || d > range.end) return;
    const e = map.get(d) || { total: 0, txns: [] }; e.total += Number(t.amount || 0); e.txns.push(t); map.set(d, e);
  });
  return map;
}

