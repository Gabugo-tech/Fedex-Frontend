import React, { useState, useEffect, useRef } from 'react';
import TrackingMap from './TrackingMap';
import { useLang } from '../i18n/LanguageContext';

// ── Lightbox image component ──────────────────────────────
function ItemImage({ url }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="item-image-section">
        <h4>
          <i className="fa-solid fa-image"></i> Item Photo
          <span className="item-image-tap-hint">tap to expand</span>
        </h4>
        <img
          src={url}
          alt="Shipment item"
          className="item-image item-image-clickable"
          onClick={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="lightbox-overlay" onClick={() => setOpen(false)}>
          <button className="lightbox-close" onClick={() => setOpen(false)} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img
            src={url}
            alt="Shipment item full size"
            className="lightbox-image"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// Fix #22: add Nominatim-required User-Agent header
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'PulsTrack/1.0 (pulstrack-app)' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const city    = a.city || a.town || a.village || a.county || a.state || '';
    const country = a.country || '';
    return city ? `${city}, ${country}` : country || data.display_name?.split(',')[0] || '';
  } catch {
    return null;
  }
}

import { getJourneyFraction, interpolatePosition } from '../utils/mapMath';

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
  const { t } = useLang();
  const [copied, setCopied]         = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [liveLocation, setLiveLocation] = useState(result.current_location);
  const geocodeTimerRef = useRef(null);
  const lastGeocodedRef = useRef({ lat: null, lng: null });

  const statusCls = STATUS_CLASS[result.status] || 'pending';
  const pct = Math.min(100, (result.progress_step / (steps.length - 1)) * 100);
  const hasMap = (result.origin_lat && result.origin_lng && result.dest_lat && result.dest_lng)
              || (result.map_lat && result.map_lng);

  const isMoving = (result.status === 'in-transit' || result.status === 'out-delivery')
    && result.origin_lat && result.origin_lng && result.dest_lat && result.dest_lng;

  // ── Real-time location update ──────────────────────────
  // Every 30 seconds, calculate plane's current position and reverse geocode it
  useEffect(() => {
    if (!isMoving) return;

    async function updateLocation() {
      let lat, lng;

      if (result.pickup_time && result.delivery_time) {
        const frac = getJourneyFraction(result.pickup_time, result.delivery_time);
        if (frac === null) return;
        const pos = interpolatePosition(
          parseFloat(result.origin_lat), parseFloat(result.origin_lng),
          parseFloat(result.dest_lat),   parseFloat(result.dest_lng),
          frac
        );
        lat = pos.lat;
        lng = pos.lng;
      } else {
        // No time window — use midpoint as approximation
        lat = (parseFloat(result.origin_lat) + parseFloat(result.dest_lat)) / 2;
        lng = (parseFloat(result.origin_lng) + parseFloat(result.dest_lng)) / 2;
      }

      // Only reverse geocode if position changed significantly (>0.5 degree)
      const prev = lastGeocodedRef.current;
      const moved = !prev.lat || Math.hypot(lat - prev.lat, lng - prev.lng) > 0.5;
      if (!moved) return;

      lastGeocodedRef.current = { lat, lng };
      const name = await reverseGeocode(lat, lng);
      if (name) setLiveLocation(name);
    }

    // Run immediately then every 30s
    updateLocation();
    const id = setInterval(updateLocation, 30000);
    return () => clearInterval(id);
  }, [isMoving, result.pickup_time, result.delivery_time,
      result.origin_lat, result.origin_lng, result.dest_lat, result.dest_lng]);

// Fix #12: add .catch to clipboard writes
  function copyTracking() {
    navigator.clipboard.writeText(result.tracking_number)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { /* clipboard not available */ });
  }

  function shareLink() {
    const url = `${window.location.origin}/?track=${encodeURIComponent(result.tracking_number)}`;
    navigator.clipboard.writeText(url)
      .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); })
      .catch(() => { /* clipboard not available */ });
  }

  return (
    <div className="result-card">

      {/* ── CARD HEADER ── */}
      <div className="result-card-header">
        <div className="result-card-header-left">
          <div className="tracking-number-label">{t.trackingNumber}</div>
          <div className="tracking-number-row">
            <div className="tracking-number-value">{result.tracking_number}</div>
            <button className="btn-copy" onClick={copyTracking} title={t.copy}>
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? t.copied : t.copy}</span>
            </button>
            <button className="btn-share" onClick={shareLink} title="Share tracking link">
              <i className={`fa-solid ${linkCopied ? 'fa-check' : 'fa-share-nodes'}`}></i>
              <span>{linkCopied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
          {result.item_name && (
            <div className="tracking-item-name">
              <i className="fa-solid fa-tag"></i> {result.item_name}
            </div>
          )}
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
            <div className="info-block-label">
              {t.currentLocation}
              {isMoving && (
                <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--orange)', fontWeight: 700 }}>
                  <i className="fa-solid fa-circle" style={{ fontSize: '7px', animation: 'pulse 1.2s infinite' }}></i> LIVE
                </span>
              )}
            </div>
            <div className="info-block-value">{liveLocation}</div>
          </div>
        </div>
        <div className="info-block">
          <div className="info-block-icon"><i className="fa-solid fa-route"></i></div>
          <div>
            <div className="info-block-label">{t.route}</div>
            <div className="info-block-value">{result.destination}</div>
            <div className="info-block-sub">
              <i className="fa-solid fa-arrow-right-long" style={{ fontSize: '10px', marginRight: '4px' }}></i>
              {t.from} {result.origin}
            </div>
          </div>
        </div>
        {result.delivered_at ? (
          <div className="info-block">
            <div className="info-block-icon delivered"><i className="fa-solid fa-circle-check"></i></div>
            <div>
              <div className="info-block-label">{t.delivered}</div>
              <div className="info-block-value">
                {new Date(result.delivered_at).toLocaleString(undefined, {
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
              <div className="info-block-label">{t.estimatedDelivery}</div>
              <div className="info-block-value">{result.estimated_delivery || '—'}</div>
              <div className="info-block-sub">{t.subjectToChange}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── ITEM IMAGE ── */}
      {result.item_image_url && (
        <ItemImage url={result.item_image_url} />
      )}

      {/* ── LIVE MAP ── */}
      {hasMap && (
        <TrackingMap
          lat={result.map_lat ? parseFloat(result.map_lat) : null}
          lng={result.map_lng ? parseFloat(result.map_lng) : null}
          label={liveLocation}
          originLat={result.origin_lat ? parseFloat(result.origin_lat) : null}
          originLng={result.origin_lng ? parseFloat(result.origin_lng) : null}
          destLat={result.dest_lat ? parseFloat(result.dest_lat) : null}
          destLng={result.dest_lng ? parseFloat(result.dest_lng) : null}
          status={result.status}
          liveLabel={t.liveLocation}
          pickupTime={result.pickup_time || null}
          deliveryTime={result.delivery_time || null}
        />
      )}

      {/* ── PROGRESS BAR ── */}
      <div className="progress-section">
        <h4>{t.shipmentProgress}</h4>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }}></div>
          {steps.map((step, i) => {
            const cls = i < result.progress_step ? 'done' : i === result.progress_step ? 'current' : '';
            return (
              <div key={step.label} className={`step ${cls}`}>
                <div className="step-dot"><i className={`fa-solid ${step.icon}`}></i></div>
                <div className="step-label">{step.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="timeline-section">
        <h4>{t.trackingHistory}</h4>
        <div className="timeline">
          {result.timeline.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>{t.noEvents}</p>
          ) : (
            result.timeline.map((evt, i) => (
              // Fix #16: use evt.id as stable key (now returned by backend)
              <div key={evt.id || `${evt.date}-${i}`} className={`timeline-item ${evt.latest ? 'latest' : ''}`}>
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
