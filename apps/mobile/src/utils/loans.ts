// Live loan balances. A loan stores the balance the user typed (`outstanding`)
// and the date it was true (`outstandingAsOf`). Every expense transaction
// linked to the loan (`liabilityId`) dated on/after that day is a repayment:
// each month's first payment first covers that month's interest
// (balance × rate ÷ 12 ÷ 100) and the rest — plus any further payments that
// month, e.g. a part-prepayment — reduces the principal. Without a rate the
// whole payment reduces the balance.

import { localISO, clampDate, daysBetween, looseNameMatch, notesNameMatch, wordMatches as wordMatchesG, amountMatches, createdDateFromId, entitySubName, applyTrackInference, inferTracks, syncEntitySubcategories } from './entities';
export { localISO, looseNameMatch, notesNameMatch, createdDateFromId };

export type LoanPayment = { txn: any; interest: number; principal: number; balanceAfter: number };

export type LoanStatus = {
  baseline: number;
  asOf: string;
  outstanding: number;
  payments: LoanPayment[];       // newest first
  paidTotal: number;
  principalPaid: number;
  interestPaid: number;
  closed: boolean;
  earlierCount: number;          // linked payments dated before the balance date (not counted)
  earlierTotal: number;
  earlierFrom?: string;          // date of the earliest linked payment before the balance date
  paidThisMonth: boolean;
  dueDate?: string;              // next/this EMI due date (needs a start date)
  dueState?: 'paid' | 'upcoming' | 'overdue';
  daysToDue?: number;
  monthsLeft?: number;
};

export function loanStatus(l: any, txns: any[], now: Date = new Date()): LoanStatus {
  const today = localISO(now);
  const asOf: string = l.outstandingAsOf || today;
  const baseline = Number(l.outstanding || 0);
  const monthlyRate = Number(l.interestRate || 0) / 1200;

  const allLinked = (txns || []).filter((t: any) => t.type === 'expense' && t.liabilityId === l.id);
  const earlier = allLinked.filter((t: any) => String(t.date).slice(0, 10) < asOf);
  const linked = allLinked
    .filter((t: any) => String(t.date).slice(0, 10) >= asOf)
    .sort((a: any, b: any) => (String(a.date) === String(b.date) ? String(a.id).localeCompare(String(b.id)) : String(a.date).localeCompare(String(b.date))));

  let bal = baseline;
  let interestPaid = 0;
  let principalPaid = 0;
  const chargedMonths = new Set<string>();
  const payments: LoanPayment[] = linked.map((t: any) => {
    const amount = Number(t.amount || 0);
    const month = String(t.date).slice(0, 7);
    let interest = 0;
    if (monthlyRate > 0 && !chargedMonths.has(month)) {
      interest = Math.min(bal * monthlyRate, amount);
      chargedMonths.add(month);
    }
    const principal = Math.max(0, Math.min(amount - interest, bal));
    bal = Math.max(0, bal - principal);
    interestPaid += interest;
    principalPaid += principal;
    return { txn: t, interest, principal, balanceAfter: bal };
  });

  const thisMonth = today.slice(0, 7);
  const paidThisMonth = linked.some((t: any) => String(t.date).slice(0, 7) === thisMonth);

  // EMI due date = the day-of-month of the loan's start date.
  let dueDate: string | undefined, dueState: LoanStatus['dueState'], daysToDue: number | undefined;
  if (l.startDate && bal > 0) {
    const dueDay = Number(String(l.startDate).slice(8, 10)) || 1;
    const thisDue = localISO(clampDate(now.getFullYear(), now.getMonth(), dueDay));
    if (paidThisMonth) {
      dueDate = localISO(clampDate(now.getFullYear(), now.getMonth() + 1, dueDay));
      dueState = 'paid';
    } else {
      dueDate = thisDue;
      dueState = today > thisDue ? 'overdue' : 'upcoming';
    }
    daysToDue = daysBetween(today, dueDate);
  }

  const emi = Number(l.emi || 0);
  let monthsLeft: number | undefined;
  if (emi > 0 && bal > 0) {
    monthsLeft = monthlyRate > 0 && emi > bal * monthlyRate
      ? Math.ceil(-Math.log(1 - (monthlyRate * bal) / emi) / Math.log(1 + monthlyRate))
      : Math.ceil(bal / emi);
  }

  return {
    baseline, asOf, outstanding: bal, payments: payments.reverse(),
    paidTotal: interestPaid + principalPaid, principalPaid, interestPaid,
    closed: baseline > 0 && bal <= 0, earlierCount: earlier.length, earlierFrom: earlier.map((t: any) => String(t.date).slice(0, 10)).sort()[0], earlierTotal: earlier.reduce((t: number, x: any) => t + Number(x.amount || 0), 0), paidThisMonth, dueDate, dueState, daysToDue, monthsLeft,
  };
}

export const wordMatches = (text: any, loans: any[]) => wordMatchesG(text, loans, ['loan', 'emi']);
export const emiAmountMatches = (amount: any, loans: any[]): any[] => amountMatches(amount, loans, 'emi');

// Does this expense look like a repayment of THIS loan? A sub-category equal to the loan's type name, or a
// sub-category / note naming the loan (loosely, either direction), is a match. Ambiguity is the caller's problem.
export function paymentMatchesLoan(l: any, typeLabel: string | undefined, t: any, _loanCount?: number): boolean {
  const sub = String(t.subcategory || '').toLowerCase();
  const notes = String(t.notes || '').toLowerCase();
  const name = String(l.name || '').toLowerCase();
  const label = String(typeLabel || '').toLowerCase();
  if (label && sub === label) return true;
  if (name && notes.includes(name)) return true;
  if (notesNameMatch(t.notes, l.name)) return true;
  return looseNameMatch(t.subcategory, l.name);
}

// Unlinked expenses that look like repayments of this loan — offered for one-tap linking.
export function candidatePayments(l: any, typeLabel: string | undefined, txns: any[], loanCount: number, allLoans: any[] = [l]): any[] {
  return (txns || []).filter((t: any) => {
    if (t.type !== 'expense' || t.liabilityId || t.loanSkip || t.noAutoLink) return false;
    if (paymentMatchesLoan(l, typeLabel, t, loanCount)) return true;
    const byWord = [...wordMatches(t.subcategory, allLoans), ...wordMatches(t.notes, allLoans)];
    if (byWord.length && byWord.every((x) => x.id === l.id)) return true;
    const byAmt = emiAmountMatches(t.amount, allLoans);
    return byAmt.length === 1 && byAmt[0].id === l.id;
  });
}

// One-time backfill for loans saved before balances were live: the balance the
// user typed is taken as true on the day the loan was added, and earlier
// loan/EMI expenses that clearly belong to exactly one loan get linked to it.
// Only adds `liabilityId` to transactions — nothing else is changed.
export function backfillLoans(saved: any): { liabilities: any[]; transactions: any[]; linked: number } {
  const types: any[] = saved.liabilityTypes || [];
  const labelOf = (l: any) => types.find((t: any) => t.key === l.type)?.label as string | undefined;
  const liabilities = (saved.liabilities || []).map((l: any) => {
    const created = createdDateFromId(l.id);
    return created && (!l.outstandingAsOf || created < l.outstandingAsOf) ? { ...l, outstandingAsOf: created } : l;
  });
  let linked = 0;
  const transactions = (saved.transactions || []).map((t: any) => {
    if (t.type !== 'expense' || t.liabilityId || t.noAutoLink) return t;
    const date = String(t.date).slice(0, 10);
    let matches = liabilities.filter((l: any) => date >= (l.outstandingAsOf || '9999-12-31') && paymentMatchesLoan(l, labelOf(l), t, liabilities.length));
    // Two loans of one type? A note/sub-category that names a specific loan decides it; otherwise don't guess.
    if (matches.length > 1) {
      const named = matches.filter((l: any) => {
        const n = String(l.name || '').toLowerCase();
        return !!n && (String(t.notes || '').toLowerCase().includes(n) || String(t.subcategory || '').toLowerCase().includes(n));
      });
      if (named.length === 1) matches = named;
    }
    if (matches.length !== 1) return t;
    linked++;
    return { ...t, liabilityId: matches[0].id };
  });
  return { liabilities, transactions, linked };
}


// ── Loans as real sub-categories ───────────────────────────────────────────
// The work is done by the generic entity engine (utils/entities.ts); these are loan-flavoured entry points.
export const loanSubName = (l: any): string => entitySubName('liability', l);
export const findLoanCategory = (cats: any[]) =>
  (cats || []).find((c: any) => c.tracks === 'liability') || (cats || []).find((c: any) => c.tracks === undefined && inferTracks(c, 'expense') === 'liability');
export function syncLoanSubcategories(state: any): { state: any; changes: number } {
  return syncEntitySubcategories(applyTrackInference(state), 'liability');
}
