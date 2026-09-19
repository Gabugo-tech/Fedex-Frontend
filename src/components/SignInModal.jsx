import React, { useState, useEffect } from 'react';
import { signIn } from '../api/auth';
import { useLang } from '../i18n/LanguageContext';

export default function SignInModal({ onSuccess, onClose }) {
  const { t } = useLang();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

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
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="modal-logo">
          <span className="logo-pulse">Puls</span><span className="logo-track">Track</span>
        </div>

        <h2 id="signin-title" className="modal-title">{t.signInTitle}</h2>
        <p className="modal-sub">{t.signInSub}</p>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="signin-email">{t.emailLabel}</label>
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
            <label htmlFor="signin-password">{t.passwordLabel}</label>
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
              ? <><i className="fa-solid fa-spinner fa-spin"></i> {t.signingIn}</>
              : <><i className="fa-solid fa-arrow-right-to-bracket"></i> {t.signInTitle}</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
