import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import './Login.css';

const USERS_KEY = 'a1_users';

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
}

// ---------- Forgot Password sub-view ----------
function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1); // 1 = enter email, 2 = set new password, 3 = done
  const [email, setEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError('');
    const users = loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      setError('No account found with that email address.');
      return;
    }
    setStep(2);
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (newPwd.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPwd !== confirmPwd) { setError('Passwords do not match.'); return; }
    const users = loadUsers();
    const updated = users.map(u =>
      u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPwd } : u
    );
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
    setStep(3);
  };

  return (
    <div className="auth-box">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Sign In
      </button>

      {step === 1 && (
        <>
          <div className="auth-box-header">
            <h2>Reset Password</h2>
            <p>Enter the email address you used to sign up and we'll let you set a new password.</p>
          </div>
          <form onSubmit={handleEmailSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input className="input" type="email" required placeholder="you@family.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary auth-submit">Continue</button>
          </form>
          <div className="auth-info-box">
            <strong>ℹ️ Note:</strong> Since this app stores data locally in your browser, your account
            data (transactions, assets etc.) is still safe. You're only resetting your login password.
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="auth-box-header">
            <h2>Set New Password</h2>
            <p>Account found for <strong>{email}</strong>. Enter your new password below.</p>
          </div>
          <form onSubmit={handleResetSubmit} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <input className="input" type="password" required minLength={6} placeholder="Min. 6 characters"
                value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="input" type="password" required placeholder="Re-enter password"
                value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="btn btn-primary auth-submit">Reset Password</button>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="reset-success">
          <CheckCircle size={56} className="success-icon" />
          <h2>Password Reset!</h2>
          <p>Your password has been updated successfully. You can now sign in with your new password.</p>
          <button className="btn btn-primary auth-submit" onClick={onBack}>Go to Sign In</button>
        </div>
      )}
    </div>
  );
}

// ---------- Main Login component ----------
export default function Login() {
  const { login, register } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    let result;
    if (mode === 'login') {
      result = login(form.email, form.password);
    } else {
      if (!form.name.trim()) { setError('Name is required.'); setLoading(false); return; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      result = register(form.name, form.email, form.password);
    }
    if (!result.ok) setError(result.error);
    setLoading(false);
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
            {['Track Assets & Liabilities', 'Manage Family Budgets', 'Monitor Investments & Gold', 'EMI & Insurance Alerts'].map(f => (
              <div key={f} className="auth-feature-item">
                <span className="dot" />
                {f}
              </div>
            ))}
          </div>

          <div className="storage-notice">
            <div className="storage-notice-title">📦 Where is your data stored?</div>
            <p>All your data (accounts, assets, transactions) is securely stored in <strong>your browser's localStorage</strong> on this device. No data is sent to any server.</p>
          </div>
        </div>
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
      </div>

      {/* Right form panel */}
      <div className="auth-form-side">
        {mode === 'forgot' ? (
          <ForgotPassword onBack={() => { setMode('login'); setError(''); }} />
        ) : (
          <div className="auth-box">
            <div className="auth-box-header">
              <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
              <p>{mode === 'login' ? 'Sign in to your family account.' : 'Join your household on Assetra One.'}</p>
            </div>

            <div className="auth-demo-hint">
              <span>Demo:</span> ravi@kumar.family / password123
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'register' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="input" type="text" placeholder="Ravi Kumar" value={form.name} onChange={set('name')} />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input className="input" type="email" required placeholder="you@family.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group">
                <div className="label-row">
                  <label>Password</label>
                  {mode === 'login' && (
                    <button type="button" className="forgot-link"
                      onClick={() => { setMode('forgot'); setError(''); setForm({ name: '', email: '', password: '' }); }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input className="input" type="password" required placeholder="••••••••" minLength={6}
                  value={form.password} onChange={set('password')} />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              {' '}
              <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
