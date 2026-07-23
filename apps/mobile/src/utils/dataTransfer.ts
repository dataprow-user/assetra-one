// Mobile port of apps/web/src/utils/exportData.js — same JSON payload, CSV
// columns and multi-sheet Excel, so the web and mobile apps can restore each
// other's backups. Uses the SDK-54 expo-file-system File API + expo-sharing to
// write to the cache and hand the file to the OS share sheet, and
// expo-document-picker to import.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';

const dateTag = () => new Date().toISOString().split('T')[0];

const TX_COLS = ['date', 'type', 'group', 'category', 'subcategory', 'amount', 'account', 'notes'];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function buildPayload(state: any) {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    household: state.household,
    accounts: state.accounts || [],
    transactions: state.transactions || [],
    assets: state.assets || [],
    assetTypes: state.assetTypes || [],
    liabilities: state.liabilities || [],
    liabilityTypes: state.liabilityTypes || [],
    budgets: state.budgets || [],
    events: state.events || [],
    insurance: state.insurance || [],
    expenseCategories: state.expenseCategories || [],
    incomeCategories: state.incomeCategories || [],
    groups: state.groups || [],
  };
}

async function writeAndShare(name: string, content: string, mimeType: string, encoding: 'utf8' | 'base64' = 'utf8') {
  const file = new File(Paths.cache, name);
  try { if (file.exists) file.delete(); } catch {}
  file.create();
  file.write(content, { encoding });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name, UTI: mimeType });
  }
  return file.uri;
}

function sheetFromRows(data: any[], cols: string[]) {
  const rows = (data || []).map((r) => {
    const o: any = {};
    cols.forEach((c) => { o[c] = r[c] ?? ''; });
    return o;
  });
  return rows.length ? XLSX.utils.json_to_sheet(rows, { header: cols }) : XLSX.utils.aoa_to_sheet([cols]);
}

export async function exportJSON(state: any) {
  return writeAndShare(`assetra-backup-${dateTag()}.json`, JSON.stringify(buildPayload(state), null, 2), 'application/json');
}

export async function exportCSV(state: any) {
  const csv = XLSX.utils.sheet_to_csv(sheetFromRows(state.transactions || [], TX_COLS));
  return writeAndShare(`assetra-transactions-${dateTag()}.csv`, csv, 'text/csv');
}

const EXCEL_SHEETS = [
  { name: 'Transactions', key: 'transactions', cols: TX_COLS },
  { name: 'Accounts', key: 'accounts', cols: ['name', 'type', 'balance', 'currency'] },
  { name: 'Assets', key: 'assets', cols: ['name', 'type', 'quantity', 'unit', 'purchasePrice', 'currentPrice', 'notes'] },
  { name: 'Liabilities', key: 'liabilities', cols: ['name', 'type', 'principal', 'interestRate', 'tenureMonths', 'emi', 'outstanding', 'startDate'] },
  { name: 'Budgets', key: 'budgets', cols: ['month', 'year', 'category', 'subcategory', 'group', 'plannedAmount'] },
  { name: 'Events', key: 'events', cols: ['name', 'startDate', 'endDate', 'budget'] },
  { name: 'Insurance', key: 'insurance', cols: ['name', 'type', 'premium', 'sumAssured', 'nominee', 'nextDue'] },
];

export async function exportExcel(state: any) {
  const wb = XLSX.utils.book_new();
  EXCEL_SHEETS.forEach(({ name, key, cols }) => XLSX.utils.book_append_sheet(wb, sheetFromRows(state[key], cols), name));
  const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  return writeAndShare(`assetra-data-${dateTag()}.xlsx`, b64, XLSX_MIME, 'base64');
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export async function exportReport(state: any, opts: { period: 'monthly' | 'yearly'; year: number; month: number }) {
  const { period, year, month } = opts;
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const prefix = period === 'yearly' ? y : `${y}-${m}`;

  const txns = (state.transactions || [])
    .filter((t: any) => typeof t.date === 'string' && t.date.startsWith(prefix))
    .sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
  const sum = (type: string) => txns.filter((t: any) => t.type === type).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
  const income = sum('income');
  const expense = sum('expense');
  const net = income - expense;

  const byCat: Record<string, number> = {};
  txns.filter((t: any) => t.type === 'expense').forEach((t: any) => {
    const k = t.category || 'Uncategorized';
    byCat[k] = (byCat[k] || 0) + (Number(t.amount) || 0);
  });

  const periodLabel = period === 'yearly' ? y : `${MONTHS[month - 1]} ${y}`;
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
    ...Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ Metric: cat, Value: amt })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows, { header: ['Metric', 'Value'] }), 'Summary');
  XLSX.utils.book_append_sheet(wb, sheetFromRows(txns, TX_COLS), 'Transactions');
  const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  await writeAndShare(`assetra-report-${period}-${prefix}.xlsx`, b64, XLSX_MIME, 'base64');
  return { count: txns.length, income, expense, net };
}

// Opens the OS file picker, reads the chosen JSON and returns the parsed
// payload (or null if the user cancelled). Throws on an unreadable/!JSON file.
export async function pickBackupJson() {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/*', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const file = new File(res.assets[0].uri);
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('This file is not a valid Assetra backup.');
  return data;
}
