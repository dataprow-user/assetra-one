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
import { isBackupDue, setLastBackupTime, getBackupSchedule, getSyncFormat, getLastBackupTime } from './utils/backupSchedule';
import { getDriveAuth, uploadToDrive, getCloudModificationTime, downloadLatestBackup } from './utils/googleDriveSync';
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

// ── Background Cloud Sync Manager ──
function CloudSyncManager({ state, dispatch }) {
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);

  // 1. Auto-Pull (Check cloud on mount)
  useEffect(() => {
    const auth = getDriveAuth();
    if (!auth) return;

    const checkCloud = async () => {
      try {
        const filename = 'Assetra-Backup.json';
        const cloudTimeStr = await getCloudModificationTime(filename);
        if (!cloudTimeStr) return;

        const cloudTime = new Date(cloudTimeStr).getTime();
        const localLastStr = getLastBackupTime();
        const localTime = localLastStr ? new Date(localLastStr).getTime() : 0;

        if (cloudTime > localTime + 10000) {
          setSyncing(true);
          const cloudData = await downloadLatestBackup(filename);
          
          if (cloudData) {
            const txCount = cloudData.transactions?.length || 0;
            const assetCount = cloudData.assets?.length || 0;
            const accCount = cloudData.accounts?.length || 0;
            
            if (txCount > 0 || assetCount > 0 || accCount > 0) {
              dispatch({ type: 'IMPORT_DATA', payload: cloudData });
              setLastBackupTime();
              setTimeout(() => setSyncing(false), 3000);
            } else {
              setSyncing(false);
              console.warn('Cloud sync pulled empty data!', cloudData);
            }
          } else {
            setSyncing(false);
          }
        }
      } catch (err) {
        console.error('Background cloud pull failed', err);
        setSyncing(false);
      }
    };
    checkCloud();
  }, [dispatch]);

  // 2. Auto-Push (Debounced upload on state change)
  useEffect(() => {
    const auth = getDriveAuth();
    if (!auth) return;

    // We skip pushing if we are syncing.
    // Also, as a safety check, never auto-push if the state is completely empty 
    // (no transactions, no assets, no accounts).
    const isEmpty = (!state.transactions || state.transactions.length === 0) &&
                    (!state.assets || state.assets.length === 0) &&
                    (!state.accounts || state.accounts.length === 0);

    if (syncing || isEmpty) return;

    const timer = setTimeout(async () => {
      try {
        setPushing(true);
        // Force JSON for cloud sync so it can always be restored
        const blob = getExportBlob(state, 'json');
        const filename = 'Assetra-Backup.json';

        await uploadToDrive(blob, filename);
        setLastBackupTime(); // update local time to match what we pushed
        setPushing(false);
      } catch (e) {
        console.error('Background cloud push failed', e);
        setPushing(false);
      }
    }, 5000); // 5-second debounce

    return () => clearTimeout(timer);
  }, [state, syncing]);

  if (!syncing && !pushing) return null;

  return (
    <div className={`backup-banner ${syncing ? 'synced' : ''}`} style={{ backgroundColor: syncing ? 'var(--accent-light)' : 'var(--panel-hover)', color: syncing ? '#fff' : 'var(--text-1)' }}>
      <div className="backup-banner-content">
        <span className="backup-banner-icon">☁️</span>
        <div>{syncing ? 'Newer data found in Google Drive! Syncing to device...' : 'Saving changes to Google Drive...'}</div>
      </div>
    </div>
  );
}

function AppShell() {
  const { currentUser, state, dispatch } = useApp();
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
      <CloudSyncManager state={state} dispatch={dispatch} />
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
