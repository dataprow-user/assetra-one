import React from 'react';
import Modal from './Modal';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <Modal title="Privacy Policy" onClose={onClose}>
      <div style={{ color: 'var(--text-1)', fontSize: '0.9rem', lineHeight: '1.6', maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Shield size={32} style={{ color: 'var(--green)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Your Privacy Matters</h3>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.85rem' }}>Effective Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>1. Data Storage</h4>
        <p style={{ color: 'var(--text-2)' }}>
          Assetra One is a client-side application. This means all of your financial data—including accounts, transactions, assets, and liabilities—is stored <strong>locally on your device</strong> within your browser's storage. 
          We do not transmit, process, or store your sensitive financial data on any external servers.
        </p>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>2. Cloud Sync (Google Drive)</h4>
        <p style={{ color: 'var(--text-2)' }}>
          If you choose to enable the Google Drive Backup feature, Assetra One will securely authenticate with your Google account. 
          The application requests the <strong>narrowest possible permissions</strong> (`drive.file`), meaning it can only view and manage the specific backup files it creates inside your Drive. It cannot see or access your other Google Drive files.
        </p>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>3. User Tracking</h4>
        <p style={{ color: 'var(--text-2)' }}>
          To improve the application and understand usage, the developer logs basic account creation and login events. 
          When you create an account, sign in, or connect your Google Drive, we collect your <strong>Name and Email Address</strong>. 
          This information is used strictly for internal usage analytics and to provide support. We never sell or share your email with third parties.
        </p>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>4. Data Deletion</h4>
        <p style={{ color: 'var(--text-2)' }}>
          Because your financial data is stored on your device, you have complete control over it. You can permanently delete all data at any time by going to <strong>Settings &gt; Danger Zone &gt; Reset All Data</strong> or by clearing your browser's local storage.
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" onClick={onClose}>I Understand</button>
      </div>
    </Modal>
  );
}
