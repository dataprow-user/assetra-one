// Rich seed data based on the architecture document — Kumar Family

const u1 = 'user-ravi-001';
const u2 = 'user-priya-002';
const acc1 = 'acc-hdfc-001';
const acc2 = 'acc-sbi-cc-002';
const acc3 = 'acc-cash-003';

export const SEED_USERS = [
  { id: u1, name: 'Ravi Kumar', email: 'ravi@kumar.family', role: 'admin', avatar: 'RK' },
  { id: u2, name: 'Priya Kumar', email: 'priya@kumar.family', role: 'member', avatar: 'PK' },
];

export const SEED_ACCOUNTS = [
  { id: acc1, name: 'HDFC Savings', type: 'bank', owner: u1, balance: 1_85_000, currency: 'INR' },
  { id: acc2, name: 'SBI Credit Card', type: 'credit_card', owner: u1, balance: -12_400, currency: 'INR' },
  { id: acc3, name: 'Cash', type: 'cash', owner: u2, balance: 8_500, currency: 'INR' },
];

export const SEED_ASSETS = [
  { id: 'asset-gold-001', name: '22K Gold', type: 'gold', quantity: 10, unit: 'grams', avgPrice: 6800, currentPrice: 7200, owner: u2 },
  { id: 'asset-mf-001', name: 'Axis Bluechip Fund', type: 'mutual_fund', quantity: 132.5, unit: 'units', avgPrice: 75.4, currentPrice: 91.2, owner: u1 },
  { id: 'asset-fd-001', name: 'SBI Fixed Deposit', type: 'fd', quantity: 1, unit: null, avgPrice: 2_00_000, currentPrice: 2_18_000, owner: u1 },
];

export const SEED_LIABILITIES = [
  { id: 'lib-home-001', name: 'Home Loan', type: 'home_loan', principal: 45_00_000, interestRate: 8.5, tenureMonths: 240, emi: 39_165, startDate: '2022-01-01', outstanding: 41_20_000 },
  { id: 'lib-gold-001', name: 'Gold Loan', type: 'gold_loan', principal: 50_000, interestRate: 9, tenureMonths: 12, emi: 4_392, startDate: '2026-04-01', outstanding: 37_500, collateral: 'asset-gold-001' },
];

export const SEED_BUDGETS = [
  { id: 'bud-001', name: 'Groceries', scope: 'category', category: 'Food', amount: 8000, spent: 6560, period: 'monthly', alertPct: 80 },
  { id: 'bud-002', name: 'Entertainment', scope: 'category', category: 'Entertainment', amount: 3000, spent: 1200, period: 'monthly', alertPct: 80 },
  { id: 'bud-003', name: 'Goa Trip Budget', scope: 'event', category: null, amount: 60000, spent: 22400, period: 'one_time', alertPct: 80 },
];

export const SEED_EVENTS = [
  { id: 'evt-001', name: 'Goa Trip 2026', startDate: '2026-12-20', endDate: '2026-12-27', budget: 60000, spent: 22400 },
];

export const SEED_INSURANCE = [
  { id: 'ins-001', name: 'LIC Term Plan', type: 'term', policyNo: 'LIC-12345', premium: 18000, frequency: 'yearly', sumAssured: 1_00_00_000, nextDue: '2027-01-15', owner: u1 },
  { id: 'ins-002', name: 'Star Health Family', type: 'health', policyNo: 'SH-98765', premium: 24000, frequency: 'yearly', sumAssured: 10_00_000, nextDue: '2026-08-10', owner: u1 },
];

export const SEED_TRANSACTIONS = [
  { id: 'txn-001', date: '2026-07-01', description: 'Monthly Salary', amount: 90000, type: 'income', category: 'Salary', account: acc1 },
  { id: 'txn-002', date: '2026-07-05', description: 'Home Loan EMI', amount: 39165, type: 'expense', category: 'EMI', account: acc1, linkedLiability: 'lib-home-001' },
  { id: 'txn-003', date: '2026-07-06', description: 'SIP - Axis Bluechip', amount: 10000, type: 'expense', category: 'Investment', account: acc1, linkedAsset: 'asset-mf-001' },
  { id: 'txn-004', date: '2026-07-10', description: 'Grocery - DMart', amount: 4200, type: 'expense', category: 'Food', account: acc1 },
  { id: 'txn-005', date: '2026-07-12', description: 'Electricity Bill', amount: 1800, type: 'expense', category: 'Utilities', account: acc1 },
  { id: 'txn-006', date: '2026-07-14', description: 'Restaurant Dinner', amount: 2400, type: 'expense', category: 'Food', account: acc2 },
  { id: 'txn-007', date: '2026-07-15', description: 'Gold Loan Interest', amount: 375, type: 'expense', category: 'Loan Interest', account: acc1, linkedLiability: 'lib-gold-001' },
  { id: 'txn-008', date: '2026-07-16', description: 'Netflix & Spotify', amount: 1049, type: 'expense', category: 'Entertainment', account: acc2 },
];
