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
const STATUS_DESC = {
  delivered:      'statusDescDelivered',
  'in-transit':   'statusDescInTransit',
  'out-delivery': 'statusDescOutDelivery',
  pending:        'statusDescPending',
  exception:      'statusDescException',
};

export default function ResultCard({ result, steps }) {
  const { t } = useLang();
  const [copied, setCopied]         = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const statusCls  = STATUS_CLASS[result.status] || 'pending';
  const hasMap = !!(result.map_lat && result.map_lng) ||
                 !!(result.origin_lat && result.origin_lng && result.dest_lat && result.dest_lng);
  const timeline   = result.timeline || [];

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

      {/* ══ STATUS BANNER ═══════════════════════════════ */}
      <div className={`rc-status-banner ${statusCls}`}>
        <div className="rc-status-icon">
          <i className={`fa-solid ${STATUS_ICON[result.status] || 'fa-box'}`}></i>
        </div>
        <div className="rc-status-text">
          <div className="rc-status-label">{result.status_label}</div>
          <div className="rc-status-desc">{t[STATUS_DESC[result.status]] || ''}</div>
        </div>
      </div>

      {/* ══ HEADER ══════════════════════════════════════ */}
      <div className="rc-header">
        <div className="rc-header-left">
          <div className="rc-tracking-label">{t.trackingNumberLabel}</div>
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

      {/* ══ MAIN INFO GRID ══════════════════════════════ */}
      <div className="rc-info-grid">
        {(result.receiver_name || result.recipient) && (
          <div className="rc-info-item">
            <div className="rc-info-label"><i className="fa-solid fa-user"></i> {t.recipientLabel}</div>
            <div className="rc-info-value rc-highlight">{result.receiver_name || result.recipient}</div>
          </div>
        )}
        <div className="rc-info-item">
          <div className="rc-info-label"><i className="fa-solid fa-location-dot"></i> {t.destinationLabel}</div>
          <div className="rc-info-value rc-highlight">
            {result.receiver_address || result.destination}
          </div>
        </div>
        <div className="rc-info-item">
          <div className="rc-info-label"><i className="fa-regular fa-calendar"></i> {t.expectedDelivery}</div>
          <div className={`rc-info-value ${result.delivered_at ? 'rc-delivered-date' : ''}`}>
            {result.delivered_at
              ? <>
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--green)', marginRight: 5 }}></i>
                  {new Date(result.delivered_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </>
              : result.estimated_delivery
                ? result.estimated_delivery
                : <span style={{ color: 'var(--gray-400)' }}>{t.notYetSet}</span>
            }
          </div>
        </div>
        <div className="rc-info-item">
          <div className="rc-info-label"><i className="fa-solid fa-map-pin"></i> {t.currentLocationLabel}</div>
          <div className="rc-info-value rc-highlight">{result.current_location || '—'}</div>
        </div>
        <div className="rc-info-item rc-info-item-route">
          <div className="rc-info-label"><i className="fa-solid fa-route"></i> {t.routeLabel}</div>
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
          lat={result.map_lat ? parseFloat(result.map_lat) : null}
          lng={result.map_lng ? parseFloat(result.map_lng) : null}
          label={result.current_location}
          status={result.status}
          originLat={result.origin_lat ? parseFloat(result.origin_lat) : null}
          originLng={result.origin_lng ? parseFloat(result.origin_lng) : null}
          destLat={result.dest_lat ? parseFloat(result.dest_lat) : null}
          destLng={result.dest_lng ? parseFloat(result.dest_lng) : null}
          pickupTime={result.pickup_time || null}
          deliveryTime={result.delivery_time || null}
        />
      )}

      {/* ══ PACKAGE DETAILS ═════════════════════════════ */}
      {(result.weight || result.package_size || result.declared_amount || result.special_note) && (
        <div className="rc-section">
          <div className="rc-section-title">
            <i className="fa-solid fa-box-open"></i> {t.packageDetails}
          </div>
          <div className="rc-pkg-grid">
            {result.weight && (
              <div className="rc-pkg-item">
                <div className="rc-pkg-label"><i className="fa-solid fa-weight-hanging"></i> {t.weightLabel}</div>
                <div className="rc-pkg-value">{result.weight}</div>
              </div>
            )}
            {result.package_size && (
              <div className="rc-pkg-item">
                <div className="rc-pkg-label"><i className="fa-solid fa-ruler-combined"></i> {t.dimensionsLabel}</div>
                <div className="rc-pkg-value">{result.package_size}</div>
              </div>
            )}
            {result.declared_amount && (
              <div className="rc-pkg-item">
                <div className="rc-pkg-label"><i className="fa-solid fa-dollar-sign"></i> {t.declaredValue}</div>
                <div className="rc-pkg-value">{result.declared_amount}</div>
              </div>
            )}
          </div>
          {result.special_note && (
            <div className="rc-note">
              <div className="rc-note-label"><i className="fa-solid fa-note-sticky"></i> {t.specialInstructions}</div>
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
                <i className="fa-solid fa-user"></i> {t.senderLabel}
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
                <i className="fa-solid fa-user-check"></i> {t.receiverLabel}
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
          <i className="fa-solid fa-timeline"></i> {t.deliveryTimeline}
          {timeline.length > 0 && (
            <span className="rc-timeline-count">{timeline.length} update{timeline.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {timeline.length === 0 ? (
          <div className="rc-empty-timeline">
            <i className="fa-solid fa-clock"></i>
            <p>{t.noUpdatesYet}</p>
          </div>
        ) : (
          <div className="dv-stepper">
            {steps.map((step, i) => {
              const isDone    = i < result.progress_step;
              const isCurrent = i === result.progress_step;

              const stepEvents = timeline.filter(evt => {
                const s = evt.status?.toLowerCase() || '';
                const l = step.label.toLowerCase();
                if (l.includes('label'))    return s.includes('label') || s.includes('creat');
                if (l.includes('picked'))   return s.includes('pick');
                if (l.includes('transit'))  return s.includes('transit') || s.includes('hub') || s.includes('custom') || s.includes('depart') || s.includes('arriv');
                if (l === 'delivered')      return s.startsWith('delivered') || s === 'delivered';
                if (l.includes('delivery')) return (s.includes('deliver') || s.includes('vehicle') || s.includes('way')) && !s.startsWith('delivered');
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
                        <div className="dv-event-date">
                          <i className="fa-regular fa-clock" style={{ marginRight: 4, opacity: 0.6 }}></i>
                          {evt.date}
                          {evt.location && <> &nbsp;·&nbsp; <i className="fa-solid fa-location-dot" style={{ marginRight: 3, opacity: 0.6 }}></i>{evt.location}</>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Unmatched events */}
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
                  <div className="dv-event-date">{evt.date}{evt.location && ` · ${evt.location}`}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

    </div>
  );
}
