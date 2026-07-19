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
