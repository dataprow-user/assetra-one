import React, { useState } from 'react';
import { Bell, Search, LogOut, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Header.css';

export default function Header({ activeTab }) {
  const { currentUser, logout, state } = useApp();
  const [showProfile, setShowProfile] = useState(false);

  const pageTitles = {
    dashboard: 'Dashboard', transactions: 'Transactions', accounts: 'Accounts',
    assets: 'Assets', liabilities: 'Liabilities', budgets: 'Budgets',
    events: 'Events', insurance: 'Insurance', settings: 'Settings',
  };

  const upcomingDue = state.insurance.filter(p => {
    const daysLeft = Math.ceil((new Date(p.nextDue) - new Date()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  return (
    <header className="app-header">
      <div className="header-left">
        <h2 className="header-title">{pageTitles[activeTab] || 'Assetra One'}</h2>
      </div>

      <div className="header-search-wrap">
        <Search size={16} className="search-icon" />
        <input className="header-search" type="text" placeholder="Search…" />
      </div>

      <div className="header-right">
        <div className="notif-btn-wrap">
          <button className="btn btn-icon btn-ghost">
            <Bell size={20} />
          </button>
          {upcomingDue > 0 && <span className="notif-badge">{upcomingDue}</span>}
        </div>

        <div className="profile-wrap">
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
              <button className="pd-item danger" onClick={logout}>
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
