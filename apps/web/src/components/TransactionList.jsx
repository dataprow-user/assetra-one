import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './TransactionList.css';

const initialTransactions = [
  { id: 1, date: '2026-07-15', description: 'Grocery', amount: 4500, type: 'expense', category: 'Food' },
  { id: 2, date: '2026-07-14', description: 'Salary', amount: 90000, type: 'income', category: 'Salary' },
  { id: 3, date: '2026-07-12', description: 'Internet Bill', amount: 1200, type: 'expense', category: 'Utilities' },
];

export default function TransactionList() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [formData, setFormData] = useState({ date: '', description: '', amount: '', type: 'expense', category: '' });

  const handleDelete = (id) => {
    if(window.confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingTxn(null);
    setFormData({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'expense', category: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (txn) => {
    setEditingTxn(txn);
    setFormData({ ...txn });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTxn) {
      setTransactions(transactions.map(t => t.id === editingTxn.id ? { ...formData, id: t.id, amount: Number(formData.amount) } : t));
    } else {
      setTransactions([{ ...formData, id: Date.now(), amount: Number(formData.amount) }, ...transactions]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="transaction-container">
      <div className="transaction-header">
        <h2>Transactions</h2>
        <button className="primary-btn" onClick={openAddModal}>
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      <div className="transaction-card">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(txn => (
              <tr key={txn.id}>
                <td>{txn.date}</td>
                <td className="font-medium">{txn.description}</td>
                <td><span className="category-badge">{txn.category}</span></td>
                <td className={`text-right font-bold ${txn.type === 'income' ? 'text-success' : 'text-danger'}`}>
                  {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                </td>
                <td className="actions-cell text-center">
                  <button className="action-btn edit" onClick={() => openEditModal(txn)} title="Edit"><Edit2 size={16} /></button>
                  <button className="action-btn delete" onClick={() => handleDelete(txn.id)} title="Delete"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan="5" className="text-center empty-msg">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingTxn ? 'Edit Transaction' : 'Add New Transaction'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" required placeholder="e.g. Groceries" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" required placeholder="e.g. Food" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">{editingTxn ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
