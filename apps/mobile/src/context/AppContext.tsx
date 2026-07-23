import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SEED_TRANSACTIONS, SEED_ACCOUNTS, SEED_ASSETS,
  SEED_LIABILITIES, SEED_BUDGETS, SEED_EVENTS, SEED_INSURANCE, SEED_USERS,
} from '../data/mockData';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_GROUPS } from '../data/categories';
import { getIdentity, clearIdentity } from '../utils/googleAuth';
import { setAmountsHidden } from '../utils/format';
import { Colors } from '../constants/theme';

// Ported from apps/web/src/context/AppContext.jsx. Same reducer, same action
// names — the two apps should always be able to restore each other's JSON
// export. The only real difference is AsyncStorage being async where
// localStorage was synchronous (see the hydrate effect below).

const AppContext = createContext<any>(null);

const DATA_KEY = 'a1_data';

export const DEFAULT_ASSET_TYPES = [
  { id: 'at-1', key: 'gold', label: 'Gold', color: Colors.yellow },
  { id: 'at-2', key: 'mutual_fund', label: 'Mutual Fund', color: Colors.blue },
  { id: 'at-3', key: 'stock', label: 'Stock', color: Colors.green },
  { id: 'at-4', key: 'fd', label: 'Fixed Deposit', color: Colors.accentLight },
  { id: 'at-5', key: 'pf', label: 'PF / EPF', color: Colors.red },
  { id: 'at-6', key: 'nps', label: 'NPS', color: '#f97316' },
  { id: 'at-7', key: 'property', label: 'Property', color: '#06b6d4' },
  { id: 'at-8', key: 'crypto', label: 'Crypto', color: '#a855f7' },
  { id: 'at-9', key: 'other', label: 'Other', color: Colors.text2 },
];

export const DEFAULT_LIABILITY_TYPES = [
  { id: 'lt-1', key: 'home_loan', label: 'Home Loan', color: Colors.blue },
  { id: 'lt-2', key: 'gold_loan', label: 'Gold Loan', color: Colors.yellow },
  { id: 'lt-3', key: 'personal_loan', label: 'Personal Loan', color: Colors.red },
  { id: 'lt-4', key: 'vehicle_loan', label: 'Vehicle Loan', color: Colors.green },
  { id: 'lt-5', key: 'education_loan', label: 'Education Loan', color: '#06b6d4' },
  { id: 'lt-6', key: 'credit_card_debt', label: 'CC Debt', color: Colors.accentLight },
  { id: 'lt-7', key: 'other', label: 'Other', color: Colors.text2 },
];

export function emptyState() {
  return {
    transactions: [], accounts: [], assets: [], liabilities: [],
    budgets: [], events: [], insurance: [],
    household: { name: 'My Household', members: [] as any[] },
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    groups: DEFAULT_GROUPS,
    assetTypes: DEFAULT_ASSET_TYPES,
    liabilityTypes: DEFAULT_LIABILITY_TYPES,
  };
}

export function sampleState() {
  return {
    transactions: SEED_TRANSACTIONS, accounts: SEED_ACCOUNTS, assets: SEED_ASSETS,
    liabilities: SEED_LIABILITIES, budgets: SEED_BUDGETS, events: SEED_EVENTS, insurance: SEED_INSURANCE,
    household: { name: 'Kumar Family', members: SEED_USERS },
    expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    groups: DEFAULT_GROUPS,
    assetTypes: DEFAULT_ASSET_TYPES,
    liabilityTypes: DEFAULT_LIABILITY_TYPES,
  };
}

const LEGACY_CATEGORY_NAMES = ['Chennai Home', 'Vellore Home', 'Kallakurichi Home', 'TASC', 'DataProw', 'AbsoluteData', 'Seat'];
const hasLegacyCategories = (categories: any) =>
  Array.isArray(categories) && categories.some((c) => LEGACY_CATEGORY_NAMES.includes(c.name));

function normalizeLoaded(saved: any) {
  if (!saved.expenseCategories || hasLegacyCategories(saved.expenseCategories)) saved.expenseCategories = DEFAULT_EXPENSE_CATEGORIES;
  if (!saved.incomeCategories || hasLegacyCategories(saved.incomeCategories)) saved.incomeCategories = DEFAULT_INCOME_CATEGORIES;
  if (!saved.groups) saved.groups = DEFAULT_GROUPS;
  if (!saved.assetTypes) saved.assetTypes = DEFAULT_ASSET_TYPES;
  if (!saved.liabilityTypes) saved.liabilityTypes = DEFAULT_LIABILITY_TYPES;
  return saved;
}

function txDelta(t: any) {
  if (!t || !t.account) return null;
  const amount = Number(t.amount) || 0;
  if (t.type === 'income') return { id: t.account, delta: +amount };
  if (t.type === 'expense') return { id: t.account, delta: -amount };
  return null;
}

function applyDelta(accounts: any[], delta: any) {
  if (!delta) return accounts;
  return accounts.map((a) => (a.id === delta.id ? { ...a, balance: (Number(a.balance) || 0) + delta.delta } : a));
}

function reducer(state: any, action: any): any {
  switch (action.type) {
    case 'HYDRATE': return { ...emptyState(), ...action.payload };
    case 'RESET_ALL': return emptyState();
    case 'LOAD_SAMPLE_DATA': return sampleState();
    case 'IMPORT_DATA': return { ...emptyState(), ...action.payload };

    case 'ADD_TRANSACTION': {
      const t = action.payload;
      const accounts = applyDelta(state.accounts, txDelta(t));
      return { ...state, transactions: [t, ...state.transactions], accounts };
    }
    case 'UPDATE_TRANSACTION': {
      const newT = action.payload;
      const oldT = state.transactions.find((t: any) => t.id === newT.id);
      let accounts = applyDelta(state.accounts, oldT ? { id: txDelta(oldT)?.id, delta: -(txDelta(oldT)?.delta || 0) } : null);
      accounts = applyDelta(accounts, txDelta(newT));
      return { ...state, transactions: state.transactions.map((t: any) => (t.id === newT.id ? newT : t)), accounts };
    }
    case 'DELETE_TRANSACTION': {
      const t = state.transactions.find((t: any) => t.id === action.payload);
      const d = txDelta(t);
      const accounts = d ? applyDelta(state.accounts, { id: d.id, delta: -d.delta }) : state.accounts;
      return { ...state, transactions: state.transactions.filter((t: any) => t.id !== action.payload), accounts };
    }

    case 'ADD_ACCOUNT': return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT': return { ...state, accounts: state.accounts.map((a: any) => (a.id === action.payload.id ? action.payload : a)) };
    case 'DELETE_ACCOUNT': return { ...state, accounts: state.accounts.filter((a: any) => a.id !== action.payload) };

    case 'ADD_ASSET': return { ...state, assets: [...state.assets, action.payload] };
    case 'UPDATE_ASSET': return { ...state, assets: state.assets.map((a: any) => (a.id === action.payload.id ? action.payload : a)) };
    case 'DELETE_ASSET': return { ...state, assets: state.assets.filter((a: any) => a.id !== action.payload) };

    case 'ADD_ASSET_TYPE': return { ...state, assetTypes: [...(state.assetTypes || []), action.payload] };
    case 'UPDATE_ASSET_TYPE': return { ...state, assetTypes: (state.assetTypes || []).map((t: any) => (t.id === action.payload.id ? action.payload : t)) };
    case 'DELETE_ASSET_TYPE': return { ...state, assetTypes: (state.assetTypes || []).filter((t: any) => t.id !== action.payload) };

    case 'ADD_LIABILITY': return { ...state, liabilities: [...state.liabilities, action.payload] };
    case 'UPDATE_LIABILITY': return { ...state, liabilities: state.liabilities.map((l: any) => (l.id === action.payload.id ? action.payload : l)) };
    case 'DELETE_LIABILITY': return { ...state, liabilities: state.liabilities.filter((l: any) => l.id !== action.payload) };

    case 'ADD_LIABILITY_TYPE': return { ...state, liabilityTypes: [...(state.liabilityTypes || []), action.payload] };
    case 'UPDATE_LIABILITY_TYPE': return { ...state, liabilityTypes: (state.liabilityTypes || []).map((t: any) => (t.id === action.payload.id ? action.payload : t)) };
    case 'DELETE_LIABILITY_TYPE': return { ...state, liabilityTypes: (state.liabilityTypes || []).filter((t: any) => t.id !== action.payload) };

    case 'ADD_BUDGET': return { ...state, budgets: [...state.budgets, action.payload] };
    case 'UPDATE_BUDGET': return { ...state, budgets: state.budgets.map((b: any) => (b.id === action.payload.id ? action.payload : b)) };
    case 'DELETE_BUDGET': return { ...state, budgets: state.budgets.filter((b: any) => b.id !== action.payload) };

    case 'ADD_EVENT': return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT': return { ...state, events: state.events.map((e: any) => (e.id === action.payload.id ? action.payload : e)) };
    case 'DELETE_EVENT': return { ...state, events: state.events.filter((e: any) => e.id !== action.payload) };

    case 'ADD_INSURANCE': return { ...state, insurance: [...state.insurance, action.payload] };
    case 'UPDATE_INSURANCE': return { ...state, insurance: state.insurance.map((i: any) => (i.id === action.payload.id ? action.payload : i)) };
    case 'DELETE_INSURANCE': return { ...state, insurance: state.insurance.filter((i: any) => i.id !== action.payload) };

    case 'ADD_EXPENSE_CATEGORY': return { ...state, expenseCategories: [...state.expenseCategories, action.payload] };
    case 'UPDATE_EXPENSE_CATEGORY': return { ...state, expenseCategories: state.expenseCategories.map((c: any) => (c.id === action.payload.id ? action.payload : c)) };
    case 'DELETE_EXPENSE_CATEGORY': return { ...state, expenseCategories: state.expenseCategories.filter((c: any) => c.id !== action.payload) };

    case 'ADD_INCOME_CATEGORY': return { ...state, incomeCategories: [...state.incomeCategories, action.payload] };
    case 'UPDATE_INCOME_CATEGORY': return { ...state, incomeCategories: state.incomeCategories.map((c: any) => (c.id === action.payload.id ? action.payload : c)) };
    case 'DELETE_INCOME_CATEGORY': return { ...state, incomeCategories: state.incomeCategories.filter((c: any) => c.id !== action.payload) };

    case 'ADD_GROUP': return { ...state, groups: [...state.groups, action.payload] };
    case 'UPDATE_GROUP': return { ...state, groups: state.groups.map((g: any) => (g.id === action.payload.id ? action.payload : g)) };
    case 'DELETE_GROUP': return { ...state, groups: state.groups.filter((g: any) => g.id !== action.payload) };

    case 'UPDATE_HOUSEHOLD': return { ...state, household: { ...state.household, ...action.payload } };

    case 'ADD_MEMBER': return { ...state, household: { ...state.household, members: [...(state.household.members || []), action.payload] } };
    case 'UPDATE_MEMBER': return { ...state, household: { ...state.household, members: (state.household.members || []).map((m: any) => (m.id === action.payload.id ? action.payload : m)) } };
    case 'DELETE_MEMBER': return { ...state, household: { ...state.household, members: (state.household.members || []).filter((m: any) => m.id !== action.payload) } };

    default: return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, emptyState);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hydrated, setHydrated] = useState(false);
  // Sensitive amounts are masked on every sign-in; the header eye-toggle
  // reveals them for the session. Mirrors the web app's amountsHidden.
  const [amountsHidden, setAmountsHiddenState] = useState(true);
  // "Replay Welcome Guide" in Settings flips this; the app layout shows the
  // OnboardingTour overlay whenever it's true, from any screen.
  const [forceOnboarding, setForceOnboarding] = useState(false);
  // True only for the moment right after an interactive Google sign-in this
  // process — lets the app layout skip the PIN lock once, so a fresh sign-in
  // doesn't immediately re-prompt for a PIN too. Resumed sessions (identity
  // restored from storage on cold start) never set this, so they still lock.
  const [justSignedIn, setJustSignedIn] = useState(false);

  // Flip the format-module flag synchronously so the very next render (from
  // this same state update) already shows the new masked/revealed state.
  const toggleAmounts = () => setAmountsHiddenState((v) => { const next = !v; setAmountsHidden(next); return next; });

  // AsyncStorage is async (unlike localStorage), so we start from emptyState
  // synchronously and hydrate once on mount, gating the save-effect behind
  // `hydrated` so it can't clobber real saved data with the initial empty one.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DATA_KEY);
        if (raw) dispatch({ type: 'HYDRATE', payload: normalizeLoaded(JSON.parse(raw)) });
      } catch {
        // ignore corrupt storage, start fresh
      }
      try {
        const identity = await getIdentity();
        setCurrentUser(identity);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(DATA_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const loginWithGoogle = (identity: any) => {
    // Always start a fresh session with amounts masked.
    setAmountsHidden(true);
    setAmountsHiddenState(true);
    setJustSignedIn(true);
    setCurrentUser(identity);
  };

  const logout = async () => {
    // Signing out only ends the app session — Drive stays connected so the
    // user isn't asked to reconnect it every time they sign back in.
    await clearIdentity();
    setCurrentUser(null);
  };

  const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Restore an imported backup (same JSON shape the web/mobile apps export).
  const importData = (payload: any) => dispatch({ type: 'HYDRATE', payload: normalizeLoaded(payload) });

  const fmt = (n: any) => (amountsHidden ? '••••••' : '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN'));
  const fmtSigned = (n: any) => {
    if (amountsHidden) return '••••••';
    const num = Number(n) || 0;
    return (num < 0 ? '-' : '') + '₹' + Math.abs(num).toLocaleString('en-IN');
  };
  const fmtN = (n: any) => (amountsHidden ? '••••••' : Number(n || 0).toLocaleString('en-IN'));

  return (
    <AppContext.Provider value={{ state, dispatch, currentUser, hydrated, loginWithGoogle, logout, uid, amountsHidden, toggleAmounts, importData, fmt, fmtSigned, fmtN, forceOnboarding, setForceOnboarding, justSignedIn, setJustSignedIn }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
