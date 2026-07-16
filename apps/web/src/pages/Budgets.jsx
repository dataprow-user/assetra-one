import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, PieChart, ChevronLeft, ChevronRight, Table2, LayoutGrid } from 'lucide-react';
import { DEFAULT_GROUPS } from '../data/categories';
import './Budgets.css';

const fmt = (n) => '₹' + Math.abs(Number(n || 0)).toLocaleString('en-IN');
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const emptyForm = (month, year) => ({
  month, year, group:'', category:'', subcategory:'', plannedAmount:'', notes:'',
});

export default function Budgets() {
  const { state, dispatch, uid } = useApp();
  const { budgets = [], expenseCategories = [] } = state;
  const groups = (state.groups && state.groups.length > 0) ? state.groups : DEFAULT_GROUPS;

  // Month / Year navigation
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMode,  setViewMode]  = useState('month');
  const [entryMode, setEntryMode] = useState('cards'); // 'cards' | 'table'

  const prevMonth = () => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  // Single-add modal
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState(emptyForm(MONTHS[viewMonth], viewYear));

  const allCats     = expenseCategories;
  const filteredCats = form.group ? allCats.filter(c => c.group === form.group) : allCats;
  const selectedCat  = allCats.find(c => c.name === form.category);
  const subcatOpts   = selectedCat?.subcategories || [];

  const set = k => e => {
    const val = e.target.value;
    setForm(f => {
      const u = { ...f, [k]: val };
      if (k==='group')    { u.category=''; u.subcategory=''; }
      if (k==='category') {
        u.subcategory='';
        const found = allCats.find(c => c.name===val);
        if (found?.group) u.group = found.group;
      }
      return u;
    });
  };

  const openAdd  = () => { setForm(emptyForm(MONTHS[viewMonth], viewYear)); setModal({mode:'add'}); };
  const openEdit = b  => { setForm({...b}); setModal({mode:'edit', data:b}); };

  const handleSubmit = e => {
    e.preventDefault();
    const payload = { ...form, plannedAmount: Number(form.plannedAmount) };
    if (modal.mode==='add') dispatch({ type:'ADD_BUDGET',    payload:{...payload, id:uid()} });
    else                    dispatch({ type:'UPDATE_BUDGET', payload:{...payload, id:modal.data.id} });
    setModal(null);
  };

  const handleDelete = id => {
    if (window.confirm('Delete this budget?')) dispatch({ type:'DELETE_BUDGET', payload:id });
  };

  // ── BULK TABLE: grouped by expense group, one group visible at a time ──
  const groupList = [...new Set(expenseCategories.map(c => c.group).filter(Boolean))];
  const [bulkGroup, setBulkGroup] = useState(groupList[0] || '');
  const [bulkAmounts, setBulkAmounts] = useState({});

  const bulkKey = (cat, sub) => `${cat}||${sub||'__cat__'}`;

  // Pre-fill from existing budgets for the period
  const loadExisting = () => {
    const init = {};
    budgets
      .filter(b => b.month===MONTHS[viewMonth] && String(b.year)===String(viewYear))
      .forEach(b => { init[bulkKey(b.category, b.subcategory)] = b.plannedAmount || ''; });
    setBulkAmounts(init);
  };

  const saveBulk = () => {
    let count = 0;
    Object.entries(bulkAmounts).forEach(([key, amount]) => {
      if (!amount || Number(amount) <= 0) return;
      const [cat, sub] = key.split('||');
      const subVal = sub==='__cat__' ? '' : sub;
      const catObj = expenseCategories.find(c => c.name===cat);
      const existing = budgets.find(b =>
        b.category===cat && b.subcategory===subVal &&
        b.month===MONTHS[viewMonth] && String(b.year)===String(viewYear)
      );
      const payload = {
        month:MONTHS[viewMonth], year:viewYear,
        group:catObj?.group||'', category:cat, subcategory:subVal,
        plannedAmount:Number(amount), notes:'',
      };
      if (existing) dispatch({ type:'UPDATE_BUDGET', payload:{...payload, id:existing.id} });
      else          dispatch({ type:'ADD_BUDGET',    payload:{...payload, id:uid()} });
      count++;
    });
    alert(`✅ ${count} budget entries saved for ${MONTHS[viewMonth]} ${viewYear}!`);
  };

  // Categories for the selected group in bulk mode
  const bulkCats = expenseCategories.filter(c => c.group === bulkGroup);

  // ── Filtered budgets for card view ──
  const viewBudgets = useMemo(() => {
    if (viewMode==='month') return budgets.filter(b => b.month===MONTHS[viewMonth] && String(b.year)===String(viewYear));
    return budgets.filter(b => String(b.year)===String(viewYear));
  }, [budgets, viewMonth, viewYear, viewMode]);

  const byGroup = {};
  viewBudgets.forEach(b => {
    const g = b.group || 'Other';
    if (!byGroup[g]) byGroup[g]=[];
    byGroup[g].push(b);
  });

  const totalPlanned = viewBudgets.reduce((s,b) => s + Number(b.plannedAmount||0), 0);

  const groupColor = {
    Needs:'var(--blue)', Wants:'var(--accent-light)', 'Need & Want':'#f97316',
    Contribution:'var(--yellow)', Investment:'var(--green)', Insurance:'var(--red)', Savings:'#06b6d4',
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Budgets</div>
          <div className="page-subtitle">
            {viewBudgets.length} budgets &bull; Total Planned: <span className="text-accent">{fmt(totalPlanned)}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`btn btn-ghost ${entryMode==='cards'?'view-active':''}`}
            onClick={() => setEntryMode('cards')} title="Card view"><LayoutGrid size={16}/> Cards</button>
          <button className={`btn btn-ghost ${entryMode==='table'?'view-active':''}`}
            onClick={() => { setEntryMode('table'); loadExisting(); }} title="Bulk entry"><Table2 size={16}/> Bulk Entry</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add</button>
        </div>
      </div>

      {/* Period Navigator */}
      <div className="budget-nav section-box">
        <div className="budget-view-toggle">
          <button className={`filter-tab ${viewMode==='month'?'active':''}`} onClick={() => setViewMode('month')}>Monthly</button>
          <button className={`filter-tab ${viewMode==='year'?'active':''}`}  onClick={() => setViewMode('year')}>Yearly</button>
        </div>
        {viewMode==='month' && (
          <div className="budget-period-nav">
            <button className="nav-arrow" onClick={prevMonth}><ChevronLeft size={18}/></button>
            <span className="period-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button className="nav-arrow" onClick={nextMonth}><ChevronRight size={18}/></button>
          </div>
        )}
        <div className="budget-period-nav">
          <button className="nav-arrow" onClick={() => setViewYear(y=>y-1)}><ChevronLeft size={18}/></button>
          <span className="period-label year-label">{viewYear}</span>
          <button className="nav-arrow" onClick={() => setViewYear(y=>y+1)}><ChevronRight size={18}/></button>
        </div>
      </div>

      {/* ── BULK ENTRY MODE: Group tabs + 2-column compact grid ── */}
      {entryMode==='table' && (
        <div className="bulk-wrap section-box">
          {/* Header row */}
          <div className="bulk-header">
            <span>📋 <strong>{MONTHS[viewMonth]} {viewYear}</strong> — click a group, fill amounts, Save</span>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={loadExisting}>↺ Load Saved</button>
              <button className="btn btn-primary btn-sm" onClick={saveBulk}>💾 Save All</button>
            </div>
          </div>

          {/* Group tabs (horizontal pill tabs) */}
          <div className="bulk-group-tabs">
            {groupList.map(g => {
              const saved = budgets.filter(b =>
                b.group===g && b.month===MONTHS[viewMonth] && String(b.year)===String(viewYear)
              ).length;
              return (
                <button key={g}
                  className={`bulk-group-tab ${bulkGroup===g?'active':''}`}
                  onClick={() => setBulkGroup(g)}>
                  {g}
                  {saved > 0 && <span className="bulk-saved-dot">{saved}</span>}
                </button>
              );
            })}
          </div>

          {/* 2-column compact grid for selected group */}
          <div className="bulk-grid">
            {bulkCats.map(cat => (
              <React.Fragment key={cat.id}>
                {/* Category header row */}
                <div className="bulk-cat-header" style={{ gridColumn:'1 / -1' }}>
                  <span className="bulk-cat-label">{cat.name}</span>
                  <input
                    type="number" min="0" step="any"
                    className="bulk-amount-input"
                    placeholder="Overall ₹"
                    value={bulkAmounts[bulkKey(cat.name,'')] || ''}
                    onChange={e => setBulkAmounts(a => ({...a, [bulkKey(cat.name,'')]: e.target.value}))}
                  />
                </div>
                {/* Subcategory rows — 2 per row */}
                {cat.subcategories.map((sub, i) => (
                  <div key={sub} className="bulk-sub-cell">
                    <label className="bulk-sub-label">↳ {sub}</label>
                    <input
                      type="number" min="0" step="any"
                      className="bulk-amount-input"
                      placeholder="₹"
                      value={bulkAmounts[bulkKey(cat.name, sub)] || ''}
                      onChange={e => setBulkAmounts(a => ({...a, [bulkKey(cat.name, sub)]: e.target.value}))}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
            {bulkCats.length === 0 && (
              <div style={{ gridColumn:'1 / -1', padding:24, color:'var(--text-2)', textAlign:'center' }}>
                No categories in this group. Add them via the Categories page.
              </div>
            )}
          </div>

          <div className="bulk-footer">
            <button className="btn btn-primary" onClick={saveBulk}>
              💾 Save All for {MONTHS[viewMonth]} {viewYear}
            </button>
          </div>
        </div>
      )}

      {/* ── CARDS MODE ── */}
      {entryMode==='cards' && (
        <>
          {viewBudgets.length === 0 ? (
            <div className="section-box empty-state">
              <PieChart size={40}/>
              <h3>No Budgets for {viewMode==='month' ? `${MONTHS[viewMonth]} ${viewYear}` : viewYear}</h3>
              <p>Click "Add" for single entry, or "Bulk Entry" to plan the whole month at once.</p>
            </div>
          ) : (
            Object.entries(byGroup).map(([group, items]) => (
              <div key={group} className="budget-group-block section-box">
                <div className="budget-group-header">
                  <span className="badge" style={{ background:(groupColor[group]||'var(--text-2)')+'22', color:groupColor[group]||'var(--text-2)' }}>{group}</span>
                  <span className="budget-group-total">Planned: <strong>{fmt(items.reduce((s,b)=>s+Number(b.plannedAmount||0),0))}</strong></span>
                </div>
                <div className="budgets-grid">
                  {items.map(b => (
                    <div key={b.id} className="budget-card">
                      <div className="bc-header">
                        <div>
                          <div className="bc-name">{b.category}</div>
                          {b.subcategory && <div className="bc-sub">{b.subcategory}</div>}
                        </div>
                        <div className="actions-cell">
                          <button className="act-btn edit"   onClick={() => openEdit(b)}><Edit2   size={14}/></button>
                          <button className="act-btn delete" onClick={() => handleDelete(b.id)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <div className="bc-amount">{fmt(b.plannedAmount)}</div>
                      {b.notes && <div className="bc-notes">{b.notes}</div>}
                      <div className="bc-period-tag">{b.month} {b.year}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Single Add/Edit Modal */}
      {modal && (
        <Modal title={modal.mode==='add'?'Add Budget':'Edit Budget'} onClose={() => setModal(null)} size="md">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Month</label>
                <select className="input" value={form.month} onChange={set('month')}>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Year</label>
                <input className="input" type="number" required min="2000" max="2100" value={form.year} onChange={set('year')} />
              </div>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select className="input" required value={form.category} onChange={set('category')}>
                <option value="">— Select Category —</option>
                {filteredCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              {form.group && <span className="auto-group-hint">📁 Group: <strong>{form.group}</strong></span>}
            </div>
            <div className="form-group">
              <label>Sub-Category <span style={{color:'var(--text-3)',fontSize:'0.8rem'}}>(optional)</span></label>
              <select className="input" value={form.subcategory} onChange={set('subcategory')} disabled={subcatOpts.length===0}>
                <option value="">— Select Sub-Category —</option>
                {subcatOpts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Planned Amount (₹)</label>
              <input className="input" type="number" required min="1" placeholder="e.g. 5000" value={form.plannedAmount} onChange={set('plannedAmount')} />
            </div>
            <div className="form-group">
              <label>Notes <span style={{color:'var(--text-3)',fontSize:'0.8rem'}}>(optional)</span></label>
              <input className="input" placeholder="Any detail..." value={form.notes} onChange={set('notes')} />
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode==='add'?'Add':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
