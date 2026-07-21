import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_LIABILITY_TYPES } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, CreditCard, Settings2 } from 'lucide-react';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, MAX_RATE, MAX_TENURE_MONTHS, blockInvalidNumberKeys } from '../utils/validation';
import { useFieldErrors } from '../hooks/useFieldErrors';
import './Liabilities.css';

const fmt = (n) => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN');

const emptyForm = () => ({ name:'', type:'home_loan', principal:'', interestRate:'', tenureMonths:'', emi:'', startDate:'', outstanding:'' });
const emptyType = () => ({ label:'', color:'#f43f5e' });

const NUMERIC_RULES = {
  principal:     { label: 'Principal Amount', min: 1, max: MAX_AMOUNT },
  interestRate:  { label: 'Interest Rate',     min: 0, max: MAX_RATE, maxDecimals: 2 },
  tenureMonths:  { label: 'Tenure',            min: 1, max: MAX_TENURE_MONTHS, maxDecimals: 0 },
  emi:           { label: 'EMI Amount',        min: 1, max: MAX_AMOUNT },
  outstanding:   { label: 'Outstanding Balance', min: 0, max: MAX_AMOUNT },
};

export default function Liabilities() {
  const { state, dispatch, uid } = useApp();
  const { liabilities } = state;
  const libTypes = (state.liabilityTypes && state.liabilityTypes.length > 0) ? state.liabilityTypes : DEFAULT_LIABILITY_TYPES;

  const typeLabels = {}, typeColors = {};
  libTypes.forEach(t => { typeLabels[t.key]=t.label; typeColors[t.key]=t.color; });

  const [modal,     setModal]     = useState(null);
  const [typeModal, setTypeModal] = useState(null);
  const [form,      setForm]      = useState(emptyForm());
  const [typeForm,  setTypeForm]  = useState(emptyType());
  const { errors, validate, reset: resetErrors, hasErrors } = useFieldErrors();

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (NUMERIC_RULES[k]) validate(k, val, NUMERIC_RULES[k]);
  };

  const openAdd  = () => { setForm(emptyForm()); resetErrors(); setModal({ mode:'add' }); };
  const openEdit = l  => { setForm({ ...l }); resetErrors(); setModal({ mode:'edit', data:l }); };

  const handleSubmit = e => {
    e.preventDefault();
    const fieldErrors = Object.entries(NUMERIC_RULES).map(([k, rules]) => validate(k, form[k], rules));
    if (hasErrors || fieldErrors.some(Boolean)) return;
    const payload = { ...form, principal:Number(form.principal), interestRate:Number(form.interestRate), tenureMonths:Number(form.tenureMonths), emi:Number(form.emi), outstanding:Number(form.outstanding) };
    if (modal.mode==='add') dispatch({ type:'ADD_LIABILITY',    payload:{ ...payload, id:uid() } });
    else                    dispatch({ type:'UPDATE_LIABILITY', payload:{ ...payload, id:modal.data.id } });
    setModal(null);
  };

  const handleDelete = id => {
    if (window.confirm('Delete this liability?')) dispatch({ type:'DELETE_LIABILITY', payload:id });
  };

  // Type management
  const openTypeManager = () => setTypeModal('manage');
  const openAddType  = () => { setTypeForm(emptyType()); setTypeModal({ mode:'add' }); };
  const openEditType = t => { setTypeForm({ ...t }); setTypeModal({ mode:'edit', data:t }); };
  const handleTypeSubmit = e => {
    e.preventDefault();
    const key = typeForm.label.toLowerCase().replace(/\s+/g,'_');
    if (typeModal.mode==='add') dispatch({ type:'ADD_LIABILITY_TYPE',    payload:{ ...typeForm, key, id:uid() } });
    else                        dispatch({ type:'UPDATE_LIABILITY_TYPE', payload:{ ...typeForm, id:typeModal.data.id } });
    setTypeModal('manage');
  };
  const handleDeleteType = id => {
    if (window.confirm('Delete this type?')) dispatch({ type:'DELETE_LIABILITY_TYPE', payload:id });
  };

  const totalOutstanding = liabilities.reduce((s,l) => s + Number(l.outstanding||0), 0);
  const totalEmi         = liabilities.reduce((s,l) => s + Number(l.emi||0), 0);

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Liabilities</div>
          <div className="page-subtitle">Outstanding: <span className="text-red">{fmt(totalOutstanding)}</span> &bull; Monthly EMI: <span className="text-yellow">{fmt(totalEmi)}</span></div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={openTypeManager}><Settings2 size={16}/> Types</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Liability</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Type</th><th>Rate</th><th>Tenure</th>
            <th className="td-right">EMI / Month</th>
            <th className="td-right">Principal</th>
            <th className="td-right">Outstanding</th>
            <th className="td-right">Actions</th>
          </tr></thead>
          <tbody>
            {liabilities.length===0 && <tr><td colSpan={8}><div className="empty-state"><CreditCard size={36}/><h3>No Liabilities</h3><p>Add home loans, personal loans, gold loans etc.</p></div></td></tr>}
            {liabilities.map(l => {
              const color = typeColors[l.type]||'var(--text-2)';
              const paid = Number(l.principal||0) - Number(l.outstanding||0);
              const pct  = l.principal ? (paid/l.principal*100) : 0;
              return (
                <tr key={l.id}>
                  <td>
                    <span style={{ fontWeight:600, display:'block' }}>{l.name}</span>
                    <div className="progress-bar-wrap" style={{ width:120, marginTop:6 }}>
                      <div className="progress-bar" style={{ width:`${pct}%`, background:'var(--green)' }}/>
                    </div>
                    <span style={{ fontSize:'0.73rem', color:'var(--text-2)' }}>{pct.toFixed(0)}% paid</span>
                  </td>
                  <td><span className="badge" style={{ background:color+'22', color }}>{typeLabels[l.type]||l.type}</span></td>
                  <td>{l.interestRate}% p.a.</td>
                  <td>{l.tenureMonths} mo</td>
                  <td className="td-right amount-negative">{fmt(l.emi)}</td>
                  <td className="td-right">{fmt(l.principal)}</td>
                  <td className="td-right amount-negative">{fmt(l.outstanding)}</td>
                  <td className="td-right"><div className="actions-cell">
                    <button className="act-btn edit" onClick={() => openEdit(l)}><Edit2 size={14}/></button>
                    <button className="act-btn delete" onClick={() => handleDelete(l.id)}><Trash2 size={14}/></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal.mode==='add'?'Add Liability':'Edit Liability'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label>Loan Name</label><input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. SBI Home Loan" value={form.name} onChange={set('name')} /></div>
              <div className="form-group">
                <label>Type</label>
                <select className="input" value={form.type} onChange={set('type')}>
                  {libTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Principal Amount (₹)</label>
                <input className={`input ${errors.principal ? 'input-invalid' : ''}`} type="number" required min="1" max={MAX_AMOUNT} onKeyDown={blockInvalidNumberKeys} value={form.principal} onChange={set('principal')} />
                {errors.principal && <span className="field-error">{errors.principal}</span>}
              </div>
              <div className="form-group">
                <label>Interest Rate (% p.a.)</label>
                <input className={`input ${errors.interestRate ? 'input-invalid' : ''}`} type="number" required min="0" max={MAX_RATE} step="0.1" onKeyDown={blockInvalidNumberKeys} value={form.interestRate} onChange={set('interestRate')} />
                {errors.interestRate && <span className="field-error">{errors.interestRate}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tenure (months)</label>
                <input className={`input ${errors.tenureMonths ? 'input-invalid' : ''}`} type="number" required min="1" max={MAX_TENURE_MONTHS} onKeyDown={blockInvalidNumberKeys} value={form.tenureMonths} onChange={set('tenureMonths')} />
                {errors.tenureMonths && <span className="field-error">{errors.tenureMonths}</span>}
              </div>
              <div className="form-group">
                <label>EMI Amount (₹)</label>
                <input className={`input ${errors.emi ? 'input-invalid' : ''}`} type="number" required min="1" max={MAX_AMOUNT} onKeyDown={blockInvalidNumberKeys} value={form.emi} onChange={set('emi')} />
                {errors.emi && <span className="field-error">{errors.emi}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Start Date</label><input className="input" type="date" value={form.startDate} onChange={set('startDate')} /></div>
              <div className="form-group">
                <label>Outstanding Balance (₹)</label>
                <input className={`input ${errors.outstanding ? 'input-invalid' : ''}`} type="number" required min="0" max={MAX_AMOUNT} onKeyDown={blockInvalidNumberKeys} value={form.outstanding} onChange={set('outstanding')} />
                {errors.outstanding && <span className="field-error">{errors.outstanding}</span>}
              </div>
            </div>
            <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode==='add'?'Add Liability':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Type Manager */}
      {typeModal==='manage' && (
        <Modal title="Manage Liability Types" onClose={() => setTypeModal(null)} size="md">
          <div style={{ marginBottom:16 }}><button className="btn btn-primary btn-sm" onClick={openAddType}><Plus size={14}/> Add Type</button></div>
          <div className="type-manage-list">
            {libTypes.map(t => (
              <div key={t.id} className="type-manage-row">
                <span className="type-badge" style={{ background:t.color+'22', color:t.color }}>{t.label}</span>
                <div className="actions-cell">
                  <button className="act-btn edit" onClick={() => openEditType(t)}><Edit2 size={13}/></button>
                  <button className="act-btn delete" onClick={() => handleDeleteType(t.id)}><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {typeModal && typeModal!=='manage' && (
        <Modal title={typeModal.mode==='add'?'Add Liability Type':'Edit Type'} onClose={() => setTypeModal('manage')} size="sm">
          <form onSubmit={handleTypeSubmit}>
            <div className="form-group"><label>Type Name</label><input className="input" required maxLength={MAX_SHORT_LENGTH} placeholder="e.g. Business Loan" value={typeForm.label} onChange={e => setTypeForm(f => ({...f, label:e.target.value}))} /></div>
            <div className="form-group">
              <label>Color</label>
              <input type="color" value={typeForm.color.startsWith('var')?'#f43f5e':typeForm.color} onChange={e => setTypeForm(f => ({...f, color:e.target.value}))} style={{ width:48, height:36, borderRadius:8, border:'none', cursor:'pointer' }} />
            </div>
            <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setTypeModal('manage')}>Cancel</button>
              <button type="submit" className="btn btn-primary">{typeModal.mode==='add'?'Add':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
