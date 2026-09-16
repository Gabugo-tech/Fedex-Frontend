import React, { useState } from 'react';

const DEMO_CODES = ['FX123456789US', 'FX987654321US', 'FX555000111US'];

export default function Hero({ onTrack, loading, error }) {
  const [input, setInput]       = useState('');
  const [activeTab, setActiveTab] = useState('track');
  const [inputError, setInputError] = useState(false);

  function handleTrack() {
    if (!input.trim()) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1500);
      return;
    }
    onTrack(input);
    setTimeout(() => {
      document.getElementById('results-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
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
            {['track', 'manage', 'obtain'].map(tab => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'track' ? 'Track' : tab === 'manage' ? 'Manage Delivery' : 'Obtain Proof'}
              </button>
            ))}
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

            <p className="tracking-hint">
              Try demo codes:{' '}
              {DEMO_CODES.map((code, i) => (
                <React.Fragment key={code}>
                  <span className="demo-code" onClick={() => setInput(code)}>{code}</span>
                  {i < DEMO_CODES.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
