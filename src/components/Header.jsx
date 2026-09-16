import React, { useState } from 'react';

export default function Header() {
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
            <a href="#"><i className="fa-regular fa-user"></i> Sign In / Register</a>
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
          <div className="header-actions">
            <button className="btn-primary">Create a Shipment</button>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
        </div>
        <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#">Shipping</a>
          <a href="#">Tracking</a>
          <a href="#">Printing</a>
          <a href="#">Locations</a>
          <a href="#">Support</a>
          <a href="#">Sign In / Register</a>
        </div>
      </header>
    </>
  );
}
