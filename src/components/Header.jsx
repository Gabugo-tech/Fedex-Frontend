import React, { useState } from 'react';

export default function Header({ user, onSignInClick, onSignOut, onGoToDashboard }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="container top-bar-inner">
          <div className="top-links">
            <a href="#"><i className="fa-solid fa-globe"></i> United States</a>
            <a href="#">English</a>
          </div>
          <div className="top-links">
            {user ? (
              <>
                <span className="top-user">
                  <i className="fa-solid fa-user-shield"></i> {user.email}
                </span>
                {onGoToDashboard && (
                  <button className="top-signin-btn" onClick={onGoToDashboard}>
                    <i className="fa-solid fa-gauge"></i> Dashboard
                  </button>
                )}
                <button className="top-signout" onClick={onSignOut}>
                  <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                </button>
              </>
            ) : (
              <button className="top-signin-btn" onClick={onSignInClick}>
                <i className="fa-regular fa-user"></i> Sign In
              </button>
            )}
            <a href="#"><i className="fa-solid fa-headset"></i> Support</a>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            <span className="logo-fed">Fed</span><span className="logo-ex">Ex</span>
          </div>
          <nav className="nav">
            <a href="#">Shipping</a>
            <a href="#">Tracking</a>
            <a href="#">Printing</a>
            <a href="#">Locations</a>
            <a href="#">Support</a>
          </nav>
          {user && (
            <div className="header-actions">
              <button className="btn-primary">Create a Shipment</button>
            </div>
          )}
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu" aria-expanded={menuOpen}>
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#">Shipping</a>
          <a href="#">Tracking</a>
          <a href="#">Printing</a>
          <a href="#">Locations</a>
          <a href="#">Support</a>
          {user ? (
            <>
              {onGoToDashboard && (
                <button onClick={onGoToDashboard} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: 'var(--purple)', cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}>
                  <i className="fa-solid fa-gauge"></i> Dashboard
                </button>
              )}
              <button onClick={onSignOut} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, color: 'var(--red)', cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}>
                <i className="fa-solid fa-right-from-bracket"></i> Sign Out
              </button>
            </>
          ) : (
            <button onClick={onSignInClick} style={{ textAlign: 'left', background: 'none', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}>
              <i className="fa-regular fa-user"></i> Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
}
