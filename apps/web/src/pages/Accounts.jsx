import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, Wallet, CreditCard, Banknote } from 'lucide-react';
import { MAX_NAME_LENGTH, MAX_AMOUNT, blockInvalidSignedNumberKeys } from '../utils/validation';
import { useFieldErrors } from '../hooks/useFieldErrors';
import { fmtBal as fmt } from '../utils/format';
import './Accounts.css';

const ACCOUNT_TYPES = ['bank', 'wallet', 'credit_card', 'demat', 'cash'];
const TYPE_ICONS = { bank: Wallet, wallet: Wallet, credit_card: CreditCard, demat: Banknote, cash: Banknote };
const TYPE_COLORS = { bank: 'var(--green)', wallet: 'var(--blue)', credit_card: 'var(--red)', demat: 'var(--accent-light)', cash: 'var(--yellow)' };

const emptyForm = () => ({ name: '', type: 'bank', balance: '', currency: 'INR' });

const NUMERIC_RULES = {
  balance: { label: 'Balance', min: -MAX_AMOUNT, max: MAX_AMOUNT },
};

export default function Accounts() {
  const { state, dispatch, uid } = useApp();
  const { accounts, transactions } = state;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const { errors, validate, reset: resetErrors, hasErrors } = useFieldErrors();

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (NUMERIC_RULES[k]) validate(k, val, NUMERIC_RULES[k]);
  };

  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = (a) => { setForm({ ...a }); resetErrors(); setModal({ mode: 'edit', data: a }); };

  const handleSubmit = e => {
    e.preventDefault();
    const fieldErrors = Object.entries(NUMERIC_RULES).map(([k, rules]) => validate(k, form[k], rules));
    if (hasErrors || fieldErrors.some(Boolean)) return;
    const payload = { ...form, balance: Number(form.balance) };
    if (modal.mode === 'add') {
      dispatch({ type: 'ADD_ACCOUNT', payload: { ...payload, id: uid() } });
    } else {
      dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...payload, id: modal.data.id } });
    }
    setModal(null);
  };

  const handleDelete = id => {
    if (window.confirm('Delete this account? Existing transactions will remain.')) dispatch({ type: 'DELETE_ACCOUNT', payload: id });
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Accounts</div>
          <div className="page-subtitle">{accounts.length} accounts &bull; Total balance: <span className={totalBalance >= 0 ? 'text-green' : 'text-red'}>{fmt(totalBalance)}</span></div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Account</button>
      </div>

      <div className="accounts-grid">
        {accounts.length === 0 && <div className="section-box empty-state"><Wallet size={40}/><h3>No Accounts</h3><p>Add your bank accounts, credit cards, and wallets</p></div>}
        {accounts.map(a => {
          const Icon = TYPE_ICONS[a.type] || Wallet;
          const color = TYPE_COLORS[a.type] || 'var(--accent-light)';
          const accTxns = transactions.filter(t => t.account === a.id);
          return (
            <div key={a.id} className="account-card section-box">
              <div className="acc-card-top">
                <div className="acc-icon" style={{ background: color + '22', color }}><Icon size={20}/></div>
                <div className="actions-cell">
                  <button className="act-btn edit" onClick={() => openEdit(a)}><Edit2 size={14}/></button>
                  <button className="act-btn delete" onClick={() => handleDelete(a.id)}><Trash2 size={14}/></button>
                </div>
              </div>
              <div className="acc-name">{a.name}</div>
              <div className="acc-type badge" style={{ background: color + '22', color, marginBottom: 16 }}>{a.type.replace('_', ' ')}</div>
              <div className={`acc-balance ${a.balance < 0 ? 'amount-negative' : 'amount-positive'}`}>{fmt(a.balance)}</div>
              <div className="acc-meta">{accTxns.length} transactions &bull; {a.currency}</div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Account' : 'Edit Account'} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Account Name</label>
              <input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. HDFC Savings" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="input" value={form.type} onChange={set('type')}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Balance (₹)</label>
                <input className={`input ${errors.balance ? 'input-invalid' : ''}`} type="number" required min={-MAX_AMOUNT} max={MAX_AMOUNT}
                  onKeyDown={blockInvalidSignedNumberKeys} value={form.balance} onChange={set('balance')} />
                {errors.balance && <span className="field-error">{errors.balance}</span>}
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select className="input" value={form.currency} onChange={set('currency')}>
                  <option>INR</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode === 'add' ? 'Add Account' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
