import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../i18n/LanguageContext';

export default function Hero({ onTrack, loading, error }) {
  const { t } = useLang();
  const [input, setInput]           = useState('');
  const [inputError, setInputError] = useState(false);
  const didTrackRef = useRef(false);

  useEffect(() => {
    if (!loading && didTrackRef.current) {
      didTrackRef.current = false;
      const el = document.getElementById('results-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

  function handleTrack() {
    if (!input.trim()) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1500);
      return;
    }
    didTrackRef.current = true;
    onTrack(input);
    setInput('');
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
                aria-label={t.trackLabel}
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

            {error && (
              <div className="error-banner" role="alert">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
