import React, { useEffect, useRef, useState } from 'react';
import { getJourneyFraction, interpolatePosition } from '../utils/mapMath';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// ── Leaflet loader ────────────────────────────────────────
function loadLeaflet(cancelRef) {
  return new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css')) {
      const link = Object.assign(document.createElement('link'), {
        id: 'leaflet-css', rel: 'stylesheet', href: LEAFLET_CSS,
      });
      document.head.appendChild(link);
    }
    if (window.L) return resolve();
    if (document.getElementById('leaflet-js')) {
      const wait = setInterval(() => {
        if (cancelRef.current) { clearInterval(wait); reject(new Error('cancelled')); return; }
        if (window.L)          { clearInterval(wait); resolve(); }
      }, 50);
      return;
    }
    const script = Object.assign(document.createElement('script'), {
      id: 'leaflet-js', src: LEAFLET_JS,
    });
    script.onload  = () => { if (!cancelRef.current) resolve(); };
    script.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(script);
  });
}

// ── Component ─────────────────────────────────────────────
export default function TrackingMap({
  lat, lng, label,
  originLat, originLng,
  destLat, destLng,
  status,
  pickupTime,
  deliveryTime,
}) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const cancelledRef = useRef(false);
  const markerRef   = useRef(null);
  const updateTimerRef = useRef(null);
  const [mapLoading, setMapLoading] = useState(true);

  // Compute the current package position
  function getCurrentPos() {
    const hasRoute = originLat && originLng && destLat && destLng;
    if (!hasRoute) return lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;

    if (pickupTime && deliveryTime) {
      const frac = getJourneyFraction(pickupTime, deliveryTime);
      if (frac !== null) {
        return interpolatePosition(
          parseFloat(originLat), parseFloat(originLng),
          parseFloat(destLat),   parseFloat(destLng),
          frac
        );
      }
    }
    // Fallback: use stored map pin or origin
    if (lat && lng) return { lat: parseFloat(lat), lng: parseFloat(lng) };
    return { lat: parseFloat(originLat), lng: parseFloat(originLng) };
  }

  useEffect(() => {
    const hasRoute = originLat && originLng && destLat && destLng;
    const hasPos   = lat && lng;
    if (!hasRoute && !hasPos) return;

    cancelledRef.current = false;

    loadLeaflet(cancelledRef).then(() => {
      if (cancelledRef.current || !mapRef.current) return;

      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }

      const L   = window.L;
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      // ── Standard OSM tiles — light, clean, no API key ──
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      instanceRef.current = map;
      setMapLoading(false);

      const currentPos = getCurrentPos();

      if (hasRoute) {
        // Fit map to show both origin and destination
        const bounds = L.latLngBounds([
          [parseFloat(originLat), parseFloat(originLng)],
          [parseFloat(destLat),   parseFloat(destLng)],
        ]);
        map.fitBounds(bounds, { padding: [48, 48] });

        // ── Destination marker — hollow orange circle ──
        L.marker([parseFloat(destLat), parseFloat(destLng)], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width:14px;height:14px;border-radius:50%;
              background:#fff;
              border:3px solid #ff6200;
              box-shadow:0 1px 4px rgba(0,0,0,0.25);
            "></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>Destination</strong>');

        // ── Current position marker — solid red dot ──
        if (currentPos) {
          markerRef.current = L.marker([currentPos.lat, currentPos.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="
                width:16px;height:16px;border-radius:50%;
                background:#ef4444;
                border:3px solid #fff;
                box-shadow:0 0 0 3px rgba(239,68,68,0.3),0 2px 6px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [16, 16], iconAnchor: [8, 8],
            }),
          }).addTo(map).bindPopup(`<strong>${label || 'Current Location'}</strong>`);
        }

      } else if (hasPos) {
        // Single pin fallback
        map.setView([parseFloat(lat), parseFloat(lng)], 12);
        markerRef.current = L.marker([parseFloat(lat), parseFloat(lng)], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width:16px;height:16px;border-radius:50%;
              background:#ef4444;
              border:3px solid #fff;
              box-shadow:0 0 0 3px rgba(239,68,68,0.3),0 2px 6px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [16, 16], iconAnchor: [8, 8],
          }),
        }).addTo(map).bindPopup(`<strong>${label || 'Current Location'}</strong>`).openPopup();
      }

      // ── Live position updates every 30s if time window is set ──
      const isMoving = (status === 'in-transit' || status === 'out-delivery') && hasRoute;
      if (isMoving && pickupTime && deliveryTime) {
        updateTimerRef.current = setInterval(() => {
          if (cancelledRef.current || !markerRef.current) return;
          const pos = getCurrentPos();
          if (pos) markerRef.current.setLatLng([pos.lat, pos.lng]);
        }, 30000);
      }

    }).catch(() => {});

    return () => {
      cancelledRef.current = true;
      if (updateTimerRef.current) { clearInterval(updateTimerRef.current); updateTimerRef.current = null; }
      if (instanceRef.current)    { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [lat, lng, originLat, originLng, destLat, destLng, status, pickupTime, deliveryTime]);

  const canShow = (originLat && originLng && destLat && destLng) || (lat && lng);
  if (!canShow) return null;

  const isLive      = status === 'in-transit' || status === 'out-delivery';
  const isDelivered = status === 'delivered';
  const hasRoute    = originLat && originLng && destLat && destLng;

  return (
    <div className="tracking-map-section">

      {/* ── Header row matching Delivio style ── */}
      <div className="tm-header">
        <div className="tm-title">
          <i className="fa-solid fa-location-dot" style={{ color: '#ff6200' }}></i>
          Live Tracking
        </div>
        <div className="tm-status-chip">
          {isDelivered
            ? <><span className="tm-chip-dot tm-chip-green"></span> Delivered</>
            : isLive
              ? <><span className="tm-chip-dot tm-chip-orange tm-chip-pulse"></span> Live</>
              : <><span className="tm-chip-dot tm-chip-gray"></span> Awaiting GPS</>
          }
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ position: 'relative' }}>
        {mapLoading && (
          <div className="map-loading-placeholder">
            <div className="spinner"></div>
            <p>Loading map…</p>
          </div>
        )}
        <div
          ref={mapRef}
          className="tracking-map"
          role="img"
          aria-label="Live package location map"
          style={{ visibility: mapLoading ? 'hidden' : 'visible' }}
        ></div>
      </div>

      {/* ── Legend matching Delivio ── */}
      <div className="tm-legend">
        {hasRoute && (
          <>
            <span className="tm-legend-item">
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                background: '#ef4444', marginRight: 5, verticalAlign: 'middle',
              }}></span>
              Current
            </span>
            <span className="tm-legend-item">
              <span style={{
                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                border: '2px solid #ff6200', background: '#fff', marginRight: 5, verticalAlign: 'middle',
              }}></span>
              Destination
            </span>
          </>
        )}
        {label && (
          <span className="tm-legend-label">{label}</span>
        )}
      </div>

    </div>
  );
}
