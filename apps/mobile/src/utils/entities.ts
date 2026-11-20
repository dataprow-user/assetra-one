// Generic "tracked entity" engine — loans, assets and insurance policies share ONE mechanism:
//
//   category.tracks  →  which kind of entity a category stands for ('liability' | 'asset' | 'insurance')
//   entity           →  becomes a sub-category of every category that tracks its kind
//   transaction      →  links to an entity through a link field (liabilityId / assetId / policyId)
//   status           →  balances / values / due dates are DERIVED from the linked transactions
//
// Nothing here knows any user's category names, loan names or lender: categories are mapped by the
// `tracks` setting (guessed once from the name, then fully user-controlled), and entities are matched
// to old transactions by names, notes and amounts found in the user's own data.

export type Kind = 'liability' | 'asset' | 'insurance';
export const KINDS: Kind[] = ['liability', 'asset', 'insurance'];

type TxnType = 'expense' | 'income';

export const KIND_CONFIG: Record<Kind, {
  listKey: 'liabilities' | 'assets' | 'insurance';
  typeListKey?: 'liabilityTypes' | 'assetTypes';
  linkField: 'liabilityId' | 'assetId' | 'policyId';
  asOfField: string;                 // date the entity's typed figures were true
  amountField?: string;              // an amount that identifies a payment (EMI / premium)
  suffix: string;                    // appended to the entity name to form its sub-category
  stopWords: string[];               // words that say nothing about WHICH entity ("loan", "policy"…)
  txnTypes: TxnType[];               // transaction types that may link to this kind
  noun: string;
  addLabel: string;
  route: string;
}> = {
  liability: { listKey: 'liabilities', typeListKey: 'liabilityTypes', linkField: 'liabilityId', asOfField: 'outstandingAsOf', amountField: 'emi', suffix: ' EMI', stopWords: ['loan', 'emi'], txnTypes: ['expense'], noun: 'loan', addLabel: 'Add a new loan', route: '/(app)/liabilities' },
  asset: { listKey: 'assets', typeListKey: 'assetTypes', linkField: 'assetId', asOfField: 'valueAsOf', suffix: '', stopWords: [], txnTypes: ['expense', 'income'], noun: 'asset', addLabel: 'Add a new asset', route: '/(app)/assets' },
  insurance: { listKey: 'insurance', linkField: 'policyId', asOfField: 'nextDueAsOf', amountField: 'premium', suffix: ' Premium', stopWords: ['policy', 'premium', 'insurance'], txnTypes: ['expense'], noun: 'policy', addLabel: 'Add a new policy', route: '/(app)/insurance' },
};
export const ALL_LINK_FIELDS = KINDS.map((k) => KIND_CONFIG[k].linkField);

// ── dates ──────────────────────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');
export const localISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fromISO = (s: string) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const clampDate = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
export const daysBetween = (a: string, b: string) => Math.round((+fromISO(b) - +fromISO(a)) / 86400000);
export const addDaysISO = (s: string, n: number) => { const d = fromISO(s); d.setDate(d.getDate() + n); return localISO(d); };
export const addMonthsISO = (s: string, n: number) => { const d = fromISO(s); return localISO(clampDate(d.getFullYear(), d.getMonth() + n, d.getDate())); };

// Record IDs are `id-<epoch ms>-<rand>`, so an entity's creation day is recoverable.
export function createdDateFromId(id: string): string | undefined {
  const m = /^id-(\d{12,})-/.exec(String(id));
  if (!m) return undefined;
  const d = new Date(Number(m[1]));
  return isNaN(+d) ? undefined : localISO(d);
}

// ── name matching ──────────────────────────────────────────────────────────
const norm = (x: any) => String(x || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
// Loose two-way match: "Personal Loan - IOB" ↔ "Vinoth Marriage Personal Loan - IOB". Too-short strings never match.
export function looseNameMatch(sub: any, name: any): boolean {
  const a = norm(sub), b = norm(name);
  if (a.length < 8 || b.length < 4) return false;
  return b.includes(a) || a.includes(b);
}
export const stripLead = (x: any) => String(x || '').replace(/^\s*(?:paid\s+)?(?:to|from)\s+/i, '');
export const notesNameMatch = (notes: any, name: any) => looseNameMatch(stripLead(notes), name);

const BASE_STOP = ['and', 'the', 'from', 'for', 'with', 'payment', 'payments'];
const wordsOf = (x: any, stop: string[]): string[] => {
  const s = new Set([...BASE_STOP, ...stop]);
  return String(x || '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !s.has(w));
};
// A word that appears in exactly ONE entity's name identifies that entity; shared words never decide.
export function wordMatches(text: any, entities: any[], stop: string[] = []): any[] {
  const count = new Map<string, number>();
  entities.forEach((e) => new Set(wordsOf(e.name, stop)).forEach((w) => count.set(w, (count.get(w) || 0) + 1)));
  const have = new Set(wordsOf(stripLead(text), stop));
  return entities.filter((e) => wordsOf(e.name, stop).some((w) => count.get(w) === 1 && have.has(w)));
}
export const amountMatches = (amount: any, entities: any[], field?: string): any[] =>
  field ? entities.filter((e) => Number(e[field]) >= 100 && Number(e[field]) === Number(amount)) : [];

// ── category ↔ kind ────────────────────────────────────────────────────────
export const trackedKind = (cat: any): Kind | undefined => (cat && KIND_CONFIG[cat.tracks as Kind] ? (cat.tracks as Kind) : undefined);

// First-run guess from a category's NAME only — afterwards the user's choice (stored in `tracks`, '' = none) wins.
export function inferTracks(cat: any, listType: TxnType): Kind | '' {
  const n = String(cat?.name || '').toLowerCase();
  if (listType !== 'expense') return '';
  if (/loan|emi/.test(n)) return 'liability';
  if (/insur|premium/.test(n)) return 'insurance';
  if (/invest|\bsip\b|mutual|stock|equity|deposit|pension|retire/.test(n)) return 'asset';
  return '';
}
export function applyTrackInference(state: any): any {
  let changed = false;
  const fix = (cats: any[] | undefined, t: TxnType) => (cats || []).map((c: any) => {
    if (c.tracks !== undefined) return c;
    changed = true;
    return { ...c, tracks: inferTracks(c, t) };
  });
  const expenseCategories = fix(state.expenseCategories, 'expense');
  const incomeCategories = fix(state.incomeCategories, 'income');
  return changed ? { ...state, expenseCategories, incomeCategories } : state;
}

export const categoriesTracking = (state: any, kind: Kind) => {
  const cfg = KIND_CONFIG[kind];
  const out: { cat: any; listKey: 'expenseCategories' | 'incomeCategories'; txnType: TxnType }[] = [];
  (['expense', 'income'] as TxnType[]).forEach((t) => {
    if (!cfg.txnTypes.includes(t)) return;
    const listKey = t === 'expense' ? 'expenseCategories' : 'incomeCategories';
    (state[listKey] || []).forEach((c: any) => { if (c.tracks === kind) out.push({ cat: c, listKey, txnType: t }); });
  });
  return out;
};

// ── entity ↔ sub-category name ─────────────────────────────────────────────
export const entitySubName = (kind: Kind, e: any): string => {
  const cfg = KIND_CONFIG[kind];
  const n = String(e?.name || cfg.noun).trim();
  const suf = cfg.suffix.trim();
  return suf && new RegExp(`${suf}\\s*$`, 'i').test(n) ? n : `${n}${cfg.suffix}`;
};

// ── the sync ───────────────────────────────────────────────────────────────
// Keeps every tracking category's sub-category list, the transactions' sub-categories/links and the budget
// lines consistent with the entity list. Idempotent; safe on every load and after every change.
export function syncEntitySubcategories(state: any, kind: Kind): { state: any; changes: number } {
  const cfg = KIND_CONFIG[kind];
  const tracked = categoriesTracking(state, kind);
  if (!tracked.length) return { state, changes: 0 };
  const types: any[] = (cfg.typeListKey ? state[cfg.typeListKey] : []) || [];
  const labelOf = (e: any) => String(types.find((t: any) => t.key === e.type)?.label || '').toLowerCase();

  // 1) every entity gets (and keeps) a unique sub-category name; a rename carries old → new
  const renames = new Map<string, string>();
  const taken = new Set<string>();
  const entities: any[] = (state[cfg.listKey] || []).map((e: any) => {
    let want = entitySubName(kind, e);
    if (taken.has(want)) { let i = 2; while (taken.has(`${want} (${i})`)) i++; want = `${want} (${i})`; }
    taken.add(want);
    if (e.subName && e.subName !== want) renames.set(e.subName, want);
    return e.subName === want ? e : { ...e, subName: want };
  });

  // 2) a generic type name ("Personal Loan") stands for an entity only if exactly ONE entity has that type
  const byType = new Map<string, any[]>();
  entities.forEach((e) => { const k = labelOf(e); if (k) byType.set(k, [...(byType.get(k) || []), e]); });
  const genericToEntity = new Map<string, any>();
  byType.forEach((arr, k) => { if (arr.length === 1) genericToEntity.set(k, arr[0]); });
  const typeLabels = new Set(types.map((t: any) => String(t.label || '').toLowerCase()));
  // Words that merely NAME a type ("fund", "deposit", "loan", "personal") say what KIND of thing it is, not which one.
  const typeWords = types.flatMap((t: any) => wordsOf(t.label, []));
  const stop = [...cfg.stopWords, ...typeWords];
  const entitySubs = new Set(entities.map((e) => e.subName as string));
  const mentions = (e: any, t: any) => {
    const n = String(e.name || '').toLowerCase();
    return (!!n && (String(t.notes || '').toLowerCase().includes(n) || String(t.subcategory || '').toLowerCase().includes(n))) || notesNameMatch(t.notes, e.name);
  };

  let changes = 0;
  let transactions: any[] = state.transactions || [];
  let budgets: any[] = state.budgets || [];
  const catUpdates = new Map<any, any>();       // original category object -> updated
  const nextState: any = { ...state };

  for (const { cat, listKey, txnType } of tracked) {
    // Which sub-category texts already exist for this category, and which single entity does each stand for?
    const knownSubs = new Set<string>([...(cat.subcategories || [])]);
    transactions.forEach((t: any) => { if (t.type === txnType && t.category === cat.name && t.subcategory) knownSubs.add(t.subcategory); });
    if (txnType === 'expense') budgets.forEach((b: any) => { if (b.category === cat.name && b.subcategory) knownSubs.add(b.subcategory); });
    const replaceSub = new Map<string, any>();
    knownSubs.forEach((sn) => {
      if (entitySubs.has(sn)) return;
      const key = String(sn).toLowerCase();
      if (typeLabels.has(key)) { if (genericToEntity.has(key)) replaceSub.set(sn, genericToEntity.get(key)); return; }
      const hits = entities.filter((e) => looseNameMatch(sn, e.name));
      if (hits.length === 1) { replaceSub.set(sn, hits[0]); return; }
      if (hits.length === 0) { const w = wordMatches(sn, entities, stop); if (w.length === 1) replaceSub.set(sn, w[0]); }
    });

    // transactions of this category
    transactions = transactions.map((t: any) => {
      if (t.type !== txnType || t.category !== cat.name) return t;
      if (t.linkSkip || t.loanSkip || t.noAutoLink) return t;
      let u = t;
      if (u.subcategory && renames.has(u.subcategory)) u = { ...u, subcategory: renames.get(u.subcategory) };
      const linked = u[cfg.linkField] ? entities.find((e) => e.id === u[cfg.linkField]) : undefined;
      if (linked) {
        if (u.subcategory !== linked.subName) u = { ...u, subcategory: linked.subName };
      } else if (!u[cfg.linkField]) {
        const g = replaceSub.get(u.subcategory);
        let pick: any = g;
        if (!pick) {
          const named = entities.filter((e) => mentions(e, u));
          if (named.length === 1) pick = named[0];
          else if (named.length === 0) {
            const w = wordMatches(u.notes, entities, stop);
            if (w.length === 1) pick = w[0];
            else if (w.length === 0) { const a = amountMatches(u.amount, entities, cfg.amountField); if (a.length === 1) pick = a[0]; }
          }
        }
        if (pick) u = { ...u, [cfg.linkField]: pick.id, subcategory: pick.subName };
      }
      if (u !== t) changes++;
      return u;
    });

    // budget lines (expense categories only)
    if (txnType === 'expense') {
      budgets = budgets.map((b: any) => {
        if (b.category !== cat.name || !b.subcategory) return b;
        let nb = b;
        if (renames.has(nb.subcategory)) nb = { ...nb, subcategory: renames.get(nb.subcategory) };
        const g = replaceSub.get(nb.subcategory);
        if (g) nb = { ...nb, subcategory: g.subName };
        if (nb !== b) changes++;
        return nb;
      });
    }

    // the category's own sub-category list: entities first, replaced duplicates out, stale managed entries out
    const desired = entities.map((e) => e.subName as string);
    const inUse = new Set<string>();
    transactions.forEach((t: any) => { if (t.type === txnType && t.category === cat.name && t.subcategory) inUse.add(t.subcategory); });
    if (txnType === 'expense') budgets.forEach((b: any) => { if (b.category === cat.name && b.subcategory) inUse.add(b.subcategory); });
    const managedPrev: string[] = cat.managedSubs || cat.managedLoanSubs || [];
    const rest = (cat.subcategories || []).filter((sn: string) => {
      if (desired.includes(sn)) return false;
      if (replaceSub.has(sn)) return false;
      if (managedPrev.includes(sn) && !inUse.has(sn)) return false;
      return true;
    });
    const subs = [...desired, ...rest];
    const sameSubs = subs.length === (cat.subcategories || []).length && subs.every((x, i) => x === cat.subcategories[i]);
    const sameManaged = managedPrev.length === desired.length && managedPrev.every((x, i) => x === desired[i]);
    if (!sameSubs) changes++;
    if (!sameSubs || !sameManaged) catUpdates.set(cat, { ...cat, subcategories: subs, managedSubs: desired });
    nextState[listKey] = nextState[listKey] || state[listKey];
  }

  const entitiesChanged = entities.some((e, i) => e !== (state[cfg.listKey] || [])[i]);
  if (!changes && !catUpdates.size && !entitiesChanged) return { state, changes: 0 };
  for (const listKey of ['expenseCategories', 'incomeCategories']) {
    if ((state[listKey] || []).some((c: any) => catUpdates.has(c))) nextState[listKey] = (state[listKey] || []).map((c: any) => catUpdates.get(c) || c);
  }
  if (entitiesChanged) nextState[cfg.listKey] = entities;
  nextState.transactions = transactions;
  nextState.budgets = budgets;
  return { state: nextState, changes };
}

// A category that STOPPED tracking anything: drop the sub-categories we managed for it (unless used).
function cleanupUntracked(state: any): { state: any; changes: number } {
  let changes = 0;
  const next: any = { ...state };
  (['expenseCategories', 'incomeCategories'] as const).forEach((listKey) => {
    const txnType: TxnType = listKey === 'expenseCategories' ? 'expense' : 'income';
    let touched = false;
    const cats = (state[listKey] || []).map((c: any) => {
      const managed: string[] = c.managedSubs || c.managedLoanSubs || [];
      if (trackedKind(c) || !managed.length) return c;
      const inUse = new Set<string>();
      (state.transactions || []).forEach((t: any) => { if (t.type === txnType && t.category === c.name && t.subcategory) inUse.add(t.subcategory); });
      if (txnType === 'expense') (state.budgets || []).forEach((b: any) => { if (b.category === c.name && b.subcategory) inUse.add(b.subcategory); });
      const subs = (c.subcategories || []).filter((sn: string) => !managed.includes(sn) || inUse.has(sn));
      touched = true; changes++;
      return { ...c, subcategories: subs, managedSubs: [], managedLoanSubs: undefined };
    });
    if (touched) next[listKey] = cats;
  });
  return changes ? { state: next, changes } : { state, changes: 0 };
}

export function syncAllEntitySubcategories(state: any): { state: any; changes: number } {
  let s = applyTrackInference(state);
  let total = 0;
  const c = cleanupUntracked(s); s = c.state; total += c.changes;
  for (const k of KINDS) { const r = syncEntitySubcategories(s, k); s = r.state; total += r.changes; }
  return { state: s, changes: total };
}

// One-time: take each asset's / policy's typed figures as true on the day it was added.
export function backfillEntityDates(state: any): any {
  const next: any = { ...state };
  (['asset', 'insurance'] as Kind[]).forEach((k) => {
    const cfg = KIND_CONFIG[k];
    const today = localISO(new Date());
    if (!Array.isArray(state[cfg.listKey])) return;
    next[cfg.listKey] = state[cfg.listKey].map((e: any) => {
      const created = createdDateFromId(e.id);
      const cur = e[cfg.asOfField];
      if (cur && !(created && created < cur)) return e;
      return { ...e, [cfg.asOfField]: created || cur || today };
    });
  });
  return next;
}

// ── derived values ─────────────────────────────────────────────────────────
const sortAsc = (a: any, b: any) => (String(a.date) === String(b.date) ? String(a.id).localeCompare(String(b.id)) : String(a.date).localeCompare(String(b.date)));
const sum = (xs: any[]) => xs.reduce((s, t) => s + Number(t.amount || 0), 0);

export type AssetStatus = {
  asOf: string; baselineInvested: number; baselineCurrent: number;
  contributions: number; withdrawals: number; netAdded: number;
  invested: number; current: number; gain: number; gainPct: number; approxExtraUnits: number;
  payments: any[];                       // counted linked transactions, newest first
  earlierCount: number; earlierTotal: number; earlierFrom?: string;
};
export const assetBaseline = (a: any) => {
  const buy = Number(a.purchasePrice ?? a.avgPrice ?? 0) || 0;
  const curr = Number(a.currentPrice ?? 0) || 0;
  const qty = Number(a.quantity) || 0;
  return { invested: qty * buy, current: qty * curr, buy, curr, qty };
};
// Money put into (expense) or taken out of (income) an asset since its figures were typed moves BOTH its
// invested amount and its current value — so gain/loss is unchanged until the user updates the price.
export function assetStatus(a: any, txns: any[], now: Date = new Date()): AssetStatus {
  const asOf: string = a.valueAsOf || localISO(now);
  const b = assetBaseline(a);
  const linked = (txns || []).filter((t: any) => t.assetId === a.id && (t.type === 'expense' || t.type === 'income'));
  const counted = linked.filter((t: any) => String(t.date).slice(0, 10) >= asOf).sort(sortAsc);
  const earlier = linked.filter((t: any) => String(t.date).slice(0, 10) < asOf);
  const contributions = sum(counted.filter((t: any) => t.type === 'expense'));
  const withdrawals = sum(counted.filter((t: any) => t.type === 'income'));
  const netAdded = contributions - withdrawals;
  const invested = Math.max(0, b.invested + netAdded);
  const current = Math.max(0, b.current + netAdded);
  return {
    asOf, baselineInvested: b.invested, baselineCurrent: b.current, contributions, withdrawals, netAdded,
    invested, current, gain: current - invested, gainPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    approxExtraUnits: b.curr > 0 ? netAdded / b.curr : 0,
    payments: counted.reverse(),
    earlierCount: earlier.length, earlierTotal: sum(earlier), earlierFrom: earlier.map((t: any) => String(t.date).slice(0, 10)).sort()[0],
  };
}

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, half_yearly: 6, halfyearly: 6, half_year: 6, semi_annual: 6, semiannual: 6, yearly: 12, annual: 12, annually: 12 };
export const cycleMonths = (freq: any): number => CYCLE_MONTHS[String(freq || '').toLowerCase().replace(/[\s-]/g, '_')] || 12;

export type PolicyStatus = {
  asOf: string; typedDue?: string; nextDue?: string;
  dueState: 'paid' | 'upcoming' | 'overdue' | 'none'; daysToDue?: number;
  payments: any[]; paidTotal: number; lastPaid?: string; cyclesSettled: number;
  earlierCount: number; earlierTotal: number; earlierFrom?: string;
};
// Each premium payment settles the earliest unsettled due date (a payment within half a cycle BEFORE the
// due date, or any time after, counts); the next due date moves forward one cycle per settled payment.
export function policyStatus(p: any, txns: any[], now: Date = new Date()): PolicyStatus {
  const today = localISO(now);
  const asOf: string = p.nextDueAsOf || today;
  const linked = (txns || []).filter((t: any) => t.type === 'expense' && t.policyId === p.id);
  const counted = linked.filter((t: any) => String(t.date).slice(0, 10) >= asOf).sort(sortAsc);
  const earlier = linked.filter((t: any) => String(t.date).slice(0, 10) < asOf);
  const months = cycleMonths(p.frequency);
  const halfDays = Math.round((months * 30) / 2);
  const typedDue: string | undefined = p.nextDue ? String(p.nextDue).slice(0, 10) : undefined;
  let due = typedDue;
  let settled = 0;
  if (due) {
    for (const t of counted) {
      if (String(t.date).slice(0, 10) >= addDaysISO(due, -halfDays)) { due = addMonthsISO(due, months); settled++; }
    }
  }
  let dueState: PolicyStatus['dueState'] = 'none';
  let daysToDue: number | undefined;
  if (due) {
    daysToDue = daysBetween(today, due);
    dueState = settled > 0 && daysToDue > halfDays ? 'paid' : daysToDue < 0 ? 'overdue' : 'upcoming';
  }
  return {
    asOf, typedDue, nextDue: due, dueState, daysToDue,
    payments: [...counted].reverse(), paidTotal: sum(counted), lastPaid: counted.length ? String(counted[counted.length - 1].date).slice(0, 10) : undefined, cyclesSettled: settled,
    earlierCount: earlier.length, earlierTotal: sum(earlier), earlierFrom: earlier.map((t: any) => String(t.date).slice(0, 10)).sort()[0],
  };
}
