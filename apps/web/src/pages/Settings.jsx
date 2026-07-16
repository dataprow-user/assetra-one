import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings as SettingsIcon, User, Home, Trash2, Save, LogOut } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { state, dispatch, currentUser, logout } = useApp();
  const [householdName, setHouseholdName] = useState(state.household?.name || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { name: householdName } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (window.confirm('This will reset ALL app data to the default seed data. Continue?')) {
      localStorage.removeItem('a1_data');
      window.location.reload();
    }
  };

  return (
    <div className="animate-in settings-page">
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage your household and account preferences</div>
        </div>
      </div>

      <div className="settings-grid">
        {/* Household */}
        <div className="section-box">
          <div className="section-title">
            <Home size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Household
          </div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Household Name</label>
              <input className="input" value={householdName} onChange={e => setHouseholdName(e.target.value)} placeholder="e.g. Kumar Family" />
            </div>
            <button type="submit" className="btn btn-primary">
              <Save size={15} /> {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Profile */}
        <div className="section-box">
          <div className="section-title">
            <User size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Your Profile
          </div>
          <div className="profile-info">
            <div className="settings-avatar">{currentUser?.avatar || currentUser?.name?.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="pi-name">{currentUser?.name}</div>
              <div className="pi-email">{currentUser?.email}</div>
              <span className={`badge ${currentUser?.role === 'admin' ? 'badge-purple' : 'badge-blue'}`} style={{ marginTop: 6, display: 'inline-flex' }}>
                {currentUser?.role}
              </span>
            </div>
          </div>
          <button className="btn btn-danger" style={{ marginTop: 20 }} onClick={logout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* Members */}
        <div className="section-box">
          <div className="section-title">Family Members</div>
          {(state.household?.members || []).map(m => (
            <div key={m.id} className="member-row">
              <div className="mem-avatar">{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <div className="mem-name">{m.name}</div>
                <div className="mem-email">{m.email}</div>
              </div>
              <span className={`badge ${m.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>{m.role}</span>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="section-box danger-zone">
          <div className="section-title" style={{ color: 'var(--red)' }}>
            <Trash2 size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Danger Zone
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: 16 }}>
            Reset all application data to the default demo dataset. This cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={handleClearData}>Reset App Data</button>
        </div>
      </div>
    </div>
  );
}
