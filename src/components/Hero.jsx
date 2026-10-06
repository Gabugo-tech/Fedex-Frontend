import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/LanguageContext';

export default function Hero({ onTrack, loading, error }) {
  const { t } = useLang();
  const [input, setInput]           = useState('');
  const [inputError, setInputError] = useState(false);
  const didTrackRef    = useRef(false);
  const hadErrorRef    = useRef(false);

  useEffect(() => {
    if (!loading && didTrackRef.current) {
      didTrackRef.current = false;
      if (!hadErrorRef.current) {
        const el = document.getElementById('results-anchor');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      hadErrorRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    if (error) hadErrorRef.current = true;
  }, [error]);

  function handleTrack() {
    if (!input.trim()) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1500);
      return;
    }
    didTrackRef.current  = true;
    hadErrorRef.current  = false;
    onTrack(input);
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleTrack();
  }

  return (
    <section className="hero">
      <div className="container hero-content">
        <div className="hero-badge">
          <i className="fa-solid fa-truck-fast"></i> Real-Time Package Tracking
        </div>
        <h1>{t.heroTitle}</h1>
        <p>{t.heroSub}</p>

        <div className="tracking-card">
          <div className="tracking-body">
            <label htmlFor="trackingInput" className="tracking-main-label">
              <i className="fa-solid fa-magnifying-glass"></i> {t.trackLabel}
            </label>
            <div className="tracking-input-row">
              <input
                id="trackingInput"
                type="text"
                placeholder="e.g. PLT-2026-A4K9BZ2M"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                className={inputError ? 'error' : ''}
                maxLength={200}
                autoComplete="off"
              />
              <button
                className="btn-track"
                onClick={handleTrack}
                disabled={loading}
                aria-label={t.trackBtn}
              >
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> {t.tracking}</>
                  : <><i className="fa-solid fa-magnifying-glass"></i> {t.trackBtn}</>
                }
              </button>
            </div>
            <p className="tracking-hint">
              <i className="fa-solid fa-circle-info"></i>
              Enter your tracking number above and press <strong>Track</strong> — you can also track multiple shipments by separating them with a comma.
            </p>

            {inputError && (
              <p role="alert" aria-live="assertive" className="error-hint">
                <i className="fa-solid fa-triangle-exclamation"></i> Please enter a tracking number.
              </p>
            )}

            {error && (
              <div className="error-banner" role="alert" aria-live="assertive">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="hero-trust">
          <span><i className="fa-solid fa-shield-halved"></i> Secure & Private</span>
          <span><i className="fa-solid fa-bolt"></i> Instant Results</span>
          <span><i className="fa-solid fa-globe"></i> Worldwide Tracking</span>
        </div>
      </div>
    </section>
  );
}
