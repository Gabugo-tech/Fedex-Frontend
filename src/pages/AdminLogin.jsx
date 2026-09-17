import React, { useState } from 'react';
import { signIn } from '../api/auth';

export default function AdminLogin({ onSuccess }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await signIn(email, password);
      onSuccess(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="logo" style={{ marginBottom: '24px' }}>
          <span className="logo-fed">Fed</span><span className="logo-ex">Ex</span>
        </div>
        <h2>Admin Portal</h2>
        <p className="admin-login-sub">Restricted access — authorized personnel only</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="admin-error-banner">
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
          )}

          <button type="submit" className="btn-admin-login" disabled={loading}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in...</>
              : <><i className="fa-solid fa-lock"></i> Sign In</>
            }
          </button>
        </form>

        <a href="#" onClick={e => { e.preventDefault(); window.location.hash = ''; }}
          className="admin-back-link">
          ← Back to tracking
        </a>
      </div>
    </div>
  );
}
