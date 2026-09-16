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
        <div className="results-header">
          <h2>Tracking Results</h2>
          <button className="btn-outline" onClick={onClear}>
            <i className="fa-solid fa-xmark"></i> Clear
          </button>
        </div>

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner"></div>
            <p style={{ color: '#aaa', fontSize: '14px' }}>Looking up your tracking number...</p>
          </div>
        ) : (
          results.map((result, i) =>
            result.found
              ? <ResultCard key={i} result={result} steps={PROGRESS_STEPS} />
              : <NotFound key={i} trackingNumber={result.tracking_number} />
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
