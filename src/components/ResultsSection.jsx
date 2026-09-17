import React from 'react';
import ResultCard from './ResultCard';

const PROGRESS_STEPS = [
  { label: 'Label Created',    icon: 'fa-tag' },
  { label: 'Picked Up',        icon: 'fa-box' },
  { label: 'In Transit',       icon: 'fa-plane' },
  { label: 'Out for Delivery', icon: 'fa-truck' },
  { label: 'Delivered',        icon: 'fa-house' },
];

export default function ResultsSection({ results, loading, onClear }) {
  return (
    <section className="results-section" id="results-anchor">
      <div className="container">

        {/* Fix #9: only show header once results are ready, not during loading */}
        {!loading && (
          <div className="results-header">
            <h2>Tracking Results</h2>
            <button className="btn-outline" onClick={onClear}>
              <i className="fa-solid fa-xmark"></i> Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner"></div>
            <p style={{ color: '#aaa', fontSize: '14px' }}>
              Looking up your tracking number…
            </p>
            <p style={{ color: '#bbb', fontSize: '12px', marginTop: '6px' }}>
              If this is taking a while, the server may be waking up. Please wait.
            </p>
          </div>
        ) : (
          /* Fix #3: use tracking_number as key instead of array index */
          results.map(result =>
            result.found
              ? <ResultCard key={result.tracking_number} result={result} steps={PROGRESS_STEPS} />
              : <NotFound key={result.tracking_number} trackingNumber={result.tracking_number} />
          )
        )}
      </div>
    </section>
  );
}

function NotFound({ trackingNumber }) {
  return (
    <div className="not-found-card">
      <i className="fa-solid fa-circle-exclamation"></i>
      <h3>No Results Found</h3>
      <p>We couldn't find any shipment information for <strong>{trackingNumber}</strong>.</p>
      <p style={{ marginTop: '8px', fontSize: '13px', color: '#aaa' }}>
        Please check your tracking number and try again. If the issue persists, contact support.
      </p>
    </div>
  );
}
