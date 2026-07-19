import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home, User, Save, LogOut, Trash2, RefreshCcw, FlaskConical,
  Download, Upload, Clock, CalendarDays, CheckCircle2, AlertTriangle,
  FileJson, FileSpreadsheet, FileText, Shield, CloudUpload, FolderOpen, Loader2
} from 'lucide-react';
import Modal from '../components/Modal';
import { exportJSON, exportExcel, exportCSV, buildPayload, getExportBlob } from '../utils/exportData';
import {
  SCHEDULE_OPTIONS, getBackupSchedule, setBackupSchedule,
  setLastBackupTime, lastBackupLabel,
  getSyncFormat, setSyncFormat
} from '../utils/backupSchedule';
import {
  getDriveAuth, connectGoogleDrive, disconnectDrive, uploadToDrive
} from '../utils/googleDriveSync';
import './Settings.css';

// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { state, dispatch, currentUser, logout } = useApp();

  const [householdName, setHouseholdName] = useState(state.household?.name || '');
  const [saved,         setSaved]         = useState(false);
  const [toast,         setToast]         = useState(null);
  const [modal,         setModal]         = useState(null); // 'export'|'reset'|'sample'|'import-confirm'|'folder-picker'
  const [importData,    setImportData]    = useState(null);
  
  const [schedule,      setScheduleState] = useState(getBackupSchedule());
  const [syncFmt,       setSyncFmtState]  = useState(getSyncFormat());
  
  const [lastBackup,    setLastBackup]    = useState(lastBackupLabel());
  
  const [driveAuth,     setDriveAuth]     = useState(getDriveAuth());
  const [syncStatus,    setSyncStatus]    = useState(null); // null | 'syncing' | 'done' | 'error'

  const fileRef = useRef();

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Household save ──────────────────────────────────────────────────────────
  const handleSave = (e) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: householdName } });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  // ── Reset / Sample ──────────────────────────────────────────────────────────
  const handleReset = () => {
    dispatch({ type: 'RESET_ALL' });
    setModal(null);
    showToast('success', 'All data cleared. Starting fresh!');
  };
  const handleLoadSample = () => {
    dispatch({ type: 'LOAD_SAMPLE_DATA' });
    setModal(null);
    showToast('success', 'Sample data loaded.');
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = (fmt) => {
    if (fmt === 'json')  { exportJSON(state);  setLastBackupTime(); setLastBackup(lastBackupLabel()); }
    if (fmt === 'excel') { exportExcel(state); }
    if (fmt === 'csv')   {
      exportCSV(state.transactions || [],
        ['date','type','group','category','subcategory','amount','account','notes'],
        'transactions');
    }
    setModal(null);
    showToast('success', `Exported as ${fmt.toUpperCase()} successfully.`);
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.transactions && !parsed.assets && !parsed.accounts) {
          showToast('error', 'Invalid file — please select a valid Assetra backup (.json).');
          return;
        }
        setImportData(parsed);
        setModal('import-confirm');
      } catch { showToast('error', 'Could not read file. Make sure it is a valid JSON backup.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleImport = () => {
    dispatch({ type: 'IMPORT_DATA', payload: importData });
    setModal(null); setImportData(null);
    showToast('success', 'Data imported successfully!');
  };

  // ── Google Drive Sync ───────────────────────────────────────────────────────
  const handleConnectDrive = async () => {
    try {
      const auth = await connectGoogleDrive();
      setDriveAuth(auth);
      showToast('success', `Connected to Google Drive as ${auth.email}`);
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const handleDisconnectDrive = () => {
    disconnectDrive();
    setDriveAuth(null);
    showToast('success', 'Google Drive disconnected.');
  };

  const handleSyncNow = async () => {
    if (!driveAuth) {
      showToast('error', 'Please connect Google Drive first.');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      const ext      = syncFmt === 'excel' ? 'xlsx' : syncFmt;
      const filename = `Assetra-Backup.${ext}`;
      const blob     = getExportBlob(state, syncFmt);
      
      await uploadToDrive(blob, filename);
      
      setLastBackupTime();
      setLastBackup(lastBackupLabel());
      setSyncStatus('done');
      showToast('success', `✅ Backup uploaded to Google Drive successfully!`);
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') {
        handleDisconnectDrive();
        showToast('error', 'Google Drive connection expired. Please reconnect.');
      } else {
        showToast('error', 'Upload failed: ' + e.message);
      }
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleScheduleChange = (val) => {
    setBackupSchedule(val); setScheduleState(val);
    showToast('success', val === 'off' ? 'Auto backup disabled.' : `Auto backup set to ${val}.`);
  };

  const handleFormatChange = (e) => {
    const val = e.target.value;
    setSyncFormat(val);
    setSyncFmtState(val);
    showToast('success', `Cloud sync format changed to ${val.toUpperCase()}`);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in settings-page">
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage your household, data, backup and account preferences</div>
        </div>
      </div>

      <div className="settings-grid">

        {/* ── Household ──────────────────────────────────────────────────── */}
        <div className="section-box">
          <div className="section-title"><Home size={18} className="s-icon"/> Household</div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Household Name</label>
              <input className="input" value={householdName}
                onChange={e => setHouseholdName(e.target.value)}
                placeholder="e.g. Kumar Family" />
            </div>
            <button type="submit" className="btn btn-primary">
              <Save size={15}/> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ── Profile ────────────────────────────────────────────────────── */}
        <div className="section-box">
          <div className="section-title"><User size={18} className="s-icon"/> Your Profile</div>
          <div className="profile-info">
            <div className="settings-avatar">
              {currentUser?.avatar || currentUser?.name?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="pi-name">{currentUser?.name}</div>
              <div className="pi-email">{currentUser?.email}</div>
              <span className={`badge ${currentUser?.role==='admin'?'badge-purple':'badge-blue'}`}
                style={{ marginTop:6, display:'inline-flex' }}>{currentUser?.role}</span>
            </div>
          </div>
          <button className="btn btn-danger" style={{ marginTop:20 }} onClick={logout}>
            <LogOut size={15}/> Sign Out
          </button>
        </div>

        {/* ── Export & Import ─────────────────────────────────────────── full */}
        <div className="section-box settings-full-width">
          <div className="section-title"><Download size={18} className="s-icon"/> Export &amp; Import</div>
          <p className="section-desc">
            Your data is stored only on this device. Export a backup at any time.
            <span className="privacy-chip"><Shield size={11}/> 100% private — no server involved</span>
          </p>

          <div className="export-row">
            {/* Single Export button → opens format modal */}
            <button className="data-action-btn export-main-btn" onClick={() => setModal('export')}>
              <div className="dab-icon" style={{ background:'rgba(99,102,241,0.15)', color:'var(--accent-light)' }}>
                <Download size={22}/>
              </div>
              <div>
                <div className="dab-title">Export Data</div>
                <div className="dab-desc">Choose format: JSON backup · Excel (all sheets) · CSV</div>
              </div>
            </button>

            {/* Import */}
            <button className="data-action-btn" onClick={() => fileRef.current.click()}>
              <div className="dab-icon" style={{ background:'rgba(245,158,11,0.15)', color:'var(--yellow)' }}>
                <Upload size={22}/>
              </div>
              <div>
                <div className="dab-title">Import Backup</div>
                <div className="dab-desc">Restore from a JSON backup file</div>
              </div>
            </button>
            <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleFileChange}/>
          </div>
        </div>

        {/* ── Cloud Sync ────────────────────────────────────────────────── full */}
        <div className="section-box settings-full-width">
          <div className="section-title"><CloudUpload size={18} className="s-icon"/> Google Drive Backup</div>
          <p className="section-desc">
            Connect your Google account to automatically backup your data securely to your Google Drive. 
            The app only requests permission to view folders and manage files it creates itself.
          </p>

          {/* Folder status */}
          <div className="folder-status-row">
            {driveAuth ? (
              <div className="folder-connected">
                {driveAuth.picture ? (
                  <img src={driveAuth.picture} alt="profile" style={{width: 40, height: 40, borderRadius: '50%'}} />
                ) : (
                  <CheckCircle2 size={32} style={{ color:'var(--green)' }}/>
                )}
                <div style={{ flex: 1 }}>
                  <div className="folder-name">{driveAuth.name}</div>
                  <div className="folder-meta">{driveAuth.email}</div>
                </div>
                
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary btn-sm"
                    disabled={syncStatus === 'syncing'}
                    onClick={handleSyncNow}>
                    {syncStatus === 'syncing' ? '⏳ Uploading…'
                      : syncStatus === 'done'  ? '✅ Done'
                      : <><CloudUpload size={14}/> Sync Now</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleDisconnectDrive}>
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button className="data-action-btn folder-choose-btn" onClick={handleConnectDrive}>
                <div className="dab-icon" style={{ background:'rgba(16,185,129,0.15)', color:'var(--green)' }}>
                  <CloudUpload size={22}/>
                </div>
                <div>
                  <div className="dab-title">Connect Google Drive</div>
                  <div className="dab-desc">Sign in securely with Google to enable cloud backups</div>
                </div>
              </button>
            )}
          </div>

          {/* Preferences */}
          {driveAuth && (
            <div className="sync-preferences">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Target Folder</label>
                <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--panel-hover)', color: 'var(--text-1)' }}>
                  <FolderOpen size={16} style={{ marginRight: 8, color: 'var(--accent-light)' }}/> AssetraBackups
                </div>
              </div>
              <div className="form-group" style={{ width: 180 }}>
                <label>Backup Format</label>
                <select className="input" value={syncFmt} onChange={handleFormatChange}>
                  <option value="json">JSON (Restorable)</option>
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV (Transactions)</option>
                </select>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="schedule-section">
            <div className="schedule-label">
              <Clock size={15}/> Backup Schedule
              <span className="last-backup-chip">Last backup: {lastBackup}</span>
            </div>
            <div className="schedule-grid">
              {SCHEDULE_OPTIONS.map(opt => (
                <button key={opt.value}
                  className={`schedule-btn ${schedule === opt.value ? 'active' : ''}`}
                  onClick={() => handleScheduleChange(opt.value)}>
                  <CalendarDays size={16}/>
                  <div>
                    <div className="sb-label">{opt.label}</div>
                    <div className="sb-desc">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            {schedule !== 'off' && (
              <div className="schedule-note">
                <CheckCircle2 size={13} style={{ color:'var(--green)', flexShrink:0 }}/>
                {driveAuth
                  ? `Auto backup active (${schedule}) — files will be silently uploaded to "AssetraBackups" in Google Drive when due.`
                  : `Schedule set to ${schedule}, but Google Drive is not connected. A manual download prompt will appear when backup is due.`}
              </div>
            )}
          </div>
        </div>

        {/* ── Members ───────────────────────────────────────────────────── */}
        <div className="section-box">
          <div className="section-title">Family Members</div>
          {(state.household?.members || []).length === 0
            ? <p style={{ color:'var(--text-2)', fontSize:'0.88rem' }}>No members added yet.</p>
            : (state.household?.members || []).map(m => (
              <div key={m.id} className="member-row">
                <div className="mem-avatar">{m.avatar}</div>
                <div style={{ flex:1 }}>
                  <div className="mem-name">{m.name}</div>
                  <div className="mem-email">{m.email}</div>
                </div>
                <span className={`badge ${m.role==='admin'?'badge-purple':'badge-gray'}`}>{m.role}</span>
              </div>
            ))
          }
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────────── */}
        <div className="section-box danger-zone">
          <div className="section-title" style={{ color:'var(--red)' }}>
            <Trash2 size={18} className="s-icon"/> Danger Zone
          </div>
          <div className="danger-actions">
            <div className="danger-row">
              <div>
                <div className="danger-row-title"><RefreshCcw size={14}/> Reset All Data</div>
                <div className="danger-row-desc">Wipes everything and starts fresh with empty data. Cannot be undone.</div>
              </div>
              <button className="btn btn-danger" onClick={() => setModal('reset')}>Reset to Empty</button>
            </div>
            <div className="danger-row">
              <div>
                <div className="danger-row-title"><FlaskConical size={14}/> Load Sample Data</div>
                <div className="danger-row-desc">Replaces current data with the Kumar Family demo dataset.</div>
              </div>
              <button className="btn btn-warning" onClick={() => setModal('sample')}>Load Sample</button>
            </div>
          </div>
        </div>

      </div>{/* end settings-grid */}

      {/* ════════════════ MODALS ════════════════ */}

      {/* Export format picker */}
      {modal === 'export' && (
        <Modal title="Export Data" onClose={() => setModal(null)} size="sm">
          <p style={{ color:'var(--text-2)', fontSize:'0.88rem', marginBottom:20 }}>
            Choose a format. <strong>JSON</strong> is the best for full backups &amp; restoring data. <strong>Excel</strong> opens in any spreadsheet app with separate tabs per data type. <strong>CSV</strong> exports transactions only.
          </p>
          <div className="export-format-grid">
            <button className="export-fmt-btn" onClick={() => handleExport('json')}>
              <FileJson size={28} style={{ color:'var(--accent-light)' }}/>
              <div className="efb-title">JSON</div>
              <div className="efb-desc">Full backup · All data · Restorable</div>
            </button>
            <button className="export-fmt-btn" onClick={() => handleExport('excel')}>
              <FileSpreadsheet size={28} style={{ color:'var(--green)' }}/>
              <div className="efb-title">Excel (.xlsx)</div>
              <div className="efb-desc">7 sheets · Transactions, Assets, Accounts &amp; more</div>
            </button>
            <button className="export-fmt-btn" onClick={() => handleExport('csv')}>
              <FileText size={28} style={{ color:'var(--yellow)' }}/>
              <div className="efb-title">CSV</div>
              <div className="efb-desc">Transactions only · Plain text</div>
            </button>
          </div>
        </Modal>
      )}

      {/* Reset confirm */}
      {modal === 'reset' && (
        <Modal title="Reset All Data?" onClose={() => setModal(null)} size="sm">
          <div className="confirm-modal">
            <div className="confirm-icon warn"><Trash2 size={28}/></div>
            <p>This will <strong>permanently delete all your data</strong> — transactions, assets, accounts, budgets, events, insurance — and start completely fresh.</p>
            <p style={{ marginTop:8, color:'var(--text-2)', fontSize:'0.85rem' }}>Tip: Export a JSON backup first.</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReset}>Yes, Reset Everything</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sample confirm */}
      {modal === 'sample' && (
        <Modal title="Load Sample Data?" onClose={() => setModal(null)} size="sm">
          <div className="confirm-modal">
            <div className="confirm-icon info"><FlaskConical size={28}/></div>
            <p>This will <strong>replace all your current data</strong> with the Kumar Family demo dataset.</p>
            <p style={{ marginTop:8, color:'var(--text-2)', fontSize:'0.85rem' }}>Export a backup first if needed.</p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLoadSample}>Yes, Load Sample</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import confirm */}
      {modal === 'import-confirm' && (
        <Modal title="Import Backup?" onClose={() => { setModal(null); setImportData(null); }} size="sm">
          <div className="confirm-modal">
            <div className="confirm-icon info"><Upload size={28}/></div>
            <p>This will <strong>replace all current data</strong> with your backup file.</p>
            <p style={{ marginTop:8, color:'var(--text-2)', fontSize:'0.85rem' }}>
              Contains: <strong>{importData?.transactions?.length||0}</strong> transactions ·{' '}
              <strong>{importData?.assets?.length||0}</strong> assets ·{' '}
              <strong>{importData?.accounts?.length||0}</strong> accounts
            </p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => { setModal(null); setImportData(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImport}>Yes, Import</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

