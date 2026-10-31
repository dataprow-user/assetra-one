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
