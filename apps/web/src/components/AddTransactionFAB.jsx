import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TransactionFormModal from './TransactionFormModal';
import './AddTransactionFAB.css';

// App-wide entry point for the most frequent action — logging a
// transaction — so it isn't buried inside the Transactions page alone.
export default function AddTransactionFAB() {
  const { state } = useApp();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (state.accounts.length === 0) {
      alert('Add an account first, so this transaction can update its balance.');
      window.dispatchEvent(new CustomEvent('a1:navigate', { detail: 'accounts' }));
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button className="fab-add-txn" onClick={handleClick} title="Add Transaction" aria-label="Add Transaction">
        <Plus size={28} strokeWidth={2.5}/>
      </button>
      {open && <TransactionFormModal mode="add" onClose={() => setOpen(false)} />}
    </>
  );
}
