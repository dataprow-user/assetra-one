import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { connectGoogleDrive, downloadLatestBackup } from '../utils/googleDriveSync';
import { trackUserEvent } from '../utils/userTracker';
import './Login.css';

export default function Login() {
  const { loginWithGoogle, dispatch } = useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // 1. Authenticate with Google Drive
      const auth = await connectGoogleDrive();
      
      // 2. Try to pull existing data instantly
      try {
        const cloudData = await downloadLatestBackup('Assetra-Backup.json');
        if (cloudData && (cloudData.transactions || cloudData.assets)) {
          dispatch({ type: 'IMPORT_DATA', payload: cloudData });
        }
      } catch (pullError) {
        // If they have no backup yet, that's fine, they start fresh!
        console.log('No backup found or failed to pull on login', pullError);
      }

      // 3. Log them into the app
      loginWithGoogle(auth);
      trackUserEvent(auth.name, auth.email, 'Google Drive Login');

    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left graphic panel */}
      <div className="auth-graphic">
        <div className="auth-graphic-inner">
          <div className="auth-brand-logo">A1</div>
          <h1>Assetra One</h1>
          <p className="auth-tagline">Your Family's Complete<br />Financial Command Center</p>
          <div className="auth-features">
            {['Track Assets & Liabilities', 'Manage Family Budgets', 'Monitor Investments & Gold', 'Seamless Cloud Syncing'].map(f => (
              <div key={f} className="auth-feature-item">
                <span className="dot" />
                {f}
              </div>
            ))}
          </div>

          <div className="storage-notice">
            <div className="storage-notice-title">☁️ Secure Cloud Sync</div>
            <p>Your data is synced directly to your personal <strong>Google Drive</strong>. You are the only person who has access to your financial data.</p>
          </div>
        </div>
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
      </div>

      {/* Right form panel */}
      <div className="auth-form-side">
        <div className="auth-box">
          <div className="auth-box-header">
            <h2>Welcome to Assetra</h2>
            <p>Sign in securely with Google to sync your household data across all your devices.</p>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            {error && <div className="auth-error" style={{ width: '100%' }}>{error}</div>}
            
            <button 
              className="btn btn-primary auth-submit" 
              onClick={handleGoogleLogin} 
              disabled={loading}
              style={{ padding: '16px 24px', fontSize: '1.1rem', display: 'flex', gap: '12px', justifyContent: 'center' }}
            >
              {loading ? (
                <span>Syncing your data...</span>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l2.85-2.22.83-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google Drive
                </>
              )}
            </button>
            
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
              We request access to a specific folder in your Drive to backup and restore your financial data. We cannot see your other files.
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.8rem' }}>
            <button className="forgot-link" onClick={() => setShowPrivacy(true)}>View Privacy Policy</button>
          </div>
        </div>
      </div>

      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}
