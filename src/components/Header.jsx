import React, { useState } from 'react';
import { useLang } from '../i18n/LanguageContext';

export default function Header({ user, onSignInClick, onSignOut, onGoToDashboard }) {
  const { t, lang, switchLang, LANGUAGES } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="container top-bar-inner">
          <div className="top-links">
            <a href="#" onClick={e => e.preventDefault()}><i className="fa-solid fa-globe"></i> United States</a>
            {/* Language Switcher */}
            <div className="lang-switcher">
              {Object.entries(LANGUAGES).map(([code, info]) => (
                <button
                  key={code}
                  className={`lang-btn ${lang === code ? 'active' : ''}`}
                  onClick={() => switchLang(code)}
                  aria-label={`Switch to ${info.label}`}
                >
                  {info.flag} {info.label}
                </button>
              ))}
            </div>
          </div>
          <div className="top-links">
            {user ? (
              <>
                <span className="top-user">
                  <i className="fa-solid fa-user-shield"></i> {user.email}
                </span>
                {onGoToDashboard && (
                  <button className="top-signin-btn" onClick={onGoToDashboard}>
                    <i className="fa-solid fa-gauge"></i> {t.dashboard}
                  </button>
                )}
                <button className="top-signout" onClick={onSignOut}>
                  <i className="fa-solid fa-right-from-bracket"></i> {t.signOut}
                </button>
              </>
            ) : (
              <button className="top-signin-btn" onClick={onSignInClick}>
                <i className="fa-regular fa-user"></i> {t.signIn}
              </button>
            )}
            <a href="mailto:support@pulstrack.com"><i className="fa-solid fa-headset"></i> {t.support}</a>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            <span className="logo-pulse">Puls</span><span className="logo-track">Track</span>
          </div>
          <nav className="nav">
            <a href="/">Home</a>
            <a href="#" onClick={e => { e.preventDefault(); document.getElementById('trackingInput')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Track</a>
            <a href="mailto:support@pulstrack.com">{t.support}</a>
          </nav>
          {user && (
            <div className="header-actions">
              <button className="btn-primary" onClick={() => {
                if (onGoToDashboard) onGoToDashboard();
                else onSignInClick();
              }}>Create a Shipment</button>
            </div>
          )}
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu" aria-expanded={menuOpen}>
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
          {/* Fix #40: close nav on link click */}
          <a href="/" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#" onClick={e => { e.preventDefault(); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById('trackingInput')?.focus(); }}>Track</a>
          <a href="mailto:support@pulstrack.com" onClick={() => setMenuOpen(false)}>{t.support}</a>
          {/* Mobile language switcher */}
          <div className="lang-switcher mobile">
            {Object.entries(LANGUAGES).map(([code, info]) => (
              <button
                key={code}
                className={`lang-btn ${lang === code ? 'active' : ''}`}
                onClick={() => { switchLang(code); setMenuOpen(false); }}
                aria-label={`Switch to ${info.label}`}
              >
                {/* Fix #45: hide flag emoji from screen readers */}
                <span aria-hidden="true">{info.flag}</span> {info.label}
              </button>
            ))}
          </div>
          {user ? (
            <>
              {onGoToDashboard && (
                <button onClick={onGoToDashboard} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: 'var(--purple)', cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}>
                  <i className="fa-solid fa-gauge"></i> {t.dashboard}
                </button>
              )}
              <button onClick={onSignOut} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: 'var(--red)', cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}>
                <i className="fa-solid fa-right-from-bracket"></i> {t.signOut}
              </button>
            </>
          ) : (
            <button onClick={onSignInClick} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}>
              <i className="fa-regular fa-user"></i> {t.signIn}
            </button>
          )}
        </div>
      </header>
    </>
  );
}
