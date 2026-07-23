import React, { useState } from 'react';
import {
  LayoutDashboard, List, Wallet, TrendingUp, CreditCard,
  PieChart, CalendarDays, Shield, Settings, Tags, ChevronLeft, ChevronRight
} from 'lucide-react';
import BrandMark from './BrandMark';
import './Sidebar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'accounts', label: 'Accounts', icon: Wallet },
  { id: 'assets', label: 'Assets', icon: TrendingUp },
  { id: 'liabilities', label: 'Liabilities', icon: CreditCard },
  { id: 'budgets', label: 'Budgets', icon: PieChart },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'insurance', label: 'Insurance', icon: Shield },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, mobileOpen = false, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <button
        className="sidebar-brand"
        onClick={() => setCollapsed(c => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="sidebar-brand-main">
          <span className="brand-logo"><BrandMark size={20} /></span>
          <span className="brand-name">Assetra One</span>
        </span>
        <span className="sidebar-collapse-arrow">
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </span>
      </button>

      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} />
            <span className="nav-item-label">{label}</span>
          </button>
        ))}
      </nav>
      </aside>
    </>
  );
}
