// Groups - exported as objects so they can be stored in state and managed by the user
export const DEFAULT_GROUPS = [
  { id: 'g-001', name: 'Needs' },
  { id: 'g-002', name: 'Wants' },
  { id: 'g-003', name: 'Need & Want' },
  { id: 'g-004', name: 'Contribution' },
  { id: 'g-005', name: 'Investment' },
  { id: 'g-006', name: 'Insurance' },
  { id: 'g-007', name: 'Savings' },
];

// Keep GROUPS as a simple name array for backward compat (derived from DEFAULT_GROUPS)
export const GROUPS = DEFAULT_GROUPS.map(g => g.name);


// Default expense categories with group and subcategories
export const DEFAULT_EXPENSE_CATEGORIES = [
  {
    id: 'ec-001', name: 'Outside Food', group: 'Wants',
    subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee/Tea', 'Restaurant', 'Fast Food', 'Juice/Drinks']
  },
  {
    id: 'ec-002', name: 'Gifts', group: 'Wants',
    subcategories: ['Birthday Gift', 'Wedding Gift', 'Festival Gift', 'Anniversary Gift', 'Others']
  },
  {
    id: 'ec-003', name: 'Health/Medical', group: 'Needs',
    subcategories: ['Doctor Visit', 'Medicine', 'Lab Tests', 'Hospital', 'Dental', 'Vision', 'Physiotherapy', 'Others']
  },
  {
    id: 'ec-004', name: 'Chennai Home', group: 'Needs',
    subcategories: ['Maintenance', 'Repair', 'Renovation', 'Furniture', 'Appliances', 'Others']
  },
  {
    id: 'ec-005', name: 'Vellore Home', group: 'Needs',
    subcategories: ['Maintenance', 'Repair', 'Renovation', 'Furniture', 'Appliances', 'Others']
  },
  {
    id: 'ec-006', name: 'Kallakurichi Home', group: 'Needs',
    subcategories: ['Maintenance', 'Repair', 'Renovation', 'Furniture', 'Appliances', 'Others']
  },
  {
    id: 'ec-007', name: 'Home Rent', group: 'Needs',
    subcategories: ['Monthly Rent', 'Advance', 'Deposit', 'Maintenance Charge']
  },
  {
    id: 'ec-008', name: 'Home EB Bill', group: 'Needs',
    subcategories: ['Electricity', 'Water Bill', 'Gas Connection', 'Others']
  },
  {
    id: 'ec-009', name: 'Home Grocery', group: 'Needs',
    subcategories: ['Rice/Grains', 'Pulses/Dal', 'Oil', 'Spices', 'Packaged Food', 'Cleaning Items', 'Personal Care', 'Others']
  },
  {
    id: 'ec-010', name: 'Home Fruits & Veg', group: 'Needs',
    subcategories: ['Vegetables', 'Fruits', 'Leafy Greens', 'Others']
  },
  {
    id: 'ec-011', name: 'Home Meat', group: 'Needs',
    subcategories: ['Chicken', 'Mutton', 'Fish', 'Eggs', 'Others']
  },
  {
    id: 'ec-012', name: 'Home Gas', group: 'Needs',
    subcategories: ['LPG Cylinder', 'Gas Pipe', 'Others']
  },
  {
    id: 'ec-013', name: 'Home Other Expense', group: 'Needs',
    subcategories: ['Household Items', 'Decoration', 'Cleaning Service', 'Pest Control', 'Others']
  },
  {
    id: 'ec-014', name: 'Family Care', group: 'Need & Want',
    subcategories: ['Kids Education', 'Kids Activities', 'Family Outing', 'Clothes', 'Shoes', 'Others']
  },
  {
    id: 'ec-015', name: 'Parent Care', group: 'Needs',
    subcategories: ['Medicine', 'Doctor Visit', 'Monthly Expense', 'Hospital', 'Others']
  },
  {
    id: 'ec-016', name: 'EMI', group: 'Needs',
    subcategories: ['Home Loan EMI', 'Car Loan EMI', 'Personal Loan EMI', 'Gold Loan EMI', 'Other EMI']
  },
  {
    id: 'ec-017', name: 'Debt Return', group: 'Needs',
    subcategories: ['Friend/Family Repayment', 'Credit Card Payment', 'Others']
  },
  {
    id: 'ec-018', name: 'Interest Pay', group: 'Needs',
    subcategories: ['Loan Interest', 'Credit Card Interest', 'Others']
  },
  {
    id: 'ec-019', name: 'Recharges', group: 'Needs',
    subcategories: ['Mobile Prepaid', 'Mobile Postpaid', 'Broadband/WiFi', 'DTH/Cable TV', 'Others']
  },
  {
    id: 'ec-020', name: 'Fuel', group: 'Needs',
    subcategories: ['Petrol - Bike', 'Petrol - Car', 'Diesel', 'CNG', 'Others']
  },
  {
    id: 'ec-021', name: 'Vehicle', group: 'Need & Want',
    subcategories: ['Service', 'Insurance', 'Registration/Tax', 'Accessories', 'Tyres', 'Others']
  },
  {
    id: 'ec-022', name: 'Car Expense', group: 'Need & Want',
    subcategories: ['Fuel', 'Service/Maintenance', 'Repair', 'Parking', 'Toll', 'Others']
  },
  {
    id: 'ec-023', name: 'Travel', group: 'Wants',
    subcategories: ['Train Ticket', 'Flight Ticket', 'Bus Ticket', 'Hotel Stay', 'Local Cab/Auto', 'Food while Travel', 'Sightseeing', 'Others']
  },
  {
    id: 'ec-024', name: 'Entertainment', group: 'Wants',
    subcategories: ['Movies', 'OTT - Netflix', 'OTT - Prime', 'OTT - Hotstar', 'OTT - Other', 'Sports', 'Events/Concerts', 'Gaming', 'Others']
  },
  {
    id: 'ec-025', name: 'Credit To', group: 'Needs',
    subcategories: ['Given to Friend', 'Given to Family', 'Business Credit', 'Others']
  },
  {
    id: 'ec-026', name: 'New Things', group: 'Wants',
    subcategories: ['Electronics', 'Gadgets', 'Clothes/Fashion', 'Furniture', 'Kitchen Items', 'Others']
  },
  {
    id: 'ec-027', name: 'Extracurricular', group: 'Need & Want',
    subcategories: ['Sports Class', 'Music/Dance Class', 'Art Class', 'Tuition', 'Online Course', 'Others']
  },
  {
    id: 'ec-028', name: 'Miscellaneous', group: 'Needs',
    subcategories: ['Bank Charges', 'Postage/Courier', 'Stationery', 'Subscription', 'Others']
  },
  {
    id: 'ec-029', name: 'Seat', group: 'Needs',
    subcategories: ['Office Seat', 'Co-working', 'Others']
  },
  {
    id: 'ec-030', name: 'Contribution', group: 'Contribution',
    subcategories: ['EPF', 'Child Trust', 'Student Studies', 'Charity', 'Others']
  },
  {
    id: 'ec-031', name: 'Investment', group: 'Investment',
    subcategories: ['Mutual Fund SIP', 'Stocks', 'ETF', 'RD', 'Chit Fund', 'NPS', 'PF', 'FD', 'Others']
  },
  {
    id: 'ec-032', name: 'Insurance', group: 'Insurance',
    subcategories: ['Life/Term Premium', 'Health Premium', 'Car Insurance', 'Others']
  },
];

// Default income categories with subcategories
export const DEFAULT_INCOME_CATEGORIES = [
  {
    id: 'ic-001', name: 'Salary', group: 'Income',
    subcategories: ['Monthly Salary', 'Bonus', 'Incentive', 'Arrears', 'Advance Salary']
  },
  {
    id: 'ic-002', name: 'Debt', group: 'Income',
    subcategories: ['Friend Repaid', 'Family Repaid', 'Business Debt Received', 'Others']
  },
  {
    id: 'ic-003', name: 'Interest', group: 'Income',
    subcategories: ['Bank Interest', 'FD Interest', 'RD Interest', 'Loan Interest Received', 'Others']
  },
  {
    id: 'ic-004', name: 'Consulting', group: 'Income',
    subcategories: ['IT Consulting', 'Business Consulting', 'Freelance', 'Others']
  },
  {
    id: 'ic-005', name: 'Seat', group: 'Income',
    subcategories: ['Office Seat Income', 'Co-working Income', 'Others']
  },
  {
    id: 'ic-006', name: 'Savings', group: 'Income',
    subcategories: ['Savings Withdrawal', 'RD Maturity', 'FD Maturity', 'Others']
  },
  {
    id: 'ic-007', name: 'Paychek', group: 'Income',
    subcategories: ['Online Payment Received', 'Cheque', 'Cash', 'Others']
  },
  {
    id: 'ic-008', name: 'Inhand', group: 'Income',
    subcategories: ['Cash in Hand', 'Part Payment', 'Others']
  },
  {
    id: 'ic-009', name: 'Dividend', group: 'Income',
    subcategories: ['Stock Dividend', 'Mutual Fund Dividend', 'Others']
  },
  {
    id: 'ic-010', name: 'TASC', group: 'Income',
    subcategories: ['Project Income', 'Service Income', 'Others']
  },
  {
    id: 'ic-011', name: 'DataProw', group: 'Income',
    subcategories: ['Project Income', 'Consulting', 'Product Sale', 'Others']
  },
  {
    id: 'ic-012', name: 'AbsoluteData', group: 'Income',
    subcategories: ['Project Income', 'Service Income', 'Others']
  },
  {
    id: 'ic-013', name: 'Others', group: 'Income',
    subcategories: ['Rental Income', 'Gift Received', 'Refund', 'Cashback', 'Others']
  },
];
