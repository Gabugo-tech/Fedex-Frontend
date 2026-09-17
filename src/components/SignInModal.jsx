import React, { useState, useEffect } from 'react';
import { signIn } from '../api/auth';

export default function SignInModal({ onSuccess, onClose }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="signin-title">
        {/* Close button */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-logo">
          <span className="logo-fed">Fed</span><span className="logo-ex">Ex</span>
        </div>

        <h2 id="signin-title" className="modal-title">Sign In</h2>
        <p className="modal-sub">Access your FedEx account</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="signin-email">Email Address</label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="admin-error-banner" role="alert">
              <i className="fa-solid fa-triangle-exclamation"></i> {error}
            </div>
          )}

          <button type="submit" className="btn-modal-submit" disabled={loading}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in...</>
              : <><i className="fa-solid fa-arrow-right-to-bracket"></i> Sign In</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
