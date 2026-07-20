import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home, User, Save, LogOut, Trash2, RefreshCcw, FlaskConical,
  Download, Upload, Clock, CalendarDays, CheckCircle2, AlertTriangle,
  FileJson, FileSpreadsheet, FileText, Shield, CloudUpload, FolderOpen, Loader2
} from 'lucide-react';
import Modal from '../components/Modal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { exportJSON, exportExcel, exportCSV, buildPayload, getExportBlob } from '../utils/exportData';
import {
  SCHEDULE_OPTIONS, getBackupSchedule, setBackupSchedule,
  setLastBackupTime, lastBackupLabel,
  getSyncFormat, setSyncFormat
} from '../utils/backupSchedule';
import {
  uploadToDrive, downloadLatestBackup
} from '../utils/googleDriveSync';
import './Settings.css';

// ─────────────────────────────────────────────────────────────────────────────

export default function Settings() {
  const {
    state, dispatch, currentUser, logout,
    getUsers, register, updateUser, deleteUser
  } = useApp();
  
  const [householdName, setHouseholdName] = useState(state.household?.name || '');
  const [saved,         setSaved]         = useState(false);
  const [toast,         setToast]         = useState(null);
  const [modal,         setModal]         = useState(null); // 'export'|'reset'|'sample'|'import-confirm'|'privacy-policy'|'member-form'
  const [importData,    setImportData]    = useState(null);
  
  const [memberList,    setMemberList]    = useState(getUsers());
  const [editingMember, setEditingMember] = useState(null);
  
  const [schedule,      setScheduleState] = useState(getBackupSchedule());
  
  const [lastBackup,    setLastBackup]    = useState(lastBackupLabel());
  
  const [syncStatus,    setSyncStatus]    = useState(null); // null | 'syncing' | 'done' | 'error'

  const fileRef = useRef();

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const openMemberModal = (m) => {
    setEditingMember(m);
    setModal('member-form');
  };

  const handleDeleteMember = (id) => {
    // Prevent deleting the last admin
    const admins = memberList.filter(u => u.role === 'admin');
    const memberToDelete = memberList.find(u => u.id === id);
    if (admins.length === 1 && memberToDelete?.role === 'admin') {
      return alert('You cannot remove the only admin in the household.');
    }

    if (window.confirm('Remove this member? They will lose access to login.')) {
      deleteUser(id);
      setMemberList(getUsers());
      showToast('success', 'Member removed.');
    }
  };

  const handleMemberSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    
    if (editingMember) {
      // Prevent the last admin from demoting themselves
      const admins = memberList.filter(u => u.role === 'admin');
      if (admins.length === 1 && editingMember.role === 'admin' && data.role === 'member') {
        return alert('You cannot demote the only admin. Please make someone else an admin first.');
      }

      if (data.password && data.password.length < 6) return alert('Password must be at least 6 characters.');
      if (!data.password) delete data.password;
      updateUser(editingMember.id, { ...data, avatar: data.name.slice(0, 2).toUpperCase() });
      showToast('success', 'Member updated.');
    } else {
      if (data.password.length < 6) return alert('Password must be at least 6 characters.');
      const res = register(data.name, data.email, data.password);
      if (!res.ok) return alert(res.error);
      if (data.role === 'admin') {
         // newly registered user is member by default, so update if admin selected
         const newUsers = getUsers();
         const justAdded = newUsers.find(u => u.email === data.email);
         if (justAdded) updateUser(justAdded.id, { role: 'admin' });
      }
      showToast('success', 'Member added.');
    }
    setMemberList(getUsers());
    setModal(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const handleSave = (e) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: householdName } });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  // ── Reset / Sample ──────────────────────────────────────────────────────────
  const handleReset = async () => {
    dispatch({ type: 'RESET_ALL' });
    setModal(null);
    showToast('success', 'All data cleared. Wiping cloud backup...');
    if (currentUser) {
      try {
        const format = getSyncFormat();
        const ext = format === 'excel' ? 'xlsx' : format;
        const filename = `Assetra-Backup.${ext}`;
        // Import emptyState from AppContext to generate empty payload
        const emptyStateBlob = getExportBlob({
          household: { name: 'My Household', currency: 'INR' },
          accounts: [], transactions: [], assets: [], liabilities: [],
          budgets: [], events: [], insurance: [],
          expenseCategories: [], incomeCategories: [], groups: []
        }, format);
        await uploadToDrive(emptyStateBlob, filename);
        setLastBackupTime();
        setLastBackup(lastBackupLabel());
        showToast('success', 'Cloud backup wiped successfully!');
      } catch (e) {
        showToast('error', 'Failed to wipe cloud backup: ' + e.message);
      }
    }
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
  const handleSyncNow = async () => {
    if (!currentUser) {
      showToast('error', 'Not connected to Google Drive.');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      const filename = 'Assetra-Backup.json';
      const blob     = getExportBlob(state, 'json');
      
      await uploadToDrive(blob, filename);
      
      setLastBackupTime();
      setLastBackup(lastBackupLabel());
      setSyncStatus('done');
      showToast('success', `✅ Backup uploaded to Google Drive successfully!`);
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') {
        logout();
        showToast('error', 'Session expired. Please sign in again.');
      } else {
        showToast('error', 'Upload failed: ' + e.message);
      }
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleScheduleChange = (val) => {
    setScheduleState(val);
    setBackupSchedule(val);
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
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn btn-danger" onClick={logout}>
              <LogOut size={15}/> Sign Out
            </button>
            <button className="btn btn-ghost" onClick={() => setModal('privacy-policy')}>
              Privacy Policy
            </button>
          </div>
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
            <div className="folder-connected">
              {currentUser.picture ? (
                <img src={currentUser.picture} alt="profile" style={{width: 40, height: 40, borderRadius: '50%'}} />
              ) : (
                <CheckCircle2 size={32} style={{ color:'var(--green)' }}/>
              )}
              <div style={{ flex: 1 }}>
                <div className="folder-name">{currentUser.name}</div>
                <div className="folder-meta">{currentUser.email}</div>
              </div>
              
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary btn-sm"
                  disabled={syncStatus === 'syncing'}
                  onClick={handleSyncNow}>
                  {syncStatus === 'syncing' ? '⏳ Uploading…'
                    : syncStatus === 'done'  ? '✅ Done'
                    : <><CloudUpload size={14}/> Sync Now</>}
                </button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="sync-preferences">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Target Folder</label>
              <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--panel-hover)', color: 'var(--text-1)' }}>
                <FolderOpen size={16} style={{ marginRight: 8, color: 'var(--accent-light)' }}/> AssetraBackups
              </div>
            </div>
          </div>

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
                {currentUser
                  ? `Auto backup active (${schedule}) — files will be silently uploaded to "AssetraBackups" in Google Drive when due.`
                  : `Schedule set to ${schedule}, but Google Drive is not connected. A manual download prompt will appear when backup is due.`}
              </div>
            )}
          </div>
        </div>

        {/* ── Members ───────────────────────────────────────────────────── */}
        <div className="section-box">
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            Family Members
            {currentUser?.role === 'admin' && (
              <button className="btn btn-secondary btn-sm" onClick={() => openMemberModal(null)}>Add Member</button>
            )}
          </div>
          
          {memberList.length === 0
            ? <p style={{ color:'var(--text-2)', fontSize:'0.88rem' }}>No members added yet.</p>
            : memberList.map(m => (
              <div key={m.id} className="member-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="mem-avatar" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--panel-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-light)' }}>
                  {m.avatar}
                </div>
                <div style={{ flex:1 }}>
                  <div className="mem-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{m.name}</div>
                  <div className="mem-email" style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{m.email}</div>
                </div>
                <span className={`badge ${m.role==='admin'?'badge-purple':'badge-gray'}`}>{m.role}</span>
                
                {(currentUser?.role === 'admin' || currentUser?.id === m.id) && (
                  <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                    <button className="act-btn edit" onClick={() => openMemberModal(m)} title="Edit Member">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    {m.id !== currentUser?.id && currentUser?.role === 'admin' && (
                      <button className="act-btn delete" onClick={() => handleDeleteMember(m.id)} title="Remove Member">
                        <Trash2 size={15}/>
                      </button>
                    )}
                  </div>
                )}
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

      {/* Member Form Modal */}
      {modal === 'member-form' && (
        <Modal title={editingMember ? 'Edit Member' : 'Add Member'} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleMemberSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="input" name="name" required defaultValue={editingMember?.name || ''} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input className="input" type="email" name="email" required defaultValue={editingMember?.email || ''} readOnly={!!editingMember} style={editingMember ? { background: 'var(--panel-hover)', color: 'var(--text-2)' } : {}}/>
            </div>
            <div className="form-group">
              <label>{editingMember ? 'New Password (leave blank to keep current)' : 'Password'}</label>
              <input className="input" type="password" name="password" minLength={editingMember ? undefined : 6} required={!editingMember} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select className="input" name="role" defaultValue={editingMember?.role || 'member'} disabled={currentUser?.role !== 'admin' && !(!memberList.find(u => u.role === 'admin'))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingMember ? 'Save Changes' : 'Add Member'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Privacy Policy */}
      {modal === 'privacy-policy' && <PrivacyPolicyModal onClose={() => setModal(null)} />}
    </div>
  );
}

