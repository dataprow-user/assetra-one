import React, { useState } from 'react';
import {
  LayoutDashboard, List, Wallet, TrendingUp, CreditCard,
  PieChart, CalendarDays, Shield, Settings, ChevronLeft, ChevronRight, Tags
} from 'lucide-react';
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

export default function Sidebar({ activeTab, setActiveTab }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">A1</div>
        {!collapsed && <span className="brand-name">Assetra One</span>}
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
