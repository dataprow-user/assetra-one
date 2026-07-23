import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import TransactionFormModal from '../components/TransactionFormModal';
import { Edit2, Trash2, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fmt } from '../utils/format';
import './Transactions.css';

function goToAccounts() {
  window.dispatchEvent(new CustomEvent('a1:navigate', { detail: 'accounts' }));
}

export default function Transactions({ initialSearch = '' }) {
  const { state, dispatch } = useApp();
  const { transactions, accounts, expenseCategories, events = [] } = state;

  const [modal,  setModal]  = useState(null); // null | { mode, data? }
  const [filter, setFilter] = useState({ type: 'all', search: initialSearch, group: '' });
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const expenseGroups = [...new Set(expenseCategories.map(c => c.group))];

  const openEdit = t => setModal({ mode: 'edit', data: t });

  const handleDelete = id => {
    if (window.confirm('Delete this transaction?')) dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  };

  const filtered = transactions
    .filter(t => filter.type  === 'all' || t.type  === filter.type)
    .filter(t => filter.group === ''    || t.group === filter.group)
    .filter(t => {
      const q = filter.search.toLowerCase();
      return q === '' || t.category?.toLowerCase().includes(q) || t.subcategory?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="animate-in">
      {toast && (
        <div className={`txn-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">
            {filtered.length} records &bull; Income: <span className="text-green">{fmt(totalIncome)}</span> &bull; Expenses: <span className="text-red">{fmt(totalExpense)}</span>
          </div>
        </div>
      </div>

      {accounts.length === 0 && (
        <div className="txn-account-notice">
          <Wallet size={16}/>
          <span>You don't have any accounts yet — add one first so transactions can track a real balance.</span>
          <button className="btn btn-secondary btn-sm" onClick={goToAccounts}>Add Account</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="txn-filters section-box" style={{ marginBottom: 20, padding: '14px 20px', flexWrap:'wrap', gap:12 }}>
        <input className="input" style={{ maxWidth:220 }} placeholder="Search category / notes..."
          value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
        <div className="filter-tabs">
          {['all','income','expense'].map(t => (
            <button key={t} className={`filter-tab ${filter.type === t ? 'active' : ''}`}
              onClick={() => setFilter(f => ({ ...f, type: t, group: '' }))}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {filter.type !== 'income' && (
          <select className="input" style={{ maxWidth:180 }} value={filter.group}
            onChange={e => setFilter(f => ({ ...f, group: e.target.value }))}>
            <option value="">All Groups</option>
            {expenseGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Group</th><th>Category</th><th>Subcategory</th>
            <th>Account</th><th>Event</th><th className="td-right">Amount</th><th className="td-right">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8}><div className="empty-state"><p>No transactions found</p></div></td></tr>}
            {filtered.map(t => {
              const acc = accounts.find(a => a.id === t.account);
              const ev  = events.find(e => e.id === t.eventId);
              return (
                <tr key={t.id}>
                  <td style={{ color:'var(--text-2)', fontSize:'0.85rem', whiteSpace:'nowrap' }}>{t.date}</td>
                  <td>{t.group && <span className="badge badge-purple" style={{ fontSize:'0.75rem' }}>{t.group}</span>}</td>
                  <td>
                    <span className={`badge ${t.type==='income'?'badge-green':'badge-red'}`}>{t.category}</span>
                    {t.notes && <span style={{ display:'block', fontSize:'0.73rem', color:'var(--text-2)', marginTop:3 }}>{t.notes}</span>}
                  </td>
                  <td style={{ color:'var(--text-2)', fontSize:'0.85rem' }}>{t.subcategory||'—'}</td>
                  <td style={{ color:'var(--text-2)', fontSize:'0.85rem' }}>{acc?.name||'—'}</td>
                  <td>{ev && <span className="badge badge-blue" style={{ fontSize:'0.72rem' }}>{ev.name}</span>}</td>
                  <td className={`td-right ${t.type==='income'?'amount-positive':'amount-negative'}`}>
                    {t.type==='income'?'+':'-'}{fmt(t.amount)}
                  </td>
                  <td className="td-right"><div className="actions-cell">
                    <button className="act-btn edit"   onClick={() => openEdit(t)}><Edit2  size={15}/></button>
                    <button className="act-btn delete" onClick={() => handleDelete(t.id)}><Trash2 size={15}/></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <TransactionFormModal
          mode={modal.mode}
          transaction={modal.data}
          onClose={() => setModal(null)}
          onError={msg => showToast('error', msg)}
        />
      )}
    </div>
  );
}
