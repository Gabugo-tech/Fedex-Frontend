import React, { useState } from 'react';
import TrackingMap from './TrackingMap';

const STATUS_CLASS = {
  delivered:      'delivered',
  'in-transit':   'in-transit',
  'out-delivery': 'out-delivery',
  pending:        'pending',
  exception:      'exception',
};

const STATUS_ICON = {
  delivered:      'fa-circle-check',
  'in-transit':   'fa-plane',
  'out-delivery': 'fa-truck',
  pending:        'fa-clock',
  exception:      'fa-triangle-exclamation',
};

export default function ResultCard({ result, steps }) {
  const [copied, setCopied] = useState(false);
  const statusCls = STATUS_CLASS[result.status] || 'pending';
  const pct = Math.min(100, (result.progress_step / (steps.length - 1)) * 100);
  const hasMap = (result.origin_lat && result.origin_lng && result.dest_lat && result.dest_lng)
              || (result.map_lat && result.map_lng);

  function copyTracking() {
    navigator.clipboard.writeText(result.tracking_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="result-card">

      {/* ── CARD HEADER ── */}
      <div className="result-card-header">
        <div className="result-card-header-left">
          <div className="tracking-number-label">Tracking Number</div>
          <div className="tracking-number-row">
            <div className="tracking-number-value">{result.tracking_number}</div>
            <button className="btn-copy" onClick={copyTracking} title="Copy tracking number">
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="tracking-service-badge">
            <i className="fa-solid fa-box"></i> {result.service}
            {result.weight && (
              <span className="tracking-weight">
                <i className="fa-solid fa-weight-hanging"></i> {result.weight}
              </span>
            )}
          </div>
        </div>
        <div className="result-card-header-right">
          <span className={`status-badge ${statusCls}`}>
            <i className={`fa-solid ${STATUS_ICON[result.status] || 'fa-box'}`}></i>
            {result.status_label}
          </span>
        </div>
      </div>

      {/* ── INFO BLOCKS ── */}
      <div className="result-card-body">
        <div className="info-block">
          <div className="info-block-icon"><i className="fa-solid fa-location-dot"></i></div>
          <div>
            <div className="info-block-label">Current Location</div>
            <div className="info-block-value">{result.current_location}</div>
          </div>
        </div>
        <div className="info-block">
          <div className="info-block-icon"><i className="fa-solid fa-route"></i></div>
          <div>
            <div className="info-block-label">Route</div>
            <div className="info-block-value">{result.destination}</div>
            <div className="info-block-sub">
              <i className="fa-solid fa-arrow-right-long" style={{ fontSize: '10px', marginRight: '4px' }}></i>
              From: {result.origin}
            </div>
          </div>
        </div>
        {result.delivered_at ? (
          <div className="info-block">
            <div className="info-block-icon delivered"><i className="fa-solid fa-circle-check"></i></div>
            <div>
              <div className="info-block-label">Delivered</div>
              <div className="info-block-value">
                {new Date(result.delivered_at).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })}
              </div>
              {result.recipient && (
                <div className="info-block-sub">
                  <i className="fa-solid fa-user" style={{ fontSize: '10px', marginRight: '4px' }}></i>
                  {result.recipient}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="info-block">
            <div className="info-block-icon"><i className="fa-solid fa-calendar-check"></i></div>
            <div>
              <div className="info-block-label">Estimated Delivery</div>
              <div className="info-block-value">{result.estimated_delivery || '—'}</div>
              <div className="info-block-sub">Subject to change</div>
            </div>
          </div>
        )}
      </div>

      {/* ── LIVE MAP ── */}
      {hasMap && (
        <TrackingMap
          lat={result.map_lat ? parseFloat(result.map_lat) : null}
          lng={result.map_lng ? parseFloat(result.map_lng) : null}
          label={result.current_location}
          originLat={result.origin_lat ? parseFloat(result.origin_lat) : null}
          originLng={result.origin_lng ? parseFloat(result.origin_lng) : null}
          destLat={result.dest_lat ? parseFloat(result.dest_lat) : null}
          destLng={result.dest_lng ? parseFloat(result.dest_lng) : null}
          status={result.status}
        />
      )}

      {/* ── PROGRESS BAR ── */}
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

      {/* ── TIMELINE ── */}
      <div className="timeline-section">
        <h4>Tracking History</h4>
        <div className="timeline">
          {result.timeline.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No events recorded yet.</p>
          ) : (
            result.timeline.map((evt, i) => (
              <div key={`${evt.date}-${i}`} className={`timeline-item ${evt.latest ? 'latest' : ''}`}>
                <div className="timeline-dot"></div>
                <div className="timeline-date">{evt.date}</div>
                <div className="timeline-status">{evt.status}</div>
                <div className="timeline-location">
                  <i className="fa-solid fa-location-dot" style={{ color: '#bbb', fontSize: '11px', marginRight: '4px' }}></i>
                  {evt.location}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
