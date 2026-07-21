import React, { createContext, useContext, useReducer, useEffect } from 'react';
import {
  SEED_TRANSACTIONS, SEED_ACCOUNTS, SEED_ASSETS,
  SEED_LIABILITIES, SEED_BUDGETS, SEED_EVENTS, SEED_INSURANCE, SEED_USERS
} from '../data/mockData';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_GROUPS } from '../data/categories';

const AppContext = createContext(null);

import { getIdentity, clearIdentity } from '../utils/googleAuth';

const DATA_KEY = 'a1_data';

// ── Default Asset Types ──
export const DEFAULT_ASSET_TYPES = [
  { id:'at-1', key:'gold',        label:'Gold',          color:'var(--yellow)' },
  { id:'at-2', key:'mutual_fund', label:'Mutual Fund',   color:'var(--blue)' },
  { id:'at-3', key:'stock',       label:'Stock',         color:'var(--green)' },
  { id:'at-4', key:'fd',          label:'Fixed Deposit', color:'var(--accent-light)' },
  { id:'at-5', key:'pf',          label:'PF / EPF',      color:'var(--red)' },
  { id:'at-6', key:'nps',         label:'NPS',           color:'#f97316' },
  { id:'at-7', key:'property',    label:'Property',      color:'#06b6d4' },
  { id:'at-8', key:'crypto',      label:'Crypto',        color:'#a855f7' },
  { id:'at-9', key:'other',       label:'Other',         color:'var(--text-2)' },
];

// ── Default Liability Types ──
export const DEFAULT_LIABILITY_TYPES = [
  { id:'lt-1', key:'home_loan',        label:'Home Loan',      color:'var(--blue)' },
  { id:'lt-2', key:'gold_loan',        label:'Gold Loan',      color:'var(--yellow)' },
  { id:'lt-3', key:'personal_loan',    label:'Personal Loan',  color:'var(--red)' },
  { id:'lt-4', key:'vehicle_loan',     label:'Vehicle Loan',   color:'var(--green)' },
  { id:'lt-5', key:'education_loan',   label:'Education Loan', color:'#06b6d4' },
  { id:'lt-6', key:'credit_card_debt', label:'CC Debt',        color:'var(--accent-light)' },
  { id:'lt-7', key:'other',            label:'Other',          color:'var(--text-2)' },
];

// ── Empty state (what "Reset All" produces) ──
export function emptyState() {
  return {
    transactions: [],
    accounts: [],
    assets: [],
    liabilities: [],
    budgets: [],
    events: [],
    insurance: [],
    household: { name: 'My Household', members: [] },
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    groups: DEFAULT_GROUPS,
    assetTypes: DEFAULT_ASSET_TYPES,
    liabilityTypes: DEFAULT_LIABILITY_TYPES,
  };
}

// ── Sample / demo state ──
export function sampleState() {
  return {
    transactions: SEED_TRANSACTIONS,
    accounts: SEED_ACCOUNTS,
    assets: SEED_ASSETS,
    liabilities: SEED_LIABILITIES,
    budgets: SEED_BUDGETS,
    events: SEED_EVENTS,
    insurance: SEED_INSURANCE,
    household: { name: 'Kumar Family', members: SEED_USERS },
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    groups: DEFAULT_GROUPS,
    assetTypes: DEFAULT_ASSET_TYPES,
    liabilityTypes: DEFAULT_LIABILITY_TYPES,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// One-time migration marker: names that only ever existed in the old,
// overly-personal default category set. If any of these are still present
// untouched, the user never customized away from the old defaults, so it's
// safe to swap them for the new general set.
const LEGACY_CATEGORY_NAMES = [
  'Chennai Home', 'Vellore Home', 'Kallakurichi Home', 'TASC', 'DataProw', 'AbsoluteData', 'Seat'
];
const hasLegacyCategories = (categories) =>
  Array.isArray(categories) && categories.some(c => LEGACY_CATEGORY_NAMES.includes(c.name));

function initialState() {
  const saved = loadState();
  if (saved) {
    if (!saved.expenseCategories || hasLegacyCategories(saved.expenseCategories)) saved.expenseCategories = DEFAULT_EXPENSE_CATEGORIES;
    if (!saved.incomeCategories  || hasLegacyCategories(saved.incomeCategories))  saved.incomeCategories  = DEFAULT_INCOME_CATEGORIES;
    if (!saved.groups)            saved.groups            = DEFAULT_GROUPS;
    if (!saved.assetTypes)        saved.assetTypes        = DEFAULT_ASSET_TYPES;
    if (!saved.liabilityTypes)    saved.liabilityTypes    = DEFAULT_LIABILITY_TYPES;
    return saved;
  }
  // First time: start with empty state (user fills their own data)
  return emptyState();
}

// ── Helpers for account balance auto-update ──
function txDelta(t) {
  if (!t || !t.account) return null;
  const amount = Number(t.amount) || 0;
  if (t.type === 'income')  return { id: t.account, delta: +amount };
  if (t.type === 'expense') return { id: t.account, delta: -amount };
  return null;
}

function applyDelta(accounts, delta) {
  if (!delta) return accounts;
  return accounts.map(a => a.id === delta.id ? { ...a, balance: (Number(a.balance) || 0) + delta.delta } : a);
}

function reducer(state, action) {
  switch (action.type) {

    // ── Global Reset / Load ──
    case 'RESET_ALL':        return emptyState();
    case 'LOAD_SAMPLE_DATA': return sampleState();
    case 'IMPORT_DATA':      return { ...emptyState(), ...action.payload };

    // ── Transactions (with account balance sync) ──
    case 'ADD_TRANSACTION': {
      const t = action.payload;
      const accounts = applyDelta(state.accounts, txDelta(t));
      return { ...state, transactions: [t, ...state.transactions], accounts };
    }
    case 'UPDATE_TRANSACTION': {
      const newT = action.payload;
      const oldT = state.transactions.find(t => t.id === newT.id);
      let accounts = applyDelta(state.accounts, oldT ? { id: txDelta(oldT)?.id, delta: -(txDelta(oldT)?.delta || 0) } : null);
      accounts = applyDelta(accounts, txDelta(newT));
      return { ...state, transactions: state.transactions.map(t => t.id === newT.id ? newT : t), accounts };
    }
    case 'DELETE_TRANSACTION': {
      const t = state.transactions.find(t => t.id === action.payload);
      const d = txDelta(t);
      const accounts = d ? applyDelta(state.accounts, { id: d.id, delta: -d.delta }) : state.accounts;
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload), accounts };
    }

    // ── Accounts ──
    case 'ADD_ACCOUNT':    return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT': return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ACCOUNT': return { ...state, accounts: state.accounts.filter(a => a.id !== action.payload) };

    // ── Assets ──
    case 'ADD_ASSET':    return { ...state, assets: [...state.assets, action.payload] };
    case 'UPDATE_ASSET': return { ...state, assets: state.assets.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ASSET': return { ...state, assets: state.assets.filter(a => a.id !== action.payload) };

    // ── Asset Types ──
    case 'ADD_ASSET_TYPE':    return { ...state, assetTypes: [...(state.assetTypes || []), action.payload] };
    case 'UPDATE_ASSET_TYPE': return { ...state, assetTypes: (state.assetTypes || []).map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_ASSET_TYPE': return { ...state, assetTypes: (state.assetTypes || []).filter(t => t.id !== action.payload) };

    // ── Liabilities ──
    case 'ADD_LIABILITY':    return { ...state, liabilities: [...state.liabilities, action.payload] };
    case 'UPDATE_LIABILITY': return { ...state, liabilities: state.liabilities.map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LIABILITY': return { ...state, liabilities: state.liabilities.filter(l => l.id !== action.payload) };

    // ── Liability Types ──
    case 'ADD_LIABILITY_TYPE':    return { ...state, liabilityTypes: [...(state.liabilityTypes || []), action.payload] };
    case 'UPDATE_LIABILITY_TYPE': return { ...state, liabilityTypes: (state.liabilityTypes || []).map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_LIABILITY_TYPE': return { ...state, liabilityTypes: (state.liabilityTypes || []).filter(t => t.id !== action.payload) };

    // ── Budgets ──
    case 'ADD_BUDGET':    return { ...state, budgets: [...state.budgets, action.payload] };
    case 'UPDATE_BUDGET': return { ...state, budgets: state.budgets.map(b => b.id === action.payload.id ? action.payload : b) };
    case 'DELETE_BUDGET': return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload) };

    // ── Events ──
    case 'ADD_EVENT':    return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT': return { ...state, events: state.events.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EVENT': return { ...state, events: state.events.filter(e => e.id !== action.payload) };

    // ── Insurance ──
    case 'ADD_INSURANCE':    return { ...state, insurance: [...state.insurance, action.payload] };
    case 'UPDATE_INSURANCE': return { ...state, insurance: state.insurance.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_INSURANCE': return { ...state, insurance: state.insurance.filter(i => i.id !== action.payload) };

    // ── Expense Categories ──
    case 'ADD_EXPENSE_CATEGORY':    return { ...state, expenseCategories: [...state.expenseCategories, action.payload] };
    case 'UPDATE_EXPENSE_CATEGORY': return { ...state, expenseCategories: state.expenseCategories.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_EXPENSE_CATEGORY': return { ...state, expenseCategories: state.expenseCategories.filter(c => c.id !== action.payload) };

    // ── Income Categories ──
    case 'ADD_INCOME_CATEGORY':    return { ...state, incomeCategories: [...state.incomeCategories, action.payload] };
    case 'UPDATE_INCOME_CATEGORY': return { ...state, incomeCategories: state.incomeCategories.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_INCOME_CATEGORY': return { ...state, incomeCategories: state.incomeCategories.filter(c => c.id !== action.payload) };

    // ── Groups ──
    case 'ADD_GROUP':    return { ...state, groups: [...state.groups, action.payload] };
    case 'UPDATE_GROUP': return { ...state, groups: state.groups.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_GROUP': return { ...state, groups: state.groups.filter(g => g.id !== action.payload) };

    // ── Settings ──
    case 'UPDATE_HOUSEHOLD': return { ...state, household: { ...state.household, ...action.payload } };

    // ── Family Members (optional profile tags — not separate logins) ──
    case 'ADD_MEMBER':
      return { ...state, household: { ...state.household, members: [...(state.household.members || []), action.payload] } };
    case 'UPDATE_MEMBER':
      return { ...state, household: { ...state.household, members: (state.household.members || []).map(m => m.id === action.payload.id ? action.payload : m) } };
    case 'DELETE_MEMBER':
      return { ...state, household: { ...state.household, members: (state.household.members || []).filter(m => m.id !== action.payload) } };

    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, initialState);
  const [currentUser, setCurrentUser] = React.useState(() => getIdentity());

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(state));
  }, [state]);

  const loginWithGoogle = (identity) => {
    setCurrentUser(identity);
  };

  const logout = () => {
    // Signing out only ends the app session — Drive stays connected so the
    // user isn't asked to reconnect it every time they sign back in.
    clearIdentity();
    setCurrentUser(null);
  };

  const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <AppContext.Provider value={{
      state, dispatch, currentUser, loginWithGoogle, logout, uid
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
