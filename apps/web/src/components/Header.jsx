import React, { useState, useRef } from 'react';
import {
  Bell, Search, LogOut, List, Wallet, TrendingUp, CreditCard, PieChart, CalendarDays, Shield, Tags
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useClickOutside } from '../hooks/useClickOutside';
import './Header.css';

const MAX_RESULTS = 8;

function searchAppData(state, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const results = [];

  (state.transactions || []).forEach(t => {
    const hay = [t.description, t.category, t.subcategory, t.notes].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(q)) {
      results.push({
        id: `txn-${t.id}`, type: 'Transaction', icon: List,
        label: t.category + (t.subcategory ? ` › ${t.subcategory}` : ''),
        sub: t.notes || t.date, tab: 'transactions', query: rawQuery,
      });
    }
  });
  (state.accounts || []).forEach(a => {
    if (a.name.toLowerCase().includes(q)) {
      results.push({ id: `acc-${a.id}`, type: 'Account', icon: Wallet, label: a.name, sub: a.type, tab: 'accounts' });
    }
  });
  (state.assets || []).forEach(a => {
    if (a.name.toLowerCase().includes(q)) {
      results.push({ id: `ast-${a.id}`, type: 'Asset', icon: TrendingUp, label: a.name, sub: a.type, tab: 'assets' });
    }
  });
  (state.liabilities || []).forEach(l => {
    if (l.name.toLowerCase().includes(q)) {
      results.push({ id: `lia-${l.id}`, type: 'Liability', icon: CreditCard, label: l.name, sub: l.type, tab: 'liabilities' });
    }
  });
  (state.budgets || []).forEach(b => {
    const hay = `${b.name || ''} ${b.category || ''}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({ id: `bud-${b.id}`, type: 'Budget', icon: PieChart, label: b.name || b.category, sub: [b.month, b.year].filter(Boolean).join(' '), tab: 'budgets' });
    }
  });
  (state.events || []).forEach(e => {
    if (e.name.toLowerCase().includes(q)) {
      results.push({ id: `evt-${e.id}`, type: 'Event', icon: CalendarDays, label: e.name, sub: e.startDate, tab: 'events' });
    }
  });
  (state.insurance || []).forEach(p => {
    const hay = `${p.name || ''} ${p.policyNo || ''}`.toLowerCase();
    if (hay.includes(q)) {
      results.push({ id: `ins-${p.id}`, type: 'Insurance', icon: Shield, label: p.name, sub: p.policyNo, tab: 'insurance' });
    }
  });
  [...(state.expenseCategories || []), ...(state.incomeCategories || [])].forEach(c => {
    if (c.name.toLowerCase().includes(q)) {
      results.push({ id: `cat-${c.id}`, type: 'Category', icon: Tags, label: c.name, sub: c.group, tab: 'categories' });
    }
  });

  return results.slice(0, MAX_RESULTS);
}

export default function Header({ activeTab }) {
  const { currentUser, logout, state } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  useClickOutside(profileRef, () => setShowProfile(false));
  useClickOutside(searchRef, () => setShowResults(false));

  const pageTitles = {
    dashboard: 'Dashboard', transactions: 'Transactions', accounts: 'Accounts',
    assets: 'Assets', liabilities: 'Liabilities', budgets: 'Budgets',
    events: 'Events', insurance: 'Insurance', settings: 'Settings',
  };

  const upcomingDue = state.insurance.filter(p => {
    const daysLeft = Math.ceil((new Date(p.nextDue) - new Date()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  const results = query.trim() ? searchAppData(state, query) : [];

  const goToResult = (tab, resultQuery) => {
    window.dispatchEvent(new CustomEvent('a1:navigate', { detail: resultQuery ? { tab, query: resultQuery } : tab }));
    setShowResults(false);
    setQuery('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) goToResult(results[0].tab, results[0].query);
    if (e.key === 'Escape') setShowResults(false);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 className="header-title">{pageTitles[activeTab] || 'Assetra One'}</h2>
      </div>

      <div className="header-search-wrap" ref={searchRef}>
        <Search size={16} className="search-icon" />
        <input
          className="header-search"
          type="text"
          placeholder="Search transactions, accounts, assets…"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleSearchKeyDown}
        />
        {showResults && query.trim() && (
          <div className="search-results-dropdown">
            {results.length === 0 ? (
              <div className="search-no-results">No results found for "{query}"</div>
            ) : (
              results.map(r => (
                <button key={r.id} className="search-result-item" onClick={() => goToResult(r.tab, r.query)}>
                  <r.icon size={15} className="search-result-icon"/>
                  <div className="search-result-text">
                    <span className="search-result-label">{r.label}</span>
                    {r.sub && <span className="search-result-sub">{r.sub}</span>}
                  </div>
                  <span className="search-result-type">{r.type}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="notif-btn-wrap">
          <button className="btn btn-icon btn-ghost">
            <Bell size={20} />
          </button>
          {upcomingDue > 0 && <span className="notif-badge">{upcomingDue}</span>}
        </div>

        <div className="profile-wrap" ref={profileRef}>
          <button className="avatar-btn" onClick={() => setShowProfile(s => !s)}>
            <span className="avatar-circle">{currentUser?.avatar || currentUser?.name?.slice(0, 2).toUpperCase() || 'U'}</span>
            <div className="avatar-text">
              <span className="avatar-name">{currentUser?.name || 'User'}</span>
              <span className="avatar-role">{state.household?.name}</span>
            </div>
          </button>

          {showProfile && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <p className="pd-name">{currentUser?.name}</p>
                <p className="pd-email">{currentUser?.email}</p>
              </div>
              <hr className="pd-divider" />
              <button className="pd-item danger" onClick={() => { setShowProfile(false); logout(); }}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
