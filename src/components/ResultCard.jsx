import React from 'react';
import TrackingMap from './TrackingMap';

const STATUS_CLASS = {
  delivered:      'delivered',
  'in-transit':   'in-transit',
  'out-delivery': 'out-delivery',
  pending:        'pending',
  exception:      'exception',
};

export default function ResultCard({ result, steps }) {
  const statusCls = STATUS_CLASS[result.status] || 'pending';
  const pct = Math.min(100, (result.progress_step / (steps.length - 1)) * 100);

  return (
    <div className="result-card">
      {/* Header */}
      <div className="result-card-header">
        <div>
          <div className="tracking-number-label">Tracking Number</div>
          <div className="tracking-number-value">{result.tracking_number}</div>
        </div>
        <span className={`status-badge ${statusCls}`}>
          <i className={`fa-solid ${result.status_icon}`}></i>
          {result.status_label}
        </span>
      </div>

      {/* Info blocks */}
      <div className="result-card-body">
        <div className="info-block">
          <div className="info-block-label">Current Location</div>
          <div className="info-block-value">{result.current_location}</div>
          <div className="info-block-sub">{result.service}</div>
        </div>
        <div className="info-block">
          <div className="info-block-label">Destination</div>
          <div className="info-block-value">{result.destination}</div>
          <div className="info-block-sub">From: {result.origin}</div>
        </div>
        {result.delivered_at ? (
          <div className="info-block">
            <div className="info-block-label">Delivered</div>
            <div className="info-block-value">
              {new Date(result.delivered_at).toLocaleString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true,
              })}
            </div>
            <div className="info-block-sub">Recipient: {result.recipient || '—'}</div>
          </div>
        ) : (
          <div className="info-block">
            <div className="info-block-label">Estimated Delivery</div>
            <div className="info-block-value">{result.estimated_delivery || '—'}</div>
            <div className="info-block-sub">Subject to change</div>
          </div>
        )}
      </div>

      {/* Live Map */}
      {result.map_lat && result.map_lng && (
        <TrackingMap
          lat={parseFloat(result.map_lat)}
          lng={parseFloat(result.map_lng)}
          label={result.current_location}
        />
      )}

      {/* Progress bar */}
      <div className="progress-section">
        <h4>Shipment Progress</h4>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }}></div>
          {steps.map((step, i) => {
            const cls = i < result.progress_step ? 'done' : i === result.progress_step ? 'current' : '';
            return (
              <div key={step.label} className={`step ${cls}`}>
                <div className="step-dot">
                  <i className={`fa-solid ${step.icon}`}></i>
                </div>
                <div className="step-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-section">
        <h4>Tracking History</h4>
        <div className="timeline">
          {result.timeline.map((evt, i) => (
            <div key={i} className={`timeline-item ${evt.latest ? 'latest' : ''}`}>
              <div className="timeline-dot"></div>
              <div className="timeline-date">{evt.date}</div>
              <div className="timeline-status">{evt.status}</div>
              <div className="timeline-location">
                <i className="fa-solid fa-location-dot" style={{ color: '#aaa', fontSize: '11px', marginRight: '4px' }}></i>
                {evt.location}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
