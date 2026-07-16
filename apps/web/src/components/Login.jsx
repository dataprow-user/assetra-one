import React, { useState } from 'react';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if(email && password) {
      onLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="login-graphic">
        <div className="graphic-content">
          <div className="brand-logo huge">A1</div>
          <h1>Assetra One</h1>
          <p>Your Family's Ultimate Financial Hub.</p>
        </div>
      </div>
      <div className="login-form-container">
        <div className="login-box">
          <h2>Welcome Back</h2>
          <p className="subtitle">Sign in to manage your assets.</p>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" required placeholder="you@family.com" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            
            <div className="form-actions">
              <label className="remember-me"><input type="checkbox" /> Remember me</label>
              <a href="#" className="forgot-password">Forgot Password?</a>
            </div>
            
            <button type="submit" className="login-submit-btn">Sign In</button>
            
            <div className="divider"><span>Or continue with</span></div>
            
            <div className="social-logins">
              <button type="button" className="social-btn">Google</button>
              <button type="button" className="social-btn">Apple</button>
            </div>
          </form>
          
          <p className="signup-link">Don't have an account? <a href="#">Create an account</a></p>
        </div>
      </div>
    </div>
  );
}
