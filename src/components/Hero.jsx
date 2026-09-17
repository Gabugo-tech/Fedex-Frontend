import React, { useState, useEffect, useRef } from 'react';

export default function Hero({ onTrack, loading, error }) {
  const [input, setInput]           = useState('');
  const [inputError, setInputError] = useState(false);
  // Fix #10: use a ref to scroll after results are rendered
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
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleTrack();
  }

  return (
    <section className="hero">
      <div className="container hero-content">
        <h1>Track Your Shipment</h1>
        <p>Get real-time updates on your package location, delivery status, and estimated arrival.</p>

        <div className="tracking-card">
          {/* Tabs */}
          <div className="tracking-tabs">
            <button className="tab active">Track</button>
          </div>

          <div className="tracking-body">
            <label htmlFor="trackingInput">Tracking Number</label>
            <div className="tracking-input-row">
              <input
                id="trackingInput"
                type="text"
                placeholder="Enter up to 5 tracking numbers separated by commas..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                className={inputError ? 'error' : ''}
                maxLength={200}
                aria-label="Tracking number input"
              />
              <button
                className="btn-track"
                onClick={handleTrack}
                disabled={loading}
                aria-label="Track package"
              >
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Tracking...</>
                  : <><i className="fa-solid fa-magnifying-glass"></i> Track</>
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
