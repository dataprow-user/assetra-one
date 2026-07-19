import React, { useState, useEffect } from 'react';
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
import { isBackupDue, setLastBackupTime, getBackupSchedule, getSyncFormat } from './utils/backupSchedule';
import { getDriveAuth, uploadToDrive } from './utils/googleDriveSync';
import { getExportBlob, buildPayload } from './utils/exportData';
import './App.css';

// ── Auto-backup reminder banner ──
function BackupBanner({ state }) {
  const [visible, setVisible] = useState(false);
  const [autoSynced, setAutoSynced] = useState(false);

  useEffect(() => {
    if (!isBackupDue()) return;

    const auth = getDriveAuth();
    
    // Try silent Google Drive upload first
    if (auth) {
      const format   = getSyncFormat();
      const blob     = getExportBlob(state, format);
      const ext      = format === 'excel' ? 'xlsx' : format;
      const filename = `Assetra-Backup.${ext}`;
      
      uploadToDrive(blob, filename)
        .then(() => {
          setLastBackupTime();
          setAutoSynced(true);          // show brief success toast
          setTimeout(() => setAutoSynced(false), 5000);
        })
        .catch(() => {
          setVisible(true);             // auth expired or failed → show manual banner
        });
    } else {
      setVisible(true); // not connected → show manual banner
    }
  }, []);

  const schedule = getBackupSchedule();

  if (autoSynced) return (
    <div className="backup-banner synced">
      <div className="backup-banner-content">
        <span className="backup-banner-icon">✅</span>
        <div>Auto backup saved silently to your cloud folder. <strong>{schedule}</strong> schedule.</div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => setAutoSynced(false)}>✕</button>
    </div>
  );

  if (!visible) return null;

  const handleDownload = () => {
    const json = JSON.stringify(buildPayload(state), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `assetra-auto-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLastBackupTime();
    setVisible(false);
  };



  return (
    <div className="backup-banner">
      <div className="backup-banner-content">
        <span className="backup-banner-icon">🔔</span>
        <div>
          <strong>Scheduled Backup Due</strong>
          <span> — Your {schedule} backup is ready. Download now to keep your data safe.</span>
        </div>
      </div>
      <div className="backup-banner-actions">
        <button className="btn btn-primary btn-sm" onClick={handleDownload}>⬇ Download Backup</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setVisible(false)}>Later</button>
      </div>
    </div>
  );
}

function AppShell() {
  const { currentUser, state } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!currentUser) return <Login />;

  const pages = {
    dashboard:    Dashboard,
    transactions: Transactions,
    accounts:     Accounts,
    assets:       Assets,
    liabilities:  Liabilities,
    budgets:      Budgets,
    events:       Events,
    insurance:    Insurance,
    categories:   CategoryManager,
    settings:     Settings,
  };

  const PageComponent = pages[activeTab] || Dashboard;

  return (
    <div className="app-shell">
      <BackupBanner state={state} />
      <div className="app-shell-body">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="app-main">
          <Header activeTab={activeTab} />
          <main className="app-content">
            <PageComponent key={activeTab} />
          </main>
        </div>
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
