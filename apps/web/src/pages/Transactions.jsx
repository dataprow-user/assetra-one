import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, Wallet } from 'lucide-react';
import { DEFAULT_GROUPS } from '../data/categories';
import './Transactions.css';

const fmt = (n) => '₹' + Math.abs(Number(n)).toLocaleString('en-IN');

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  type: 'expense', group: '', category: '', subcategory: '',
  amount: '', account: '', eventId: '', notes: '',
});

export default function Transactions() {
  const { state, dispatch, uid } = useApp();
  const { transactions, accounts, expenseCategories, incomeCategories, events = [] } = state;
  const groups = (state.groups && state.groups.length > 0) ? state.groups : DEFAULT_GROUPS;

  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(emptyForm());
  const [filter, setFilter] = useState({ type: 'all', search: '', group: '' });

  const activeCats     = form.type === 'income' ? incomeCategories : expenseCategories;
  const selectedCat    = activeCats.find(c => c.name === form.category);
  const subcatOptions  = selectedCat?.subcategories || [];
  const expenseGroups  = [...new Set(expenseCategories.map(c => c.group))];

  // Selected account info for live balance hint
  const selectedAcc = accounts.find(a => a.id === form.account);

  const set = k => e => {
    const val = e.target.value;
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

  const openAdd  = () => { setForm(emptyForm()); setModal({ mode: 'add' }); };
  const openEdit = t  => { setForm({ ...t, eventId: t.eventId || '' }); setModal({ mode: 'edit', data: t }); };

  const handleSubmit = e => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    if (modal.mode === 'add') dispatch({ type: 'ADD_TRANSACTION',    payload: { ...payload, id: uid() } });
    else                      dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...payload, id: modal.data.id } });
    setModal(null);
  };

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

  // Live balance preview after this transaction
  const liveAmt   = Number(form.amount) || 0;
  const accBal    = Number(selectedAcc?.balance) || 0;
  const afterBal  = form.type === 'income' ? accBal + liveAmt : accBal - liveAmt;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Transactions</div>
          <div className="page-subtitle">
            {filtered.length} records &bull; Income: <span className="text-green">{fmt(totalIncome)}</span> &bull; Expenses: <span className="text-red">{fmt(totalExpense)}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Transaction</button>
      </div>

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
        <Modal title={modal.mode==='add'?'Add Transaction':'Edit Transaction'} onClose={() => setModal(null)} size="lg">
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
                <input className="input" type="date" required value={form.date} onChange={set('date')} />
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
                <span style={{ fontSize:'0.78rem', color:'var(--text-2)', marginTop:4, display:'block' }}>
                  📁 Group: <strong style={{ color:'var(--accent-light)' }}>{form.group}</strong>
                </span>
              )}
            </div>

            {/* Subcategory */}
            <div className="form-group">
              <label>Sub-Category <span style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>(optional)</span></label>
              <select className="input" value={form.subcategory} onChange={set('subcategory')} disabled={subcatOptions.length===0}>
                <option value="">— Select Sub-Category —</option>
                {subcatOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Amount + Account */}
            <div className="form-row">
              <div className="form-group">
                <label>Amount (₹)</label>
                <input className="input" type="number" required min="1" step="any" value={form.amount} onChange={set('amount')} />
              </div>
              <div className="form-group">
                <label>Account</label>
                <select className="input" value={form.account} onChange={set('account')}>
                  <option value="">— Select Account —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                </select>
                {/* Live balance preview */}
                {selectedAcc && liveAmt > 0 && (
                  <div className="acc-balance-hint">
                    <Wallet size={12}/>
                    <span>Current: <strong>{fmt(accBal)}</strong></span>
                    <span className="hint-arrow">→</span>
                    <span>After: <strong className={afterBal >= 0 ? 'text-green' : 'text-red'}>{fmt(afterBal)}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Event link */}
            {events.length > 0 && (
              <div className="form-group">
                <label>Link to Event <span style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>(optional)</span></label>
                <select className="input" value={form.eventId} onChange={set('eventId')}>
                  <option value="">— No Event —</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="form-group">
              <label>Notes <span style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>(optional)</span></label>
              <input className="input" placeholder="Any extra detail..." value={form.notes} onChange={set('notes')} />
            </div>

            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode==='add'?'Add Transaction':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
