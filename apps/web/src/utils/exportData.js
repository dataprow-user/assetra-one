/**
 * exportData.js
 * Unified export helpers for JSON, multi-sheet Excel (.xlsx), and CSV.
 */

import * as XLSX from 'xlsx';

// ── filename helper ────────────────────────────────────────────────────────────
const dateTag = () => new Date().toISOString().split('T')[0];

// ── blob download helper ───────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Build full payload object ──────────────────────────────────────────────────
export function buildPayload(state) {
  return {
    exportedAt:        new Date().toISOString(),
    version:           '1.0',
    household:         state.household,
    accounts:          state.accounts          || [],
    transactions:      state.transactions      || [],
    assets:            state.assets            || [],
    assetTypes:        state.assetTypes        || [],
    liabilities:       state.liabilities       || [],
    liabilityTypes:    state.liabilityTypes    || [],
    budgets:           state.budgets           || [],
    events:            state.events            || [],
    insurance:         state.insurance         || [],
    expenseCategories: state.expenseCategories || [],
    incomeCategories:  state.incomeCategories  || [],
    groups:            state.groups            || [],
  };
}

// ── JSON export ────────────────────────────────────────────────────────────────
export function exportJSON(state) {
  const json = JSON.stringify(buildPayload(state), null, 2);
  downloadBlob(new Blob([json], { type: 'application/json' }), `assetra-backup-${dateTag()}.json`);
}

// ── Excel export (multi-sheet) ─────────────────────────────────────────────────
export function exportExcel(state) {
  const wb = XLSX.utils.book_new();

  const sheets = [
    {
      name: 'Transactions',
      data: (state.transactions || []),
      cols: ['date','type','group','category','subcategory','amount','account','notes'],
    },
    {
      name: 'Accounts',
      data: (state.accounts || []),
      cols: ['name','type','balance','currency'],
    },
    {
      name: 'Assets',
      data: (state.assets || []),
      cols: ['name','type','quantity','unit','purchasePrice','currentPrice','notes'],
    },
    {
      name: 'Liabilities',
      data: (state.liabilities || []),
      cols: ['name','type','principal','interestRate','tenureMonths','emi','outstanding','startDate'],
    },
    {
      name: 'Budgets',
      data: (state.budgets || []),
      cols: ['month','year','category','subcategory','group','plannedAmount'],
    },
    {
      name: 'Events',
      data: (state.events || []),
      cols: ['name','startDate','endDate','budget'],
    },
    {
      name: 'Insurance',
      data: (state.insurance || []),
      cols: ['name','type','premium','sumAssured','nominee','nextDue'],
    },
  ];

  sheets.forEach(({ name, data, cols }) => {
    // Map rows to only selected columns
    const rows = (data || []).map(r => {
      const obj = {};
      cols.forEach(c => { obj[c] = r[c] ?? ''; });
      return obj;
    });
    const ws = rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: cols })
      : XLSX.utils.aoa_to_sheet([cols]); // empty sheet with header only
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `assetra-data-${dateTag()}.xlsx`,
  );
}

// ── CSV export (single entity, chosen by caller) ───────────────────────────────
export function exportCSV(rows, cols, label) {
  const ws  = XLSX.utils.json_to_sheet((rows || []).map(r => {
    const o = {}; cols.forEach(c => { o[c] = r[c] ?? ''; }); return o;
  }), { header: cols });
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `assetra-${label}-${dateTag()}.csv`);
}

// ── Monthly / Yearly report ────────────────────────────────────────────────────
// Filters transactions to a period, then downloads a multi-sheet Excel report:
//   • Summary   — income / expense / net + a per-category expense breakdown
//   • Transactions — every txn in the period
// `period` is 'monthly' | 'yearly'; month is 1-12 (ignored for yearly).
// Returns { count, income, expense, net } so the caller can show a toast.
export function exportReport(state, { period, year, month }) {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const prefix = period === 'yearly' ? y : `${y}-${m}`;

  const txns = (state.transactions || [])
    .filter(t => typeof t.date === 'string' && t.date.startsWith(prefix))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const sum = (type) => txns
    .filter(t => t.type === type)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const income = sum('income');
  const expense = sum('expense');
  const net = income - expense;

  // Per-category expense breakdown
  const byCat = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    const key = t.category || 'Uncategorized';
    byCat[key] = (byCat[key] || 0) + (Number(t.amount) || 0);
  });

  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const periodLabel = period === 'yearly' ? y : `${MONTH_NAMES[Number(month) - 1]} ${y}`;

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    { Metric: 'Report Type', Value: period === 'yearly' ? 'Yearly' : 'Monthly' },
    { Metric: 'Period', Value: periodLabel },
    { Metric: 'Household', Value: state.household?.name || '' },
    { Metric: 'Transactions', Value: txns.length },
    { Metric: 'Total Income', Value: income },
    { Metric: 'Total Expense', Value: expense },
    { Metric: 'Net Savings', Value: net },
    { Metric: '', Value: '' },
    { Metric: 'Expense by Category', Value: '' },
    ...Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ Metric: cat, Value: amt })),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows, { header: ['Metric', 'Value'] }),
    'Summary',
  );

  // Transactions sheet
  const cols = ['date','type','group','category','subcategory','amount','account','notes'];
  const txRows = txns.map(r => { const o = {}; cols.forEach(c => { o[c] = r[c] ?? ''; }); return o; });
  const txWs = txRows.length > 0
    ? XLSX.utils.json_to_sheet(txRows, { header: cols })
    : XLSX.utils.aoa_to_sheet([cols]);
  XLSX.utils.book_append_sheet(wb, txWs, 'Transactions');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `assetra-report-${period}-${prefix}.xlsx`,
  );

  return { count: txns.length, income, expense, net };
}

// ── Generate Blob for Cloud Sync ──────────────────────────────────────────────
export function getExportBlob(state, format) {
  if (format === 'json') {
    return new Blob([JSON.stringify(buildPayload(state), null, 2)], { type: 'application/json' });
  }
  if (format === 'csv') {
    const cols = ['date','type','group','category','subcategory','amount','account','notes'];
    const ws = XLSX.utils.json_to_sheet((state.transactions || []).map(r => {
      const o = {}; cols.forEach(c => { o[c] = r[c] ?? ''; }); return o;
    }), { header: cols });
    return new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv' });
  }
  // Excel
  const wb = XLSX.utils.book_new();
  const sheets = [
    { name: 'Transactions', data: state.transactions, cols: ['date','type','group','category','subcategory','amount','account','notes'] },
    { name: 'Accounts', data: state.accounts, cols: ['name','type','balance','currency'] },
    { name: 'Assets', data: state.assets, cols: ['name','type','quantity','unit','purchasePrice','currentPrice','notes'] },
    { name: 'Liabilities', data: state.liabilities, cols: ['name','type','principal','interestRate','tenureMonths','emi','outstanding','startDate'] },
    { name: 'Budgets', data: state.budgets, cols: ['month','year','category','subcategory','group','plannedAmount'] },
    { name: 'Events', data: state.events, cols: ['name','startDate','endDate','budget'] },
    { name: 'Insurance', data: state.insurance, cols: ['name','type','premium','sumAssured','nominee','nextDue'] },
  ];
  sheets.forEach(({ name, data, cols }) => {
    const rows = (data || []).map(r => { const obj = {}; cols.forEach(c => { obj[c] = r[c] ?? ''; }); return obj; });
    const ws = rows.length > 0 ? XLSX.utils.json_to_sheet(rows, { header: cols }) : XLSX.utils.aoa_to_sheet([cols]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
