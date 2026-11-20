import { assetStatus, cycleMonths, policyStatus, categoriesTracking } from './entities';
import { loanStatus } from './loans';
import { monthlyFlow, budgetMonths, byType, inWin, sum, sumN, isoOf } from './insightsViews';

// Net-worth side of the picture: assets & investments, loans, liquid money — plus the what-if maths behind the
// "Improve" view. Everything is read from the user's own records; nothing assumes a particular asset or loan.

export type AssetRow = { a: any; st: ReturnType<typeof assetStatus>; typeLabel: string; color: string };
export type LoanRow = { l: any; st: ReturnType<typeof loanStatus>; balance: number; rate: number; emi: number; monthlyInterest: number; paidPct: number | null; typeLabel: string };

export function wealth(state: any, now: Date = new Date()) {
  const types: any[] = state.assetTypes || [];
  const lTypes: any[] = state.liabilityTypes || [];
  const txns = state.transactions || [];
  const assets: AssetRow[] = (state.assets || []).map((a: any) => {
    const t = types.find((x) => x.key === a.type);
    return { a, st: assetStatus(a, txns, now), typeLabel: t?.label || 'Other', color: t?.color || '#8b9ab5' };
  });
  const invested = sumN(assets.map((r) => r.st.invested));
  const current = sumN(assets.map((r) => r.st.current));

  const byTypeMap = new Map<string, { key: string; label: string; color: string; value: number; invested: number; rows: AssetRow[] }>();
  assets.forEach((r) => {
    const e = byTypeMap.get(r.a.type) || { key: r.a.type, label: r.typeLabel, color: r.color, value: 0, invested: 0, rows: [] };
    e.value += r.st.current; e.invested += r.st.invested; e.rows.push(r); byTypeMap.set(r.a.type, e);
  });
  const byAssetType = [...byTypeMap.values()].sort((a, b) => b.value - a.value);

  const loans: LoanRow[] = (state.liabilities || []).map((l: any) => {
    const st = loanStatus(l, txns, now);
    const rate = Number(l.interestRate || 0), balance = st.outstanding;
    return {
      l, st, balance, rate, emi: Number(l.emi || 0), monthlyInterest: (balance * rate) / 1200,
      paidPct: Number(l.principal) > 0 ? Math.max(0, Math.min(100, ((Number(l.principal) - balance) / Number(l.principal)) * 100)) : null,
      typeLabel: lTypes.find((x) => x.key === l.type)?.label || '',
    };
  }).filter((r: LoanRow) => r.balance > 0 || r.st.closed === false);
  const debt = sumN(loans.map((r) => r.balance));
  const emiTotal = sumN(loans.filter((r) => r.balance > 0).map((r) => r.emi));
  const interestMonthly = sumN(loans.map((r) => r.monthlyInterest));

  // money sitting in accounts (anything that isn't a credit line)
  const liquid = sumN((state.accounts || []).filter((a: any) => !/credit|card|loan/i.test(String(a.type))).map((a: any) => Number(a.balance) || 0));

  const flow = monthlyFlow(state, 6, now).filter((f) => f.income > 0 || f.spent > 0);
  const n = Math.max(1, flow.length);
  const avgIncome = sumN(flow.map((f) => f.income)) / n, avgSpent = sumN(flow.map((f) => f.spent)) / n;

  // money moved into / out of assets, per budget month
  const months = budgetMonths(state, 6, now);
  // money into / out of assets: linked transactions, plus anything in a category the user set to track assets
  const tracked = categoriesTracking(state, 'asset');
  const assetTx = txns.filter((t: any) => (t.type === 'expense' || t.type === 'income') && (t.assetId || tracked.some((x: any) => x.txnType === t.type && x.cat.name === t.category)));
  const investing = months.map((w) => {
    const list = assetTx.filter((t: any) => inWin(t, w));
    const put = sum(list.filter((t: any) => t.type === 'expense')), out = sum(list.filter((t: any) => t.type === 'income'));
    return { ...w, put, out, net: put - out, txns: list };
  });
  const avgInvest = sumN(investing.map((m) => m.net)) / Math.max(1, investing.filter((m) => m.start <= isoOf(now)).length);

  // insurance cost
  const yearlyPremium = sumN((state.insurance || []).map((p: any) => (Number(p.premium) || 0) * (12 / cycleMonths(p.frequency))));
  const overdue = (state.insurance || []).filter((p: any) => policyStatus(p, txns, now).dueState === 'overdue');

  return {
    assets, invested, current, gain: current - invested, gainPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    byAssetType, loans, debt, emiTotal, interestMonthly, liquid, netWorth: current - debt,
    flow, avgIncome, avgSpent, avgKept: avgIncome - avgSpent, investing, avgInvest, yearlyPremium, overdue,
    emergencyMonths: avgSpent > 0 ? liquid / avgSpent : null,
  };
}

// ───────────── loan payoff what-if ─────────────
export type PayoffLoan = { id: string; name: string; balance: number; rate: number; emi: number };
export type PayoffResult = { months: number; interest: number; neverEnds: boolean; order: { name: string; month: number }[] };

// Month-by-month: interest accrues, each loan's EMI is paid, and (when `rollover`) EMIs freed by cleared loans
// plus any `extra` go to the target loan — highest rate first (avalanche) or smallest balance first (snowball).
export function payoff(loans: PayoffLoan[], extra: number, strategy: 'avalanche' | 'snowball', rollover: boolean): PayoffResult {
  const L = loans.filter((l) => l.balance > 0).map((l) => ({ ...l, bal: l.balance, done: 0 }));
  let interest = 0, month = 0;
  const order: { name: string; month: number }[] = [];
  while (L.some((l) => l.bal > 0.5) && month < 720) {
    month++;
    let freed = 0;
    L.forEach((l) => {
      if (l.bal <= 0.5) { freed += l.emi; return; }
      const i = (l.bal * l.rate) / 1200; l.bal += i; interest += i;
      l.bal -= Math.min(l.bal, l.emi);
    });
    let pool = (rollover ? freed : 0) + (rollover || extra > 0 ? extra : 0);
    const target = () => L.filter((l) => l.bal > 0.5).sort(strategy === 'avalanche' ? (a, b) => b.rate - a.rate || a.bal - b.bal : (a, b) => a.bal - b.bal)[0];
    while (pool > 0.5) { const t = target(); if (!t) break; const pay = Math.min(pool, t.bal); t.bal -= pay; pool -= pay; }
    L.forEach((l) => { if (l.bal <= 0.5 && !l.done) { l.done = month; order.push({ name: l.name, month }); } });
  }
  return { months: month, interest, neverEnds: L.some((l) => l.bal > 0.5), order };
}

// Future value of a monthly contribution (annual return in %, whole years).
export const futureValue = (monthly: number, annualPct: number, years: number) => {
  const i = annualPct / 1200, n = years * 12;
  return i > 0 ? monthly * ((Math.pow(1 + i, n) - 1) / i) : monthly * n;
};

// Where spending is flexible: categories (excluding anything tied to loans / assets / policies) averaged per month.
export function flexibleSpending(state: any, now: Date = new Date()) {
  const wins = budgetMonths(state, 6, now);
  const range = { start: wins[0].start, end: wins[wins.length - 1].end };
  const m = new Map<string, { category: string; total: number; txns: any[] }>();
  byType(state, 'expense').forEach((t: any) => {
    if (t.liabilityId || t.policyId || t.assetId || !inWin(t, range)) return;
    const e = m.get(t.category) || { category: t.category, total: 0, txns: [] };
    e.total += Number(t.amount || 0); e.txns.push(t); m.set(t.category, e);
  });
  const nm = Math.max(1, wins.filter((w) => w.start <= isoOf(now)).length);
  return [...m.values()].map((e) => ({ ...e, monthly: e.total / nm })).sort((a, b) => b.monthly - a.monthly);
}

// A loan with a real repayment schedule vs. an informal one (no EMI, or an EMI that doesn't even cover interest).
export const hasSchedule = (r: { emi: number; monthlyInterest: number }) => r.emi >= 100 && r.emi > r.monthlyInterest;
