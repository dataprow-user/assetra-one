import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import { Wallet } from 'lucide-react';
import { MAX_NOTES_LENGTH } from '../utils/validation';
import { fmt, fmtSigned } from '../utils/format';

const MAX_TRANSACTION_AMOUNT = 9999999999; // 9.99B ceiling — guards against fat-fingered digits

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  type: 'expense', group: '', category: '', subcategory: '',
  amount: '', account: '', eventId: '', notes: '',
});

function validateAmount(val) {
  if (val === '' || val === null || val === undefined) return 'Amount is required.';
  const num = Number(val);
  if (Number.isNaN(num)) return 'Enter a valid number.';
  if (num <= 0) return 'Amount must be greater than 0.';
  if (num > MAX_TRANSACTION_AMOUNT) return `Amount is too large (max ₹${MAX_TRANSACTION_AMOUNT.toLocaleString('en-IN')}).`;
  const decimals = (String(val).split('.')[1] || '').length;
  if (decimals > 2) return 'Only up to 2 decimal places are allowed.';
  return '';
}

// Blocks characters that make <input type="number"> accept scientific notation or signs
function blockInvalidAmountKeys(e) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
}

/**
 * Shared Add/Edit Transaction form — used both by the Transactions page and
 * the app-wide "Add Transaction" floating action button, so the two never
 * drift out of sync.
 */
export default function TransactionFormModal({ mode, transaction, onClose, onError = (msg) => alert(msg) }) {
  const { state, dispatch, uid } = useApp();
  const { accounts, expenseCategories, incomeCategories, events = [] } = state;

  const [form, setForm] = useState(() =>
    mode === 'edit' && transaction ? { ...transaction, eventId: transaction.eventId || '' } : emptyForm()
  );
  const [amountError, setAmountError] = useState('');
  const [dateError, setDateError] = useState('');

  // Transactions record something that already happened — no future dates.
  const today = new Date().toISOString().split('T')[0];

  const activeCats    = form.type === 'income' ? incomeCategories : expenseCategories;
  const selectedCat    = activeCats.find(c => c.name === form.category);
  const subcatOptions  = selectedCat?.subcategories || [];
  const selectedAcc    = accounts.find(a => a.id === form.account);

  const set = k => e => {
    const val = e.target.value;
    if (k === 'amount') setAmountError(validateAmount(val));
    if (k === 'date')   setDateError(val && val > today ? 'Date cannot be in the future.' : '');
    setForm(f => {
      const u = { ...f, [k]: val };
      if (k === 'type')     { u.group = ''; u.category = ''; u.subcategory = ''; }
      if (k === 'group')    { u.category = ''; u.subcategory = ''; }
      if (k === 'category') {
        u.subcategory = '';
        const allCats = u.type === 'income' ? incomeCategories : expenseCategories;
        const found = allCats.find(c => c.name === val);
        if (found?.group) u.group = found.group;
      }
      return u;
    });
  };

  const handleSubmit = e => {
    e.preventDefault();

    const amtErr = validateAmount(form.amount);
    if (amtErr) { setAmountError(amtErr); return; }

    if (!form.date) { setDateError('Date is required.'); return; }
    if (form.date > today) { setDateError('Date cannot be in the future.'); return; }

    if (!form.account) {
      onError('Please select an account for this transaction.');
      return;
    }

    const payload = { ...form, amount: Number(form.amount) };
    if (mode === 'add') dispatch({ type: 'ADD_TRANSACTION',    payload: { ...payload, id: uid() } });
    else                dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...payload, id: transaction.id } });
    onClose();
  };

  // Live balance preview after this transaction
  const liveAmt  = Number(form.amount) || 0;
  const accBal   = Number(selectedAcc?.balance) || 0;
  const afterBal = form.type === 'income' ? accBal + liveAmt : accBal - liveAmt;

  return (
    <Modal title={mode === 'add' ? 'Add Transaction' : 'Edit Transaction'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        {/* Type + Date */}
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select className="input" value={form.type} onChange={set('type')}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              className={`input ${dateError ? 'input-invalid' : ''}`}
              type="date"
              required
              max={today}
              value={form.date}
              onChange={set('date')}
              aria-invalid={!!dateError}
            />
            {dateError && <span className="field-error">{dateError}</span>}
          </div>
        </div>

        {/* Category — group auto-fills */}
        <div className="form-group">
          <label>Category</label>
          <select className="input" required value={form.category} onChange={set('category')}>
            <option value="">— Select Category —</option>
            {activeCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          {form.group && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: 4, display: 'block' }}>
              📁 Group: <strong style={{ color: 'var(--accent-light)' }}>{form.group}</strong>
            </span>
          )}
        </div>

        {/* Subcategory */}
        <div className="form-group">
          <label>Sub-Category <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>(optional)</span></label>
          <select className="input" value={form.subcategory} onChange={set('subcategory')} disabled={subcatOptions.length === 0}>
            <option value="">— Select Sub-Category —</option>
            {subcatOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Amount + Account */}
        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              className={`input ${amountError ? 'input-invalid' : ''}`}
              type="number"
              required
              min="0.01"
              step="0.01"
              max={MAX_TRANSACTION_AMOUNT}
              value={form.amount}
              onChange={set('amount')}
              onKeyDown={blockInvalidAmountKeys}
              aria-invalid={!!amountError}
            />
            {amountError && <span className="field-error">{amountError}</span>}
          </div>
          <div className="form-group">
            <label>Account</label>
            <select className="input" required value={form.account} onChange={set('account')}>
              <option value="">— Select Account —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmtSigned(a.balance)})</option>)}
            </select>
            {/* Live balance preview */}
            {selectedAcc && liveAmt > 0 && (
              <div className="acc-balance-hint">
                <Wallet size={12}/>
                <span>Current: <strong>{fmtSigned(accBal)}</strong></span>
                <span className="hint-arrow">→</span>
                <span>After: <strong className={afterBal >= 0 ? 'text-green' : 'text-red'}>{fmtSigned(afterBal)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Event link */}
        {events.length > 0 && (
          <div className="form-group">
            <label>Link to Event <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>(optional)</span></label>
            <select className="input" value={form.eventId} onChange={set('eventId')}>
              <option value="">— No Event —</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="form-group">
          <label>Notes <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>(optional)</span></label>
          <input className="input" maxLength={MAX_NOTES_LENGTH} placeholder="Any extra detail..." value={form.notes} onChange={set('notes')} />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'add' ? 'Add Transaction' : 'Update'}</button>
        </div>
      </form>
    </Modal>
  );
}
