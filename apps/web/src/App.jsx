import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Assets from './pages/Assets';
import Liabilities from './pages/Liabilities';
import Budgets from './pages/Budgets';
import Events from './pages/Events';
import Insurance from './pages/Insurance';
import Settings from './pages/Settings';
import CategoryManager from './pages/CategoryManager';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './App.css';

function AppShell() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!currentUser) return <Login />;

  const pages = {
    dashboard: Dashboard,
    transactions: Transactions,
    accounts: Accounts,
    assets: Assets,
    liabilities: Liabilities,
    budgets: Budgets,
    events: Events,
    insurance: Insurance,
    categories: CategoryManager,
    settings: Settings,
  };

  const PageComponent = pages[activeTab] || Dashboard;

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="app-main">
        <Header activeTab={activeTab} />
        <main className="app-content">
          <PageComponent key={activeTab} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
