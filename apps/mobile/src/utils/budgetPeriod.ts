// Budget-period helpers shared by the Dashboard and the Budget vs Spent screen.
//
// Problem this solves: many salaries for month N are credited in the last days
// of month N-1. Counting by credit date makes the current month look like it
// has no salary and inflates the previous month with two. So a "monthly
// salary" credit on/after the cutoff day is attributed to the NEXT month.
// Only salary income is shifted — expenses and all other income stay put.

export const DEFAULT_SALARY_CUTOFF_DAY = 20;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type YM = { year: number; month: number }; // month is 0-based

// Parses 'YYYY-MM-DD' (or a full ISO string) without timezone drift.
export function parseYMD(date: string): { year: number; month: number; day: number } {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number);
  return { year: y, month: (m || 1) - 1, day: d || 1 };
}

export const getSalaryCutoff = (state: any): number => {
  const n = Number(state?.household?.salaryCutoffDay);
  return n >= 1 && n <= 31 ? n : DEFAULT_SALARY_CUTOFF_DAY;
};

export function isSalaryIncome(t: any): boolean {
  if (t?.type !== 'income' || String(t.category || '').toLowerCase() !== 'salary') return false;
  const sub = String(t.subcategory || '').toLowerCase();
  return sub === '' || sub === 'monthly salary'; // bonus / incentive stay in their own month
}

// The budget month a transaction counts towards.
export function budgetMonthOf(t: any, cutoffDay: number): YM {
  const { year, month, day } = parseYMD(t.date);
  if (isSalaryIncome(t) && day >= cutoffDay) {
    return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  }
  return { year, month };
}

export const sameYM = (a: YM, b: YM) => a.year === b.year && a.month === b.month;

// ── Spending pace ──────────────────────────────────────────────────────────
// How far through a budget period we are, so spend can be judged against time
// ("you've used 70% of the budget but only 40% of the month").
export type Pace = {
  kind: 'current' | 'past' | 'future';
  elapsed: number;      // 0..1 share of the period that has passed
  daysElapsed: number;
  daysTotal: number;
  daysLeft: number;
};

export function periodPace(year: number, month: number | null, now: Date = new Date()): Pace {
  const start = month === null ? new Date(year, 0, 1) : new Date(year, month, 1);
  const end = month === null ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
  const daysTotal = Math.round((+end - +start) / 86400000);
  if (+now >= +end) return { kind: 'past', elapsed: 1, daysElapsed: daysTotal, daysTotal, daysLeft: 0 };
  if (+now < +start) return { kind: 'future', elapsed: 0, daysElapsed: 0, daysTotal, daysLeft: daysTotal };
  const daysElapsed = Math.floor((+new Date(now.getFullYear(), now.getMonth(), now.getDate()) - +start) / 86400000) + 1;
  return { kind: 'current', elapsed: daysElapsed / daysTotal, daysElapsed, daysTotal, daysLeft: daysTotal - daysElapsed + 1 };
}

// ── Salary-cycle budget months ─────────────────────────────────────────────
// A "budget month" follows the SALARY cycle, not the calendar: November's
// budget runs from the day the salary for November is credited (e.g. 28 Oct)
// to the day before the next one (27 Nov), so spending right after payday is
// counted against the month it was budgeted for. Falls back to the calendar
// month when there's no salary credit to anchor on, or when the user picks
// "Calendar month" in Settings (household.budgetCycle === 'calendar').
export type Cycle = {
  start: string;          // 'YYYY-MM-DD', inclusive
  end: string;            // 'YYYY-MM-DD', inclusive
  mode: 'salary' | 'calendar';
  anchored: boolean;      // true when start comes from a real salary credit
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromISO = (s: string) => { const { year, month, day } = parseYMD(s); return new Date(year, month, day); };
const addDays = (s: string, n: number) => { const d = fromISO(s); d.setDate(d.getDate() + n); return toISO(d); };
const addOneMonth = (s: string) => { const d = fromISO(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return toISO(d); };
const lastDayISO = (year: number, month: number) => toISO(new Date(year, month + 1, 0));

export const getBudgetCycleMode = (state: any): 'salary' | 'calendar' => (state?.household?.budgetCycle === 'calendar' ? 'calendar' : 'salary');

// Earliest salary credit that belongs to this budget month.
function salaryAnchor(txns: any[], cutoff: number, year: number, month: number): string | undefined {
  let best: string | undefined;
  for (const t of txns) {
    if (!isSalaryIncome(t)) continue;
    const ym = budgetMonthOf(t, cutoff);
    if (ym.year !== year || ym.month !== month) continue;
    const d = String(t.date).slice(0, 10);
    if (!best || d < best) best = d;
  }
  return best;
}

export function getBudgetCycle(state: any, year: number, month: number): Cycle {
  const calStart = `${year}-${pad2(month + 1)}-01`;
  const calEnd = lastDayISO(year, month);
  if (getBudgetCycleMode(state) === 'calendar') return { start: calStart, end: calEnd, mode: 'calendar', anchored: false };

  const txns: any[] = state?.transactions || [];
  const cutoff = getSalaryCutoff(state);
  const a = salaryAnchor(txns, cutoff, year, month);
  const ny = month === 11 ? year + 1 : year;
  const nm = month === 11 ? 0 : month + 1;
  const nextA = salaryAnchor(txns, cutoff, ny, nm);

  const start = a ?? calStart;
  const end = nextA ? addDays(nextA, -1) : a ? addDays(addOneMonth(a), -1) : calEnd;
  if (end < start) return { start: calStart, end: calEnd, mode: 'salary', anchored: false };
  return { start, end, mode: 'salary', anchored: !!a };
}

// The budget month "we are in" today: after payday the NEXT month's cycle has
// already begun (28 Oct → it's already November's budget month).
export function currentBudgetMonth(state: any, now: Date = new Date()): { year: number; month: number } {
  const today = toISO(now);
  const ny = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const nm = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const next = getBudgetCycle(state, ny, nm);
  if (next.anchored && next.start <= today) return { year: ny, month: nm };
  return { year: now.getFullYear(), month: now.getMonth() };
}

// Date window for a whole year of budget months (Jan cycle start → Dec cycle end).
export function getYearWindow(state: any, year: number): { start: string; end: string } {
  return { start: getBudgetCycle(state, year, 0).start, end: getBudgetCycle(state, year, 11).end };
}

export const inRange = (date: string, start: string, end: string) => { const d = String(date).slice(0, 10); return d >= start && d <= end; };

export function rangePace(start: string, end: string, now: Date = new Date()): Pace {
  const daysTotal = Math.round((+fromISO(end) - +fromISO(start)) / 86400000) + 1;
  const today = toISO(now);
  if (today > end) return { kind: 'past', elapsed: 1, daysElapsed: daysTotal, daysTotal, daysLeft: 0 };
  if (today < start) return { kind: 'future', elapsed: 0, daysElapsed: 0, daysTotal, daysLeft: daysTotal };
  const daysElapsed = Math.round((+fromISO(today) - +fromISO(start)) / 86400000) + 1;
  return { kind: 'current', elapsed: daysElapsed / daysTotal, daysElapsed, daysTotal, daysLeft: daysTotal - daysElapsed + 1 };
}

// "28 Oct – 27 Nov"
export function cycleRangeLabel(c: { start: string; end: string }): string {
  const f = (s: string) => fromISO(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${f(c.start)} – ${f(c.end)}`;
}
