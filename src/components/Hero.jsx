import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/LanguageContext';

export default function Hero({ onTrack, loading, error }) {
  const { t } = useLang();
  const [input, setInput]           = useState('');
  const [inputError, setInputError] = useState(false);
  const didTrackRef    = useRef(false);
  const hadErrorRef    = useRef(false);

  useEffect(() => {
    // Fix #34: only scroll if there was no error (results actually appeared)
    if (!loading && didTrackRef.current) {
      didTrackRef.current = false;
      if (!hadErrorRef.current) {
        const el = document.getElementById('results-anchor');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      hadErrorRef.current = false;
    }
  }, [loading]);

  // Sync error ref so the scroll effect can check it
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
    // Fix #32: only clear input when there is no current error — clear after submit
    // We don't clear here; clear happens in App after successful result
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleTrack();
  }

  return (
    <section className="hero">
      <div className="container hero-content">
        <h1>{t.heroTitle}</h1>
        <p>{t.heroSub}</p>

        <div className="tracking-card">
          <div className="tracking-tabs">
            <button className="tab active">{t.trackBtn}</button>
          </div>

          <div className="tracking-body">
            {/* Fix #41: remove duplicate aria-label — label is sufficient */}
            <label htmlFor="trackingInput">{t.trackLabel}</label>
            <div className="tracking-input-row">
              <input
                id="trackingInput"
                type="text"
                placeholder={t.trackPlaceholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                className={inputError ? 'error' : ''}
                maxLength={200}
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

            {/* Fix #33: add aria-live so screen readers announce errors */}
            {inputError && (
              <p role="alert" aria-live="assertive" className="error-hint">
                {t.trackPlaceholder}
              </p>
            )}

            {error && (
              <div className="error-banner" role="alert" aria-live="assertive">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
