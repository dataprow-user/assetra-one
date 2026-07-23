import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_ASSET_TYPES } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Edit2, Trash2, TrendingUp, Info, LayoutList, BarChart2, Settings2, X } from 'lucide-react';
import { MAX_NAME_LENGTH, MAX_SHORT_LENGTH, MAX_NOTES_LENGTH, MAX_AMOUNT, blockInvalidNumberKeys } from '../utils/validation';
import { useFieldErrors } from '../hooks/useFieldErrors';
import { fmt, fmtN } from '../utils/format';
import './Assets.css';

const getTypeMap = (types) => {
  const labels = {}, colors = {};
  types.forEach(t => { labels[t.key] = t.label; colors[t.key] = t.color; });
  return { labels, colors };
};

const TYPE_UNIT = { gold:'grams', mutual_fund:'units', stock:'shares', fd:'months', pf:'₹ balance', nps:'₹ balance', property:'sqft', crypto:'coins', other:'units' };

const emptyForm = () => ({ name:'', type:'gold', quantity:'', unit:'grams', purchasePrice:'', currentPrice:'', notes:'' });
const emptyType = () => ({ label:'', color:'#6366f1' });

const NUMERIC_RULES = {
  quantity:       { label: 'Quantity',       min: 0 },
  purchasePrice:  { label: 'Purchase Price', min: 0 },
  currentPrice:   { label: 'Current Price',  min: 0 },
};

export default function Assets() {
  const { state, dispatch, uid } = useApp();
  const { assets } = state;
  const assetTypes = (state.assetTypes && state.assetTypes.length > 0) ? state.assetTypes : DEFAULT_ASSET_TYPES;

  const { labels: TYPE_LABELS, colors: TYPE_COLORS } = getTypeMap(assetTypes);

  const [viewMode,    setViewMode]    = useState('table');   // 'table' | 'type'
  const [modal,       setModal]       = useState(null);      // null | {mode, data?}
  const [typeModal,   setTypeModal]   = useState(null);      // null | 'manage' | {mode:'add'|'edit', data?}
  const [form,        setForm]        = useState(emptyForm());
  const [typeForm,    setTypeForm]    = useState(emptyType());
  const { errors, validate, reset: resetErrors, hasErrors } = useFieldErrors();

  const set = k => e => {
    const val = e.target.value;
    setForm(f => {
      const u = { ...f, [k]: val };
      if (k === 'type') u.unit = TYPE_UNIT[val] || 'units';
      return u;
    });
    if (NUMERIC_RULES[k]) validate(k, val, NUMERIC_RULES[k]);
  };

  const openAdd  = () => { setForm(emptyForm()); resetErrors(); setModal({ mode:'add' }); };
  const openEdit = (a) => { setForm({ ...a, purchasePrice: a.purchasePrice ?? a.avgPrice ?? '' }); resetErrors(); setModal({ mode:'edit', data:a }); };

  const handleSubmit = e => {
    e.preventDefault();
    const fieldErrors = Object.entries(NUMERIC_RULES).map(([k, rules]) => validate(k, form[k], rules));
    if (hasErrors || fieldErrors.some(Boolean)) return;
    const qty = Number(form.quantity), buy = Number(form.purchasePrice), curr = Number(form.currentPrice);
    const payload = { ...form, quantity:qty, purchasePrice:buy, currentPrice:curr, avgPrice:buy };
    if (modal.mode==='add') dispatch({ type:'ADD_ASSET',    payload:{ ...payload, id:uid() } });
    else                    dispatch({ type:'UPDATE_ASSET', payload:{ ...payload, id:modal.data.id } });
    setModal(null);
  };

  const handleDelete = id => {
    if (window.confirm('Delete this asset?')) dispatch({ type:'DELETE_ASSET', payload:id });
  };

  // ── Type management ──
  const openTypeManager = () => setTypeModal('manage');
  const openAddType  = () => { setTypeForm(emptyType()); setTypeModal({ mode:'add' }); };
  const openEditType = t => { setTypeForm({ ...t }); setTypeModal({ mode:'edit', data:t }); };
  const handleTypeSubmit = e => {
    e.preventDefault();
    const key = typeForm.label.toLowerCase().replace(/\s+/g,'_');
    if (typeModal.mode==='add') dispatch({ type:'ADD_ASSET_TYPE',    payload:{ ...typeForm, key, id:uid() } });
    else                        dispatch({ type:'UPDATE_ASSET_TYPE', payload:{ ...typeForm, id:typeModal.data.id } });
    setTypeModal('manage');
  };
  const handleDeleteType = id => {
    if (window.confirm('Delete this asset type? Existing assets of this type will remain.'))
      dispatch({ type:'DELETE_ASSET_TYPE', payload:id });
  };

  // ── Value calculations ──
  const getValues = (a) => {
    const buy  = Number(a.purchasePrice ?? a.avgPrice ?? 0) || 0;
    const curr = Number(a.currentPrice ?? 0) || 0;
    const qty  = Number(a.quantity) || 0;
    return { invested: qty*buy, current: qty*curr, buy, curr, qty };
  };
  const totalPurchase = assets.reduce((s,a) => s + getValues(a).invested, 0);
  const totalCurrent  = assets.reduce((s,a) => s + getValues(a).current,  0);
  const totalGain     = totalCurrent - totalPurchase;

  const byType = {};
  assets.forEach(a => { if (!byType[a.type]) byType[a.type]=[]; byType[a.type].push(a); });

  const liveQty=Number(form.quantity)||0, liveBuy=Number(form.purchasePrice)||0, liveCurr=Number(form.currentPrice)||0;
  const liveCost=liveQty*liveBuy, liveVal=liveQty*liveCurr, liveGain=liveVal-liveCost;

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Assets</div>
          <div className="page-subtitle">
            Current: <span className="text-green">{fmt(totalCurrent)}</span> &bull;
            Invested: <span className="text-accent">{fmt(totalPurchase)}</span> &bull;
            Gain: <span className={totalGain>=0?'text-green':'text-red'}>{totalGain>=0?'+':''}{fmt(totalGain)}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`btn btn-ghost ${viewMode==='table'?'view-active':''}`} onClick={() => setViewMode('table')}><LayoutList size={16}/> List View</button>
          <button className={`btn btn-ghost ${viewMode==='type'?'view-active':''}`}  onClick={() => setViewMode('type')}><BarChart2 size={16}/> By Type</button>
          <button className="btn btn-ghost" onClick={openTypeManager}><Settings2 size={16}/> Types</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add Asset</button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode==='table' && (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Asset Name</th><th>Type</th><th>Qty</th>
              <th className="td-right">Purchase Price<br/><span className="th-hint">per unit</span></th>
              <th className="td-right">Current Price<br/><span className="th-hint">today</span></th>
              <th className="td-right">Total Invested</th>
              <th className="td-right">Current Value</th>
              <th className="td-right">Gain / Loss</th>
              <th className="td-right">Actions</th>
            </tr></thead>
            <tbody>
              {assets.length===0 && <tr><td colSpan={9}><div className="empty-state"><TrendingUp size={36}/><h3>No Assets</h3><p>Add gold, mutual funds, stocks etc.</p></div></td></tr>}
              {assets.map(a => {
                const { invested, current, buy, curr } = getValues(a);
                const gain=current-invested, gainPct=invested>0?(gain/invested*100):0;
                const color = TYPE_COLORS[a.type]||'var(--text-2)';
                return (
                  <tr key={a.id}>
                    <td><span style={{ fontWeight:600 }}>{a.name}</span>{a.notes&&<span style={{ display:'block',fontSize:'0.75rem',color:'var(--text-2)',marginTop:2 }}>{a.notes}</span>}</td>
                    <td><span className="badge" style={{ background:color+'22', color }}>{TYPE_LABELS[a.type]||a.type}</span></td>
                    <td>{fmtN(a.quantity)} {a.unit||'units'}</td>
                    <td className="td-right">{fmt(buy)}</td>
                    <td className="td-right">{fmt(curr)}</td>
                    <td className="td-right" style={{ color:'var(--text-2)' }}>{fmt(invested)}</td>
                    <td className="td-right amount-positive">{fmt(current)}</td>
                    <td className={`td-right ${gain>=0?'amount-positive':'amount-negative'}`}>
                      {gain>=0?'+':'-'}{fmt(gain)}<span style={{ display:'block',fontSize:'0.75rem',fontWeight:400 }}>({gainPct>=0?'+':''}{gainPct.toFixed(1)}%)</span>
                    </td>
                    <td className="td-right"><div className="actions-cell">
                      <button className="act-btn edit" onClick={() => openEdit(a)}><Edit2 size={14}/></button>
                      <button className="act-btn delete" onClick={() => handleDelete(a.id)}><Trash2 size={14}/></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BY TYPE VIEW */}
      {viewMode==='type' && (
        <div className="type-view-grid">
          {assetTypes.map(typeObj => {
            const items = byType[typeObj.key] || [];
            if (items.length===0) return null;
            const invested = items.reduce((s,a) => s+getValues(a).invested, 0);
            const current  = items.reduce((s,a) => s+getValues(a).current,  0);
            const gain=current-invested, gainPct=invested>0?(gain/invested*100):0;
            return (
              <div key={typeObj.key} className="type-card section-box">
                <div className="type-card-header">
                  <span className="type-badge" style={{ background:typeObj.color+'22', color:typeObj.color }}>{typeObj.label}</span>
                  <span className="type-count">{items.length} item{items.length>1?'s':''}</span>
                </div>
                <div className="type-summary-row">
                  <div className="type-num"><span>Invested</span><strong style={{ color:'var(--text-2)' }}>{fmt(invested)}</strong></div>
                  <div className="type-num"><span>Current Value</span><strong className="amount-positive">{fmt(current)}</strong></div>
                  <div className="type-num"><span>Gain / Loss</span>
                    <strong className={gain>=0?'amount-positive':'amount-negative'}>
                      {gain>=0?'+':'-'}{fmt(gain)}
                      <span style={{ display:'block',fontSize:'0.72rem',fontWeight:400 }}>({gainPct>=0?'+':''}{gainPct.toFixed(1)}%)</span>
                    </strong>
                  </div>
                </div>
                <div className="type-items">
                  {items.map(a => {
                    const { invested:inv, current:cur } = getValues(a);
                    const g=cur-inv;
                    return (
                      <div key={a.id} className="type-item">
                        <div className="type-item-info">
                          <span className="type-item-name">{a.name}</span>
                          <span className="type-item-qty">{fmtN(a.quantity)} {a.unit||'units'}</span>
                        </div>
                        <div className="type-item-vals">
                          <span className="amount-positive">{fmt(cur)}</span>
                          <span className={g>=0?'amount-positive':'amount-negative'} style={{ fontSize:'0.78rem' }}>{g>=0?'+':'-'}{fmt(g)}</span>
                        </div>
                        <div className="actions-cell" style={{ marginLeft:8 }}>
                          <button className="act-btn edit" onClick={() => openEdit(a)}><Edit2 size={13}/></button>
                          <button className="act-btn delete" onClick={() => handleDelete(a.id)}><Trash2 size={13}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {assets.length===0 && <div className="section-box empty-state"><TrendingUp size={36}/><h3>No Assets</h3></div>}
        </div>
      )}

      {/* Add/Edit Asset Modal */}
      {modal && (
        <Modal title={modal.mode==='add'?'Add Asset':'Edit Asset'} onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit}>
            <div className="asset-help-box">
              <Info size={14}/>
              <span><strong>Purchase Price</strong> = what you paid per unit. <strong>Current Price</strong> = today's market price. Gain/Loss is auto-calculated.</span>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Asset Name</label>
                <input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. 22K Gold, Axis Bluechip" value={form.name} onChange={set('name')} />
              </div>
              <div className="form-group">
                <label>Asset Type</label>
                <select className="input" value={form.type} onChange={set('type')}>
                  {assetTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity <span className="field-hint">(how many you own)</span></label>
                <input className={`input ${errors.quantity ? 'input-invalid' : ''}`} type="number" required min="0" max={MAX_AMOUNT} step="any"
                  onKeyDown={blockInvalidNumberKeys} placeholder="e.g. 10" value={form.quantity} onChange={set('quantity')} />
                {errors.quantity && <span className="field-error">{errors.quantity}</span>}
              </div>
              <div className="form-group">
                <label>Unit <span className="field-hint">(grams / shares / units)</span></label>
                <input className="input" maxLength={MAX_SHORT_LENGTH} placeholder="e.g. grams" value={form.unit} onChange={set('unit')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Purchase Price ₹ <span className="field-hint">(per unit, what you paid)</span></label>
                <input className={`input ${errors.purchasePrice ? 'input-invalid' : ''}`} type="number" required min="0" max={MAX_AMOUNT} step="any"
                  onKeyDown={blockInvalidNumberKeys} value={form.purchasePrice} onChange={set('purchasePrice')} />
                {errors.purchasePrice && <span className="field-error">{errors.purchasePrice}</span>}
              </div>
              <div className="form-group">
                <label>Current Price ₹ <span className="field-hint">(per unit, today)</span></label>
                <input className={`input ${errors.currentPrice ? 'input-invalid' : ''}`} type="number" required min="0" max={MAX_AMOUNT} step="any"
                  onKeyDown={blockInvalidNumberKeys} value={form.currentPrice} onChange={set('currentPrice')} />
                {errors.currentPrice && <span className="field-error">{errors.currentPrice}</span>}
              </div>
            </div>
            {(liveBuy>0||liveCurr>0) && (
              <div className="asset-calc-preview">
                <div className="acp-item"><span>Total Invested</span><strong style={{ color:'var(--text-2)' }}>{fmt(liveCost)}</strong></div>
                <div className="acp-item"><span>Current Value</span><strong className="amount-positive">{fmt(liveVal)}</strong></div>
                <div className="acp-item"><span>Gain / Loss</span><strong className={liveGain>=0?'amount-positive':'amount-negative'}>{liveGain>=0?'+':''}{fmt(liveGain)}</strong></div>
              </div>
            )}
            <div className="form-group">
              <label>Notes <span className="field-hint">(optional)</span></label>
              <input className="input" maxLength={MAX_NOTES_LENGTH} placeholder="e.g. SBI FD maturing Dec 2025" value={form.notes} onChange={set('notes')} />
            </div>
            <div style={{ display:'flex',gap:12,justifyContent:'flex-end',marginTop:8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal.mode==='add'?'Add Asset':'Update'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Type Manager Modal */}
      {typeModal==='manage' && (
        <Modal title="Manage Asset Types" onClose={() => setTypeModal(null)} size="md">
          <div style={{ marginBottom:16 }}>
            <button className="btn btn-primary btn-sm" onClick={openAddType}><Plus size={14}/> Add Type</button>
          </div>
          <div className="type-manage-list">
            {assetTypes.map(t => (
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

      {/* Add/Edit Type Modal */}
      {typeModal && typeModal !== 'manage' && (
        <Modal title={typeModal.mode==='add'?'Add Asset Type':'Edit Asset Type'} onClose={() => setTypeModal('manage')} size="sm">
          <form onSubmit={handleTypeSubmit}>
            <div className="form-group">
              <label>Type Name</label>
              <input className="input" required maxLength={MAX_SHORT_LENGTH} placeholder="e.g. Crypto, PPF" value={typeForm.label} onChange={e => setTypeForm(f => ({...f, label:e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Color</label>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="color" value={typeForm.color.startsWith('var')?'#6366f1':typeForm.color} onChange={e => setTypeForm(f => ({...f, color:e.target.value}))} style={{ width:48, height:36, borderRadius:8, border:'none', cursor:'pointer' }} />
                <span style={{ fontSize:'0.82rem', color:'var(--text-2)' }}>{typeForm.color}</span>
              </div>
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
