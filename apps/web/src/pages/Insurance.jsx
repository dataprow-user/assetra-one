import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_AMOUNT, blockInvalidNumberKeys } from '../utils/validation';
import { useFieldErrors } from '../hooks/useFieldErrors';
import { fmt } from '../utils/format';
import './Insurance.css';

const INS_TYPES = ['life','health','vehicle','term'];
const INS_COLORS = { life: 'var(--blue)', health: 'var(--green)', vehicle: 'var(--yellow)', term: 'var(--accent-light)' };
const emptyForm = () => ({ name: '', type: 'term', policyNo: '', premium: '', frequency: 'yearly', sumAssured: '', nextDue: '', maturityDate: '' });

const NUMERIC_RULES = {
  premium:    { label: 'Premium Amount', min: 1, max: MAX_AMOUNT },
  sumAssured: { label: 'Sum Assured',    min: 0, max: MAX_AMOUNT, required: false },
};

export default function Insurance() {
  const { state, dispatch, uid } = useApp();
  const { insurance } = state;
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const { errors, validate, reset: resetErrors, hasErrors } = useFieldErrors();

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (NUMERIC_RULES[k]) validate(k, val, NUMERIC_RULES[k]);
  };
  const openAdd = () => { setForm(emptyForm()); resetErrors(); setModal({ mode: 'add' }); };
  const openEdit = p => { setForm({ ...p }); resetErrors(); setModal({ mode: 'edit', data: p }); };

  const handleSubmit = e => {
    e.preventDefault();
    const fieldErrors = Object.entries(NUMERIC_RULES).map(([k, rules]) => validate(k, form[k], rules));
    if (hasErrors || fieldErrors.some(Boolean)) return;
    const payload = { ...form, premium: Number(form.premium), sumAssured: Number(form.sumAssured) };
    if (modal.mode === 'add') dispatch({ type: 'ADD_INSURANCE', payload: { ...payload, id: uid() } });
    else dispatch({ type: 'UPDATE_INSURANCE', payload: { ...payload, id: modal.data.id } });
    setModal(null);
  };

  const handleDelete = id => {
    if (window.confirm('Delete this policy?')) dispatch({ type: 'DELETE_INSURANCE', payload: id });
  };

  const getDaysLeft = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div><div className="page-title">Insurance Policies</div><div className="page-subtitle">{insurance.length} active policies</div></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Policy</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Policy Name</th><th>Type</th><th>Policy No.</th>
            <th className="td-right">Premium</th><th>Frequency</th>
            <th className="td-right">Sum Assured</th><th>Next Due</th>
            <th className="td-right">Actions</th>
          </tr></thead>
          <tbody>
            {insurance.length === 0 && <tr><td colSpan={8}><div className="empty-state"><Shield size={36}/><h3>No Policies</h3><p>Add life, health, vehicle, or term insurance policies.</p></div></td></tr>}
            {insurance.map(p => {
              const daysLeft = getDaysLeft(p.nextDue);
              const color = INS_COLORS[p.type] || 'var(--text-2)';
              return (
                <tr key={p.id}>
                  <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                  <td><span className="badge" style={{ background: color + '22', color }}>{p.type}</span></td>
                  <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{p.policyNo || '-'}</td>
                  <td className="td-right amount-negative">{fmt(p.premium)}</td>
                  <td><span className="badge badge-gray">{p.frequency}</span></td>
                  <td className="td-right">{fmt(p.sumAssured)}</td>
                  <td>
                    {daysLeft !== null && <span className={`badge ${daysLeft <= 7 ? 'badge-red' : daysLeft <= 30 ? 'badge-yellow' : 'badge-green'}`}>
                      {daysLeft === 0 ? 'Today' : daysLeft < 0 ? 'Overdue' : `${daysLeft}d`}
                    </span>}
                    <span style={{ marginLeft: 6, fontSize: '0.82rem', color: 'var(--text-2)' }}>{p.nextDue}</span>
                  </td>
                  <td className="td-right">
                    <div className="actions-cell">
                      <button className="act-btn edit" onClick={() => openEdit(p)}><Edit2 size={14}/></button>
                      <button className="act-btn delete" onClick={() => handleDelete(p.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Insurance Policy' : 'Edit Policy'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label>Policy Name</label><input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. LIC Term Plan" value={form.name} onChange={set('name')} /></div>
              <div className="form-group"><label>Type</label><select className="input" value={form.type} onChange={set('type')}>{INS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div className="form-group"><label>Policy Number</label><input className="input" maxLength={MAX_SHORT_LENGTH} placeholder="LIC-XXXXX" value={form.policyNo} onChange={set('policyNo')} /></div>
            <div className="form-row">
              <div className="form-group">
                <label>Premium Amount (₹)</label>
                <input className={`input ${errors.premium ? 'input-invalid' : ''}`} type="number" required min="1" max={MAX_AMOUNT} onKeyDown={blockInvalidNumberKeys} value={form.premium} onChange={set('premium')} />
                {errors.premium && <span className="field-error">{errors.premium}</span>}
              </div>
              <div className="form-group"><label>Frequency</label><select className="input" value={form.frequency} onChange={set('frequency')}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Sum Assured (₹)</label>
                <input className={`input ${errors.sumAssured ? 'input-invalid' : ''}`} type="number" min="0" max={MAX_AMOUNT} onKeyDown={blockInvalidNumberKeys} value={form.sumAssured} onChange={set('sumAssured')} />
                {errors.sumAssured && <span className="field-error">{errors.sumAssured}</span>}
              </div>
              <div className="form-group"><label>Next Due Date</label><input className="input" type="date" value={form.nextDue} onChange={set('nextDue')} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode === 'add' ? 'Add Policy' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
