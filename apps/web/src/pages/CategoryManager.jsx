import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from '../components/Modal';
import { Plus, Trash2, Edit2, Tag, X, Check, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { DEFAULT_GROUPS } from '../data/categories';
import { MAX_NAME_LENGTH } from '../utils/validation';
import './CategoryManager.css';

export default function CategoryManager() {
  const { state, dispatch, uid } = useApp();
  const { expenseCategories, incomeCategories } = state;
  // Use stored groups; if old localStorage has none yet, fall back to defaults
  const groups = (state.groups && state.groups.length > 0) ? state.groups : DEFAULT_GROUPS;

  const [tab, setTab] = useState('expense'); // 'expense' | 'income'
  const [expanded, setExpanded] = useState({}); // { catId: true }
  const [modal, setModal] = useState(null);
    // modal types: 'add-cat' | 'edit-cat' | 'add-sub'
  const [catForm, setCatForm] = useState({ name: '', group: 'Needs' });
  const [groupForm, setGroupForm] = useState({ name: '' });
  const [newSubInput, setNewSubInput] = useState({}); // { catId: string }
  const [subError, setSubError] = useState({});       // { catId: errorMessage }
  const [editingSub, setEditingSub] = useState(null); // { catId, value } — sub being renamed
  const [editSubVal, setEditSubVal] = useState('');

  const categories = tab === 'expense' ? expenseCategories : incomeCategories;
  const ADD_TYPE   = tab === 'expense' ? 'ADD_EXPENSE_CATEGORY'    : 'ADD_INCOME_CATEGORY';
  const UPD_TYPE   = tab === 'expense' ? 'UPDATE_EXPENSE_CATEGORY' : 'UPDATE_INCOME_CATEGORY';
  const DEL_TYPE   = tab === 'expense' ? 'DELETE_EXPENSE_CATEGORY' : 'DELETE_INCOME_CATEGORY';

  const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  // ── Add / Edit Category ──
  const openAddCat = () => {
    setCatForm({ name: '', group: 'Needs' });
    setModal('add-cat');
  };
  const openEditCat = cat => {
    setCatForm({ ...cat });
    setModal('edit-cat');
  };
  const handleCatSubmit = e => {
    e.preventDefault();
    if (modal === 'add-cat') {
      dispatch({ type: ADD_TYPE, payload: { ...catForm, id: uid(), subcategories: [] } });
    } else {
      dispatch({ type: UPD_TYPE, payload: catForm });
    }
    setModal(null);
  };
  const handleDeleteCat = id => {
    if (window.confirm('Delete this category? Existing transactions using it will keep the old name.'))
      dispatch({ type: DEL_TYPE, payload: id });
  };

  // ── Add / Edit Group ──
  const openAddGroup = () => {
    setGroupForm({ name: '' });
    setModal('add-group');
  };
  const openEditGroup = g => {
    setGroupForm({ ...g });
    setModal('edit-group');
  };
  const handleGroupSubmit = e => {
    e.preventDefault();
    if (modal === 'add-group') {
      dispatch({ type: 'ADD_GROUP', payload: { ...groupForm, id: uid() } });
    } else {
      dispatch({ type: 'UPDATE_GROUP', payload: groupForm });
    }
    setModal(null);
  };
  const handleDeleteGroup = id => {
    if (window.confirm('Delete this group? Categories and transactions will keep the old name.'))
      dispatch({ type: 'DELETE_GROUP', payload: id });
  };

  // ── Add Subcategory inline ──
  const handleAddSub = (cat) => {
    const val = (newSubInput[cat.id] || '').trim().slice(0, MAX_NAME_LENGTH);
    if (!val) {
      setSubError(s => ({ ...s, [cat.id]: 'Please enter a sub-category name.' }));
      return;
    }
    if (cat.subcategories.includes(val)) {
      setSubError(s => ({ ...s, [cat.id]: 'That sub-category already exists.' }));
      return;
    }
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: [...cat.subcategories, val] } });
    setNewSubInput(s => ({ ...s, [cat.id]: '' }));
    setSubError(s => ({ ...s, [cat.id]: '' }));
  };

  const startEditSub = (cat, sub) => {
    setEditingSub({ catId: cat.id, value: sub });
    setEditSubVal(sub);
    setSubError(s => ({ ...s, [cat.id]: '' }));
  };

  const handleUpdateSub = (cat, oldSub) => {
    const val = editSubVal.trim().slice(0, MAX_NAME_LENGTH);
    if (!val) {
      setSubError(s => ({ ...s, [cat.id]: 'Sub-category name cannot be empty.' }));
      return;
    }
    if (val === oldSub) { setEditingSub(null); return; }
    if (cat.subcategories.includes(val)) {
      setSubError(s => ({ ...s, [cat.id]: 'That sub-category already exists.' }));
      return;
    }
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: cat.subcategories.map(s => s === oldSub ? val : s) } });
    setEditingSub(null);
    setSubError(s => ({ ...s, [cat.id]: '' }));
  };

  const handleDeleteSub = (cat, sub) => {
    if (!window.confirm(`Remove the sub-category "${sub}"? Existing transactions will keep the old name.`)) return;
    dispatch({ type: UPD_TYPE, payload: { ...cat, subcategories: cat.subcategories.filter(s => s !== sub) } });
  };

  // group badge colours
  const groupColor = { Needs: 'var(--blue)', Wants: 'var(--accent-light)', 'Need & Want': '#f97316',
    Contribution: 'var(--yellow)', Investment: 'var(--green)', Insurance: 'var(--red)', Savings: '#06b6d4', Income: 'var(--green)' };

  // Only compute byGroup when NOT on the groups tab
  const byGroup = {};
  if (tab !== 'group') {
    categories.forEach(c => {
      const g = c.group || 'Other';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(c);
    });
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Category Manager</div>
          <div className="page-subtitle">Add, remove and customise categories and sub-categories</div>
        </div>
        <button className="btn btn-primary" onClick={tab === 'group' ? openAddGroup : openAddCat}>
          <Plus size={16}/> Add {tab === 'group' ? 'Group' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="cat-tabs section-box" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', gap: 8 }}>
        {['expense','income','group'].map(t => (
          <button key={t} className={`filter-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'expense' ? '💸 Expense Categories' : t === 'income' ? '💰 Income Categories' : '📁 Groups'}
            <span className="cat-count">
              {t === 'expense' ? expenseCategories.length : t === 'income' ? incomeCategories.length : groups.length}
            </span>
          </button>
        ))}
      </div>

      {/* Category List grouped by Group */}
      <div className="cat-groups">
        {Object.entries(byGroup).map(([group, cats]) => (
          <div key={group} className="cat-group-block section-box">
            <div className="cat-group-header">
              <span className="badge" style={{ background: (groupColor[group] || 'var(--text-2)') + '22', color: groupColor[group] || 'var(--text-2)' }}>
                {group}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{cats.length} categories</span>
            </div>

            {cats.map(cat => (
              <div key={cat.id} className="cat-row">
                {/* Header row */}
                <div className="cat-row-header" onClick={() => toggle(cat.id)}>
                  <div className="cat-row-left">
                    <button className="expand-btn">
                      {expanded[cat.id] ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
                    </button>
                    <Tag size={15} style={{ color: groupColor[group] || 'var(--accent-light)' }} />
                    <span className="cat-name">{cat.name}</span>
                    <span className="sub-count-badge">{cat.subcategories.length} subs</span>
                  </div>
                  <div className="cat-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="act-btn edit" title="Edit category" onClick={() => openEditCat(cat)}><Edit2 size={14}/></button>
                    <button className="act-btn delete" title="Delete category" onClick={() => handleDeleteCat(cat.id)}><Trash2 size={14}/></button>
                  </div>
                </div>

                {/* Subcategories (expanded) */}
                {expanded[cat.id] && (
                  <div className="sub-panel">
                    <div className="sub-chips">
                      {cat.subcategories.map(sub => (
                        editingSub && editingSub.catId === cat.id && editingSub.value === sub ? (
                          <div key={sub} className="sub-chip sub-chip-editing">
                            <input
                              className="sub-edit-input"
                              autoFocus
                              maxLength={MAX_NAME_LENGTH}
                              value={editSubVal}
                              onChange={e => setEditSubVal(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter')  { e.preventDefault(); handleUpdateSub(cat, sub); }
                                if (e.key === 'Escape') { setEditingSub(null); }
                              }}
                            />
                            <button className="sub-chip-save" onClick={() => handleUpdateSub(cat, sub)} title="Save">
                              <Check size={13}/>
                            </button>
                            <button className="sub-chip-del" onClick={() => setEditingSub(null)} title="Cancel">
                              <X size={12}/>
                            </button>
                          </div>
                        ) : (
                          <div key={sub} className="sub-chip">
                            {sub}
                            <button className="sub-chip-edit" onClick={() => startEditSub(cat, sub)} title="Rename">
                              <Edit2 size={11}/>
                            </button>
                            <button className="sub-chip-del" onClick={() => handleDeleteSub(cat, sub)} title="Remove">
                              <X size={12}/>
                            </button>
                          </div>
                        )
                      ))}
                      {cat.subcategories.length === 0 && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No sub-categories yet</span>
                      )}
                    </div>
                    {/* Inline add sub */}
                    <div className="add-sub-row">
                      <input
                        className={`input add-sub-input ${subError[cat.id] ? 'input-invalid' : ''}`}
                        maxLength={MAX_NAME_LENGTH}
                        placeholder="New sub-category name..."
                        value={newSubInput[cat.id] || ''}
                        onChange={e => {
                          setNewSubInput(s => ({ ...s, [cat.id]: e.target.value }));
                          if (subError[cat.id]) setSubError(s => ({ ...s, [cat.id]: '' }));
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSub(cat); } }}
                      />
                      <button className="btn btn-ghost btn-sm" onClick={() => handleAddSub(cat)}>
                        <Plus size={14}/> Add
                      </button>
                    </div>
                    {subError[cat.id] && <span className="field-error">{subError[cat.id]}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {tab !== 'group' && categories.length === 0 && (
          <div className="section-box empty-state">
            <Tag size={40}/>
            <h3>No Categories</h3>
            <p>Click "Add Category" to create your first category.</p>
          </div>
        )}

        {/* Groups view */}
        {tab === 'group' && (
          <div className="cat-group-block section-box" style={{ padding: '20px' }}>
            <div className="accounts-grid" style={{ padding: '20px' }}>
              {groups.map(g => (
                <div key={g.id} className="account-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="acc-card-top" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} style={{ color: groupColor[g.name] || 'var(--accent-light)' }}/>
                      <span style={{ fontWeight: 600 }}>{g.name}</span>
                    </div>
                    <div className="actions-cell">
                      <button className="act-btn edit" onClick={() => openEditGroup(g)}><Edit2 size={14}/></button>
                      <button className="act-btn delete" onClick={() => handleDeleteGroup(g.id)}><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <p>No groups found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {(modal === 'add-cat' || modal === 'edit-cat') && (
        <Modal title={modal === 'add-cat' ? 'Add Category' : 'Edit Category'}
          onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleCatSubmit}>
            <div className="form-group">
              <label>Category Name</label>
              <input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. Outside Food"
                value={catForm.name}
                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {tab === 'expense' && (
              <div className="form-group">
                <label>Group</label>
                <select className="input" value={catForm.group}
                  onChange={e => setCatForm(f => ({ ...f, group: e.target.value }))}>
                  {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal === 'add-cat' ? 'Add' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add / Edit Group Modal */}
      {(modal === 'add-group' || modal === 'edit-group') && (
        <Modal title={modal === 'add-group' ? 'Add Group' : 'Edit Group'}
          onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleGroupSubmit}>
            <div className="form-group">
              <label>Group Name</label>
              <input className="input" required maxLength={MAX_NAME_LENGTH} placeholder="e.g. Discretionary"
                value={groupForm.name}
                onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{modal === 'add-group' ? 'Add' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
