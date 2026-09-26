import React, { useState } from 'react';
import TrackingMap from './TrackingMap';
import { useLang } from '../i18n/LanguageContext';

// ── Lightbox ──────────────────────────────────────────────
function ItemImage({ url }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="item-image-section">
        <h4><i className="fa-solid fa-image"></i> Item Photo
          <span className="item-image-tap-hint">tap to expand</span>
        </h4>
        <img src={url} alt="Shipment item" className="item-image item-image-clickable"
          onClick={() => setOpen(true)} />
      </div>
      {open && (
        <div className="lightbox-overlay" onClick={() => setOpen(false)}>
          <button className="lightbox-close" onClick={() => setOpen(false)} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img src={url} alt="Shipment item full size" className="lightbox-image"
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

const STATUS_CLASS = {
  delivered: 'delivered', 'in-transit': 'in-transit',
  'out-delivery': 'out-delivery', pending: 'pending', exception: 'exception',
};
const STATUS_ICON = {
  delivered: 'fa-circle-check', 'in-transit': 'fa-plane',
  'out-delivery': 'fa-truck', pending: 'fa-clock', exception: 'fa-triangle-exclamation',
};

export default function ResultCard({ result, steps }) {
  const { t } = useLang();
  const [copied, setCopied]         = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const statusCls  = STATUS_CLASS[result.status] || 'pending';
  const hasMap     = !!(result.map_lat && result.map_lng);
  const timeline   = result.timeline || []; // null-safe

  // Parse service_tags from comma-separated string
  const serviceTags = result.service_tags
    ? result.service_tags.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  function copyTracking() {
    navigator.clipboard.writeText(result.tracking_number)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  }
  function shareLink() {
    const url = `${window.location.origin}/track/${encodeURIComponent(result.tracking_number)}`;
    navigator.clipboard.writeText(url)
      .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); })
      .catch(() => {});
  }

  return (
    <div className="result-card">

      {/* ══ HEADER ══════════════════════════════════════ */}
      <div className="rc-header">
        <div className="rc-header-left">
          <div className="rc-tracking-label">Tracking Code</div>
          <div className="rc-tracking-number">{result.tracking_number}</div>
          <div className="rc-tags">
            <span className="rc-tag rc-tag-service">
              <i className="fa-solid fa-box"></i> {result.service}
            </span>
            {serviceTags.map(tag => (
              <span key={tag} className="rc-tag rc-tag-extra">
                <i className="fa-solid fa-tag"></i> {tag}
              </span>
            ))}
            {result.item_name && (
              <span className="rc-tag rc-tag-item">
                <i className="fa-solid fa-cube"></i> {result.item_name}
              </span>
            )}
          </div>
        </div>

        <div className="rc-header-right">
          <span className={`status-badge ${statusCls}`}>
            <i className={`fa-solid ${STATUS_ICON[result.status] || 'fa-box'}`}></i>
            {result.status_label}
          </span>
          <div className="rc-header-actions">
            <button className="btn-copy" onClick={copyTracking} title="Copy tracking number">
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button className="btn-share" onClick={shareLink} title="Share tracking link">
              <i className={`fa-solid ${linkCopied ? 'fa-check' : 'fa-share-nodes'}`}></i>
              <span>{linkCopied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ MAIN INFO GRID ══════════════════════════════ */}
      <div className="rc-info-grid">
        {(result.receiver_name || result.recipient) && (
          <div className="rc-info-item">
            <div className="rc-info-label">Recipient</div>
            <div className="rc-info-value rc-highlight">
              {result.receiver_name || result.recipient}
            </div>
          </div>
        )}
        <div className="rc-info-item">
          <div className="rc-info-label">Destination</div>
          <div className="rc-info-value rc-highlight">
            {result.receiver_address || result.destination}
          </div>
        </div>
        <div className="rc-info-item">
          <div className="rc-info-label">
            <i className="fa-regular fa-calendar"></i> ETA
          </div>
          <div className="rc-info-value">
            {result.delivered_at
              ? new Date(result.delivered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : result.estimated_delivery || '—'}
          </div>
        </div>
        <div className="rc-info-item">
          <div className="rc-info-label">
            <i className="fa-solid fa-location-dot"></i> Current Location
          </div>
          <div className="rc-info-value rc-highlight">{result.current_location}</div>
        </div>
        <div className="rc-info-item rc-info-item-route">
          <div className="rc-info-label">Route</div>
          <div className="rc-route-row">
            <div className="rc-route-point">
              <span className="route-point-tag origin-tag">FROM</span>
              <span className="rc-info-value">{result.origin}</span>
            </div>
            <i className="fa-solid fa-arrow-right rc-route-arrow"></i>
            <div className="rc-route-point">
              <span className="route-point-tag dest-tag">TO</span>
              <span className="rc-info-value">{result.destination}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ ITEM IMAGE ══════════════════════════════════ */}
      {result.item_image_url && <ItemImage url={result.item_image_url} />}

      {/* ══ LIVE MAP ════════════════════════════════════ */}
      {hasMap && (
        <TrackingMap
          lat={parseFloat(result.map_lat)}
          lng={parseFloat(result.map_lng)}
          label={result.current_location}
          status={result.status}
        />
      )}

      {/* ══ PACKAGE DETAILS ═════════════════════════════ */}
      {(result.weight || result.package_size || result.declared_amount || result.special_note) && (
        <div className="rc-section">
          <div className="rc-section-title">
            <i className="fa-solid fa-box-open"></i> Package Details
          </div>
          <div className="rc-pkg-grid">
            {result.weight && (
              <div className="rc-pkg-item">
                <div className="rc-pkg-label"><i className="fa-solid fa-weight-hanging"></i> Weight</div>
                <div className="rc-pkg-value">{result.weight}</div>
              </div>
            )}
            {result.package_size && (
              <div className="rc-pkg-item">
                <div className="rc-pkg-label"><i className="fa-solid fa-ruler-combined"></i> Size</div>
                <div className="rc-pkg-value">{result.package_size}</div>
              </div>
            )}
            {result.declared_amount && (
              <div className="rc-pkg-item">
                <div className="rc-pkg-label"><i className="fa-solid fa-dollar-sign"></i> Amount</div>
                <div className="rc-pkg-value">{result.declared_amount}</div>
              </div>
            )}
          </div>
          {result.special_note && (
            <div className="rc-note">
              <div className="rc-note-label">Note</div>
              <div className="rc-note-text">{result.special_note}</div>
            </div>
          )}
        </div>
      )}

      {/* ══ SENDER / RECEIVER ═══════════════════════════ */}
      {(result.sender_name || result.receiver_name) && (
        <div className="rc-parties-row">
          {result.sender_name && (
            <div className="rc-party-card">
              <div className="rc-party-title">
                <i className="fa-solid fa-user"></i> Sender
              </div>
              <div className="rc-party-name">{result.sender_name}</div>
              {result.sender_phone && (
                <div className="rc-party-detail">
                  <i className="fa-solid fa-phone"></i> {result.sender_phone}
                </div>
              )}
              {result.sender_email && (
                <div className="rc-party-detail">
                  <i className="fa-solid fa-envelope"></i> {result.sender_email}
                </div>
              )}
            </div>
          )}
          {result.receiver_name && (
            <div className="rc-party-card">
              <div className="rc-party-title">
                <i className="fa-solid fa-user-check"></i> Receiver
              </div>
              <div className="rc-party-name">{result.receiver_name}</div>
              {result.receiver_phone && (
                <div className="rc-party-detail">
                  <i className="fa-solid fa-phone"></i> {result.receiver_phone}
                </div>
              )}
              {result.receiver_email && (
                <div className="rc-party-detail">
                  <i className="fa-solid fa-envelope"></i> {result.receiver_email}
                </div>
              )}
              {result.receiver_address && (
                <div className="rc-party-detail">
                  <i className="fa-solid fa-location-dot"></i> {result.receiver_address}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ DELIVERY TIMELINE ═══════════════════════════ */}
      <div className="rc-section">
        <div className="rc-section-title">
          <i className="fa-solid fa-timeline"></i> Delivery Timeline
        </div>
        <div className="dv-stepper">
          {steps.map((step, i) => {
            const isDone    = i < result.progress_step;
            const isCurrent = i === result.progress_step;

            // Match events to steps — fix: prevent "Delivered" events bleeding into "Out for Delivery"
            const stepEvents = timeline.filter(evt => {
              const s = evt.status?.toLowerCase() || '';
              const l = step.label.toLowerCase();
              if (l.includes('label'))     return s.includes('label') || s.includes('creat');
              if (l.includes('picked'))    return s.includes('pick');
              if (l.includes('transit'))   return s.includes('transit') || s.includes('hub') || s.includes('custom') || s.includes('depart') || s.includes('arriv');
              if (l === 'delivered')       return s.startsWith('delivered') || s === 'delivered';
              if (l.includes('delivery'))  return (s.includes('deliver') || s.includes('vehicle') || s.includes('way')) && !s.startsWith('delivered');
              return false;
            });

            return (
              <div key={step.label} className={`dv-step ${isDone ? 'dv-done' : isCurrent ? 'dv-current' : 'dv-pending'}`}>
                {i < steps.length - 1 && <div className="dv-line"></div>}
                <div className="dv-circle">
                  {(isDone || isCurrent) && <i className="fa-solid fa-check"></i>}
                </div>
                <div className="dv-content">
                  <div className="dv-step-label">{step.label}</div>
                  {stepEvents.map((evt, ei) => (
                    <div key={evt.id || ei} className="dv-event">
                      <span className={`dv-event-pill ${isDone || isCurrent ? 'dv-pill-active' : 'dv-pill-dim'}`}>
                        {evt.status}
                      </span>
                      <div className="dv-event-date">{evt.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unmatched events fallback */}
        {(() => {
          const matched = ['label', 'creat', 'pick', 'transit', 'hub', 'custom', 'depart', 'arriv', 'deliver', 'vehicle', 'way'];
          const unmatched = timeline.filter(evt => {
            const s = evt.status?.toLowerCase() || '';
            return !matched.some(kw => s.includes(kw));
          });
          if (!unmatched.length) return null;
          return (
            <div style={{ marginTop: '12px', paddingLeft: '44px' }}>
              {unmatched.map((evt, i) => (
                <div key={evt.id || i} className="dv-event">
                  <span className="dv-event-pill dv-pill-active">{evt.status}</span>
                  <div className="dv-event-date">{evt.date} — {evt.location}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {timeline.length === 0 && (
          <p style={{ color: 'var(--gray-400)', fontSize: '13px', paddingLeft: '44px' }}>
            {t.noEvents}
          </p>
        )}
      </div>

    </div>
  );
}
