// Ported 1:1 from apps/web/src/data/categories.js — keep both in sync.

export const DEFAULT_GROUPS = [
  { id: 'g-001', name: 'Needs' },
  { id: 'g-002', name: 'Wants' },
  { id: 'g-003', name: 'Need & Want' },
  { id: 'g-004', name: 'Contribution' },
  { id: 'g-005', name: 'Investment' },
  { id: 'g-006', name: 'Insurance' },
  { id: 'g-007', name: 'Savings' },
];

export const GROUPS = DEFAULT_GROUPS.map(g => g.name);

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'ec-001', name: 'Groceries', group: 'Needs', subcategories: ['Rice/Grains', 'Vegetables & Fruits', 'Dairy', 'Meat/Fish', 'Household Supplies', 'Others'] },
  { id: 'ec-002', name: 'Dining Out', group: 'Wants', subcategories: ['Restaurant', 'Fast Food', 'Coffee/Tea', 'Snacks', 'Others'] },
  { id: 'ec-003', name: 'Housing', group: 'Needs', subcategories: ['Rent', 'Maintenance/Repairs', 'Electricity', 'Water', 'Gas', 'Others'] },
  { id: 'ec-004', name: 'Transportation', group: 'Needs', subcategories: ['Fuel', 'Public Transport', 'Cab/Auto', 'Vehicle Service', 'Parking/Toll', 'Others'] },
  { id: 'ec-005', name: 'Health & Medical', group: 'Needs', subcategories: ['Doctor Visit', 'Medicine', 'Lab Tests', 'Hospital', 'Others'] },
  { id: 'ec-006', name: 'Family & Education', group: 'Need & Want', subcategories: ['Kids Education', 'Tuition/Classes', 'Family Outing', 'Parent Care', 'Others'] },
  { id: 'ec-007', name: 'Shopping', group: 'Wants', subcategories: ['Clothing', 'Electronics', 'Home Items', 'Others'] },
  { id: 'ec-008', name: 'Entertainment', group: 'Wants', subcategories: ['Movies', 'OTT Subscriptions', 'Events/Concerts', 'Gaming', 'Others'] },
  { id: 'ec-009', name: 'Travel', group: 'Wants', subcategories: ['Flight/Train/Bus', 'Hotel Stay', 'Local Transport', 'Sightseeing', 'Others'] },
  { id: 'ec-010', name: 'Bills & Recharges', group: 'Needs', subcategories: ['Mobile', 'Internet/DTH', 'Subscriptions', 'Others'] },
  { id: 'ec-011', name: 'Loan & EMI Payments', group: 'Needs', subcategories: ['Home Loan', 'Vehicle Loan', 'Personal Loan', 'Credit Card Payment', 'Interest', 'Others'] },
  { id: 'ec-012', name: 'Gifts & Donations', group: 'Wants', subcategories: ['Birthday', 'Wedding', 'Festival', 'Charity', 'Others'] },
  { id: 'ec-013', name: 'Investments', group: 'Investment', subcategories: ['Mutual Fund SIP', 'Stocks', 'Fixed Deposit', 'PF/EPF', 'NPS', 'Others'] },
  { id: 'ec-014', name: 'Insurance', group: 'Insurance', subcategories: ['Life/Term Premium', 'Health Premium', 'Vehicle Insurance', 'Others'] },
  { id: 'ec-015', name: 'Miscellaneous', group: 'Needs', subcategories: ['Bank Charges', 'Postage/Courier', 'Stationery', 'Others'] },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { id: 'ic-001', name: 'Salary', group: 'Income', subcategories: ['Monthly Salary', 'Bonus', 'Incentive', 'Others'] },
  { id: 'ic-002', name: 'Business/Freelance', group: 'Income', subcategories: ['Project Income', 'Service Income', 'Consulting', 'Product Sale', 'Others'] },
  { id: 'ic-003', name: 'Interest & Dividends', group: 'Income', subcategories: ['Bank Interest', 'FD/RD Interest', 'Stock Dividend', 'Mutual Fund Dividend', 'Others'] },
  { id: 'ic-004', name: 'Rental Income', group: 'Income', subcategories: ['House Rent Received', 'Others'] },
  { id: 'ic-005', name: 'Refunds & Cashback', group: 'Income', subcategories: ['Refund', 'Cashback', 'Gift Received', 'Others'] },
  { id: 'ic-006', name: 'Others', group: 'Income', subcategories: ['Savings Withdrawal', 'Debt Repaid to Me', 'Others'] },
];
