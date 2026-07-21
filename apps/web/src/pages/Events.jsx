import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, CalendarDays, ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { MAX_NAME_LENGTH, MAX_AMOUNT, blockInvalidNumberKeys } from '../utils/validation';
import { useFieldErrors } from '../hooks/useFieldErrors';
import './Events.css';

const fmt = (n) => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN');
const emptyForm = () => ({ name:'', startDate:'', endDate:'', budget:'' });

const NUMERIC_RULES = {
  budget: { label: 'Budget', min: 0, max: MAX_AMOUNT, required: false },
};

export default function Events() {
  const { state, dispatch, uid } = useApp();
  const { events, transactions = [], budgets = [] } = state;
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(emptyForm());
  const [expanded, setExpanded] = useState({});
  const { errors, validate, reset: resetErrors, hasErrors } = useFieldErrors();

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (NUMERIC_RULES[k]) validate(k, val, NUMERIC_RULES[k]);
  };
  const openAdd  = ()   => { setForm(emptyForm()); resetErrors(); setModal({ mode:'add' }); };
  const openEdit = ev   => { setForm({ ...ev, budget: ev.budget||'' }); resetErrors(); setModal({ mode:'edit', data:ev }); };
  const toggle   = id   => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const handleSubmit = e => {
    e.preventDefault();
    const fieldErrors = Object.entries(NUMERIC_RULES).map(([k, rules]) => validate(k, form[k], rules));
    if (hasErrors || fieldErrors.some(Boolean)) return;
    const payload = { ...form, budget: Number(form.budget) };
    if (modal.mode==='add') dispatch({ type:'ADD_EVENT',    payload:{ ...payload, id:uid() } });
    else                    dispatch({ type:'UPDATE_EVENT', payload:{ ...payload, id:modal.data.id } });
    setModal(null);
  };

  const handleDelete = id => {
    if (window.confirm('Delete this event?')) dispatch({ type:'DELETE_EVENT', payload:id });
  };

  // For each event, auto-calculate spent from linked transactions
  const eventData = useMemo(() => events.map(ev => {
    const linked = transactions.filter(t => t.eventId === ev.id);
    const spent  = linked.filter(t => t.type==='expense').reduce((s,t) => s + Number(t.amount||0), 0);
    const income = linked.filter(t => t.type==='income').reduce((s,t) => s + Number(t.amount||0), 0);
    const eventBudgets = budgets.filter(b => b.eventId === ev.id);
    const budgeted = eventBudgets.reduce((s,b) => s + Number(b.plannedAmount||0), 0);
    return { ...ev, spent, income, linked, eventBudgets, budgeted };
  }), [events, transactions, budgets]);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div><div className="page-title">Events</div><div className="page-subtitle">Track trips, functions and occasions — link transactions to see live spending</div></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Event</button>
      </div>

      <div className="events-grid">
        {eventData.length===0 && (
          <div className="section-box empty-state"><CalendarDays size={40}/><h3>No Events</h3><p>Create an event for trips, weddings, or functions. Then tag transactions to it.</p></div>
        )}
        {eventData.map(ev => {
          const pct = ev.budget ? Math.min((ev.spent/ev.budget)*100, 100) : 0;
          const color = pct>=90?'var(--red)':pct>=70?'var(--yellow)':'var(--green)';
          const remaining = ev.budget - ev.spent;
          const isOpen = expanded[ev.id];
          return (
            <div key={ev.id} className="event-card section-box">
              <div className="ev-header">
                <div>
                  <div className="ev-name">{ev.name}</div>
                  <div className="ev-dates">{ev.startDate}{ev.endDate && ` → ${ev.endDate}`}</div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span className="badge badge-blue" style={{ fontSize:'0.72rem' }}>{ev.linked.length} txn{ev.linked.length!==1?'s':''}</span>
                  <button className="act-btn edit" onClick={() => openEdit(ev)}><Edit2 size={14}/></button>
                  <button className="act-btn delete" onClick={() => handleDelete(ev.id)}><Trash2 size={14}/></button>
                </div>
              </div>

              {/* Stats row */}
              <div className="ev-stats">
                <div><span className="ev-stat-label">Budget</span><span className="ev-stat-val">{ev.budget?fmt(ev.budget):'—'}</span></div>
                <div><span className="ev-stat-label">Spent</span><span className="ev-stat-val amount-negative">{fmt(ev.spent)}</span></div>
                <div><span className="ev-stat-label">Income</span><span className="ev-stat-val amount-positive">{fmt(ev.income)}</span></div>
                <div><span className="ev-stat-label">Remaining</span>
                  <span className="ev-stat-val" style={{ color: remaining>=0?'var(--green)':'var(--red)' }}>
                    {ev.budget ? fmt(remaining) : '—'}
                  </span>
                </div>
              </div>

              {ev.budget>0 && (
                <div className="progress-bar-wrap"><div className="progress-bar" style={{ width:`${pct}%`, background:color }}/></div>
              )}

              {/* Linked transactions accordion */}
              {ev.linked.length > 0 && (
                <div className="ev-txn-section">
                  <button className="ev-txn-toggle" onClick={() => toggle(ev.id)}>
                    <Receipt size={13}/>
                    {isOpen?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
                    Linked Transactions ({ev.linked.length})
                  </button>
                  {isOpen && (
                    <div className="ev-txn-list">
                      {ev.linked.map(t => (
                        <div key={t.id} className="ev-txn-row">
                          <div>
                            <span className="ev-txn-cat">{t.category}</span>
                            {t.subcategory && <span className="ev-txn-sub"> › {t.subcategory}</span>}
                            <span className="ev-txn-date"> · {t.date}</span>
                          </div>
                          <span className={`ev-txn-amt ${t.type==='income'?'amount-positive':'amount-negative'}`}>
                            {t.type==='income'?'+':'-'}{fmt(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.mode==='add'?'Add Event':'Edit Event'} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Event Name</label><input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. Goa Trip 2026" value={form.name} onChange={set('name')} /></div>
            <div className="form-row">
              <div className="form-group"><label>Start Date</label><input className="input" type="date" value={form.startDate} onChange={set('startDate')} /></div>
              <div className="form-group"><label>End Date</label><input className="input" type="date" value={form.endDate} onChange={set('endDate')} /></div>
            </div>
            <div className="form-group">
              <label>Budget (₹) <span style={{ color:'var(--text-3)',fontSize:'0.8rem' }}>(optional)</span></label>
              <input className={`input ${errors.budget ? 'input-invalid' : ''}`} type="number" min="0" max={MAX_AMOUNT} onKeyDown={blockInvalidNumberKeys} placeholder="e.g. 50000" value={form.budget} onChange={set('budget')} />
              {errors.budget && <span className="field-error">{errors.budget}</span>}
            </div>
            <p style={{ fontSize:'0.8rem',color:'var(--text-2)',marginTop:8 }}>💡 Tag transactions to this event using the "Event" field in Add Transaction.</p>
            <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode==='add'?'Add Event':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
