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
import OnboardingTour from './components/OnboardingTour';
import AddTransactionFAB from './components/AddTransactionFAB';
import { isBackupDue, setLastBackupTime, getBackupSchedule, getSyncFormat, getLastBackupTime } from './utils/backupSchedule';
import { getDriveAuth, connectDriveOnly, uploadToDrive, getCloudModificationTime, downloadLatestBackup } from './utils/googleDriveSync';
import { getExportBlob, buildPayload } from './utils/exportData';
import './App.css';

// ── Drive connect prompt — only shown while Drive isn't connected ──
function DriveConnectBanner() {
  const [connected, setConnected] = useState(() => !!getDriveAuth());
  const [connecting, setConnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');

  if (connected || dismissed) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      await connectDriveOnly();
      setConnected(true);
      window.dispatchEvent(new CustomEvent('a1:drive-connected'));
    } catch (e) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="backup-banner">
      <div className="backup-banner-content">
        <span className="backup-banner-icon">☁️</span>
        <div>
          <strong>Connect Google Drive</strong>
          <span> — back up and sync your data automatically across your devices.</span>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4 }}>{error}</div>}
        </div>
      </div>
      <div className="backup-banner-actions">
        <button className="btn btn-primary btn-sm" disabled={connecting} onClick={handleConnect}>
          {connecting ? 'Connecting…' : '☁ Connect Google Drive'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>Not Now</button>
      </div>
    </div>
  );
}

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

  // 1. Auto-Pull (check cloud on mount, and again right after Drive gets connected)
  const checkCloud = async () => {
    const auth = getDriveAuth();
    if (!auth) return;

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

  useEffect(() => { checkCloud(); }, [dispatch]);

  useEffect(() => {
    window.addEventListener('a1:drive-connected', checkCloud);
    return () => window.removeEventListener('a1:drive-connected', checkCloud);
  }, []);

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

const ONBOARDING_KEY = 'a1_onboarded';

function AppShell() {
  const { currentUser, state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      // Always land on the Dashboard after signing in — don't resume the last
      // tab from a previous session (AppShell stays mounted across sign-out).
      setActiveTab('dashboard');
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setShowOnboarding(true);
      }
    }
  }, [currentUser]);

  // Lets pages (e.g. Transactions' "Add Account" prompt, or the header search)
  // switch tabs — and optionally hand over a search query — without prop-drilling.
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail;
      if (typeof detail === 'string') {
        setActiveTab(detail);
        setPendingSearch('');
      } else if (detail && detail.tab) {
        setActiveTab(detail.tab);
        setPendingSearch(detail.query || '');
      }
    };
    window.addEventListener('a1:navigate', handler);
    return () => window.removeEventListener('a1:navigate', handler);
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

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
      {showOnboarding && <OnboardingTour onFinish={finishOnboarding} />}
      <DriveConnectBanner />
      <CloudSyncManager state={state} dispatch={dispatch} />
      <BackupBanner state={state} />
      <div className="app-shell-body">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setMobileNavOpen(false); }}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <div className="app-main">
          <Header activeTab={activeTab} onMenuClick={() => setMobileNavOpen(o => !o)} />
          <main className="app-content">
            <PageComponent key={activeTab} initialSearch={activeTab === 'transactions' ? pendingSearch : undefined} />
          </main>
        </div>
      </div>
      <AddTransactionFAB />
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
