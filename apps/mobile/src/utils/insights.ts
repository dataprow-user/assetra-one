import { getBudgetCycle, currentBudgetMonth, parseYMD, MONTH_NAMES } from './budgetPeriod';

// Pure maths behind the Insights screen: pick a period, slice transactions by any combination of
// filters, and group the result by any dimension. Nothing here knows a category or account name —
// everything is read from the user's own data.

export type Dim = 'category' | 'subcategory' | 'group' | 'account' | 'event' | 'month' | 'weekday';
export const DIMS: { key: Dim; label: string; time?: boolean }[] = [
  { key: 'category', label: 'Category' },
  { key: 'subcategory', label: 'Sub-category' },
  { key: 'group', label: 'Group' },
  { key: 'account', label: 'Account' },
  { key: 'event', label: 'Event' },
  { key: 'month', label: 'Month', time: true },
  { key: 'weekday', label: 'Weekday', time: true },
];
export const dimLabel = (d: Dim) => DIMS.find((x) => x.key === d)?.label || d;
export const isTimeDim = (d: Dim) => !!DIMS.find((x) => x.key === d)?.time;

export type Filter = { dim: Dim; value: string; label: string; mode: 'in' | 'out' };
export type Range = { start: string; end: string };
export type PeriodId = 'cycle' | 'prev' | '3m' | '6m' | '12m' | 'ytd' | 'all';
export const PERIODS: { key: PeriodId; label: string }[] = [
  { key: 'cycle', label: 'This month' }, { key: 'prev', label: 'Last month' }, { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' }, { key: '12m', label: '12 months' }, { key: 'ytd', label: 'This year' }, { key: 'all', label: 'All time' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromISO = (s: string) => { const { year, month, day } = parseYMD(s); return new Date(year, month, day); };
const addDays = (s: string, n: number) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };
export const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000) + 1;
const shiftMonth = (ym: { year: number; month: number }, n: number) => { const t = ym.year * 12 + ym.month + n; return { year: Math.floor(t / 12), month: t % 12 }; };

// A period and the one right before it (same length) so every number can be compared.
export function resolvePeriod(state: any, id: PeriodId, now: Date = new Date()): { range: Range; prev: Range | null; label: string } {
  const cur = currentBudgetMonth(state, now);
  const cyc = (ym: { year: number; month: number }) => getBudgetCycle(state, ym.year, ym.month);
  const span = (n: number, offset = 0) => {
    const last = shiftMonth(cur, -offset), first = shiftMonth(last, -(n - 1));
    return { start: cyc(first).start, end: cyc(last).end };
  };
  const today = toISO(now);
  const label = (r: Range) => `${r.start} → ${r.end}`;
  switch (id) {
    case 'cycle': { const range = span(1); return { range, prev: span(1, 1), label: `${MONTH_NAMES[cur.month]} ${cur.year}` }; }
    case 'prev': { const range = span(1, 1); const p = shiftMonth(cur, -1); return { range, prev: span(1, 2), label: `${MONTH_NAMES[p.month]} ${p.year}` }; }
    case '3m': case '6m': case '12m': {
      const n = id === '3m' ? 3 : id === '6m' ? 6 : 12; const range = span(n);
      return { range, prev: span(n, n), label: `Last ${n} months` };
    }
    case 'ytd': {
      const range = { start: `${now.getFullYear()}-01-01`, end: today };
      const len = daysBetween(range.start, range.end);
      return { range, prev: { start: addDays(range.start, -len), end: addDays(range.start, -1) }, label: `${now.getFullYear()} so far` };
    }
    default: {
      const dates = (state.transactions || []).map((t: any) => String(t.date).slice(0, 10)).filter(Boolean).sort();
      const range = { start: dates[0] || today, end: dates[dates.length - 1] || today };
      return { range, prev: null, label: dates.length ? label(range) : 'All time' };
    }
  }
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The bucket a transaction falls into for a dimension: a stable key, a display label and a sort order (time dims).
export function bucketOf(state: any, t: any, dim: Dim): { key: string; label: string; order: number } {
  switch (dim) {
    case 'category': return { key: t.category || '', label: t.category || 'Uncategorised', order: 0 };
    case 'subcategory': return { key: t.subcategory || '', label: t.subcategory || `${t.category || 'No category'} (no sub-category)`, order: 0 };
    case 'group': return { key: t.group || '', label: t.group || 'No group', order: 0 };
    case 'account': { const a = (state.accounts || []).find((x: any) => x.id === t.account); return { key: t.account || '', label: a?.name || 'Unknown account', order: 0 }; }
    case 'event': { const e = (state.events || []).find((x: any) => x.id === t.eventId); return { key: t.eventId || '', label: e?.name || 'No event', order: 0 }; }
    case 'month': { const { year, month } = parseYMD(String(t.date)); return { key: `${year}-${pad2(month + 1)}`, label: `${SHORT_MONTHS[month]} ${String(year).slice(2)}`, order: year * 12 + month }; }
    default: { const dow = (fromISO(String(t.date).slice(0, 10)).getDay() + 6) % 7; return { key: String(dow), label: WEEKDAYS[dow], order: dow }; }
  }
}

export type Row = { key: string; label: string; value: number; count: number; txns: any[]; prev: number; order: number };
export type Analysis = { txns: any[]; rows: Row[]; total: number; count: number; biggest: any | null; days: number; prevTotal: number | null };

function slice(state: any, range: Range, type: 'expense' | 'income', filters: Filter[], query: string): any[] {
  const q = query.trim().toLowerCase();
  return (state.transactions || []).filter((t: any) => {
    if (t.type !== type) return false;
    const d = String(t.date).slice(0, 10);
    if (d < range.start || d > range.end) return false;
    // several "only" values of one dimension mean "any of them"; different dimensions all have to match
    const ins = new Map<string, boolean>();
    for (const f of filters) {
      const hit = bucketOf(state, t, f.dim).key === f.value;
      if (f.mode === 'out') { if (hit) return false; } else ins.set(f.dim, ins.get(f.dim) || hit);
    }
    for (const ok of ins.values()) if (!ok) return false;
    if (q && ![t.category, t.subcategory, t.notes, t.group].some((x) => String(x || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

export function analyse(state: any, o: { range: Range; prev: Range | null; type: 'expense' | 'income'; dim: Dim; filters: Filter[]; query: string }): Analysis {
  const txns = slice(state, o.range, o.type, o.filters, o.query);
  const prevTxns = o.prev ? slice(state, o.prev, o.type, o.filters, o.query) : null;
  const rows = new Map<string, Row>();
  txns.forEach((t) => {
    const b = bucketOf(state, t, o.dim);
    const r = rows.get(b.key) || { key: b.key, label: b.label, value: 0, count: 0, txns: [], prev: 0, order: b.order };
    r.value += Number(t.amount || 0); r.count += 1; r.txns.push(t); rows.set(b.key, r);
  });
  prevTxns?.forEach((t) => { const r = rows.get(bucketOf(state, t, o.dim).key); if (r) r.prev += Number(t.amount || 0); });
  const list = [...rows.values()];
  list.forEach((r) => r.txns.sort((a, b) => String(b.date).localeCompare(String(a.date))));
  list.sort(isTimeDim(o.dim) ? (a, b) => a.order - b.order : (a, b) => b.value - a.value);
  const total = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const biggest = txns.reduce((m: any, t) => (!m || Number(t.amount) > Number(m.amount) ? t : m), null);
  const end = o.range.end < toISO(new Date()) ? o.range.end : toISO(new Date());
  return {
    txns, rows: list, total, count: txns.length, biggest,
    days: Math.max(1, daysBetween(o.range.start, end < o.range.start ? o.range.start : end)),
    prevTotal: prevTxns ? prevTxns.reduce((s, t) => s + Number(t.amount || 0), 0) : null,
  };
}

// After narrowing on a dimension, the most useful next breakdown.
export const nextDim = (d: Dim): Dim => (d === 'category' ? 'subcategory' : d === 'subcategory' ? 'month' : d === 'month' ? 'category' : d === 'weekday' ? 'category' : 'category');
