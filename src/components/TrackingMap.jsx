import React, { useEffect, useRef, useState } from 'react';

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

// ── Great-circle interpolation ────────────────────────────
function interpolateGreatCircle(lat1, lng1, lat2, lng2, frac) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);
  const x1 = Math.cos(φ1)*Math.cos(λ1), y1 = Math.cos(φ1)*Math.sin(λ1), z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2)*Math.cos(λ2), y2 = Math.cos(φ2)*Math.sin(λ2), z2 = Math.sin(φ2);
  const dot = Math.min(1, Math.max(-1, x1*x2 + y1*y2 + z1*z2));
  const omega = Math.acos(dot);
  if (omega < 0.001) return { lat: lat1 + (lat2-lat1)*frac, lng: lng1 + (lng2-lng1)*frac };
  const s = Math.sin(omega);
  const a = Math.sin((1-frac)*omega)/s, b = Math.sin(frac*omega)/s;
  const x = a*x1+b*x2, y = a*y1+b*y2, z = a*z1+b*z2;
  return { lat: toDeg(Math.atan2(z, Math.sqrt(x*x+y*y))), lng: toDeg(Math.atan2(y,x)) };
}

// ── Journey fraction from clock ───────────────────────────
function getJourneyFraction(pickupTime, deliveryTime) {
  if (!pickupTime || !deliveryTime) return null;
  const now   = Date.now();
  const start = new Date(pickupTime).getTime();
  const end   = new Date(deliveryTime).getTime();
  if (isNaN(start) || isNaN(end) || end - start <= 0) return null;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

// ── Red dot icon ──────────────────────────────────────────
function redDotIcon(L) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#ef4444;
      border:3px solid #fff;
      box-shadow:0 0 0 4px rgba(239,68,68,0.25),0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  });
}

// ── Component ─────────────────────────────────────────────
export default function TrackingMap({
  lat, lng, label, status,
  originLat, originLng,
  destLat, destLng,
  pickupTime, deliveryTime,
}) {
  const mapRef       = useRef(null);
  const instanceRef  = useRef(null);
  const markerRef    = useRef(null);
  const cancelledRef = useRef(false);
  const timerRef     = useRef(null);
  const [mapLoading, setMapLoading] = useState(true);

  const hasRoute   = !!(originLat && originLng && destLat && destLng);
  const hasTimeWindow = !!(pickupTime && deliveryTime);
  const isMoving   = hasRoute && hasTimeWindow &&
                     status !== 'delivered' && status !== 'pending';

  // Compute current dot position
  function getCurrentPos() {
    if (isMoving) {
      const frac = getJourneyFraction(pickupTime, deliveryTime);
      if (frac !== null) {
        return interpolateGreatCircle(
          parseFloat(originLat), parseFloat(originLng),
          parseFloat(destLat),   parseFloat(destLng),
          frac
        );
      }
    }
    // Fall back to manually pinned position
    if (lat && lng) return { lat: parseFloat(lat), lng: parseFloat(lng) };
    if (hasRoute)   return { lat: parseFloat(originLat), lng: parseFloat(originLng) };
    return null;
  }

  useEffect(() => {
    const pos = getCurrentPos();
    if (!pos) return;
    cancelledRef.current = false;

    loadLeaflet(cancelledRef).then(() => {
      if (cancelledRef.current || !mapRef.current) return;
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }

      const L   = window.L;
      const map = L.map(mapRef.current, {
        zoomControl: true, scrollWheelZoom: false, attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // If we have a route, fit bounds to show both endpoints
      if (hasRoute) {
        const bounds = L.latLngBounds([
          [parseFloat(originLat), parseFloat(originLng)],
          [parseFloat(destLat),   parseFloat(destLng)],
        ]);
        map.fitBounds(bounds, { padding: [48, 48] });

        // Origin dot — small gray
        L.circleMarker([parseFloat(originLat), parseFloat(originLng)], {
          radius: 5, color: '#fff', weight: 2,
          fillColor: '#9ca3af', fillOpacity: 1,
        }).addTo(map).bindPopup('<strong>Origin</strong>');

        // Destination dot — hollow orange
        L.circleMarker([parseFloat(destLat), parseFloat(destLng)], {
          radius: 6, color: '#ff6200', weight: 2.5,
          fillColor: '#fff', fillOpacity: 1,
        }).addTo(map).bindPopup('<strong>Destination</strong>');

        // Dashed route line
        L.polyline([
          [parseFloat(originLat), parseFloat(originLng)],
          [parseFloat(destLat),   parseFloat(destLng)],
        ], { color: '#d1d5db', weight: 2, dashArray: '6 5', opacity: 0.7 }).addTo(map);
      } else {
        map.setView([pos.lat, pos.lng], 13);
      }

      // Red dot for current position
      markerRef.current = L.marker([pos.lat, pos.lng], { icon: redDotIcon(L) })
        .addTo(map)
        .bindPopup(`<strong>${label || 'Current Location'}</strong>`);

      instanceRef.current = map;
      setMapLoading(false);

      // If moving, update position every 30 seconds
      if (isMoving) {
        timerRef.current = setInterval(() => {
          if (cancelledRef.current || !markerRef.current) return;
          const newPos = getCurrentPos();
          if (newPos) markerRef.current.setLatLng([newPos.lat, newPos.lng]);
        }, 30000);
      }
    }).catch(() => {});

    return () => {
      cancelledRef.current = true;
      if (timerRef.current)  { clearInterval(timerRef.current); timerRef.current = null; }
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [lat, lng, originLat, originLng, destLat, destLng, pickupTime, deliveryTime, status]);

  const pos = getCurrentPos();
  if (!pos) return null;

  const isLive      = status === 'in-transit' || status === 'out-delivery';
  const isDelivered = status === 'delivered';

  return (
    <div className="tracking-map-section">
      <div className="tm-header">
        <div className="tm-title">
          <i className="fa-solid fa-location-dot" style={{ color: '#ff6200' }}></i>
          Live Tracking
        </div>
        <div className="tm-status-chip">
          {isDelivered
            ? <><span className="tm-chip-dot tm-chip-green"></span> Delivered</>
            : isMoving
              ? <><span className="tm-chip-dot tm-chip-orange tm-chip-pulse"></span> Moving</>
              : isLive
                ? <><span className="tm-chip-dot tm-chip-orange tm-chip-pulse"></span> Live</>
                : <><span className="tm-chip-dot tm-chip-gray"></span> Awaiting GPS</>
          }
        </div>
      </div>

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

      <div className="tm-legend">
        {hasRoute && (
          <>
            <span className="tm-legend-item">
              <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:'#9ca3af', marginRight:5, verticalAlign:'middle' }}></span>
              Origin
            </span>
            <span className="tm-legend-item">
              <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', border:'2px solid #ff6200', background:'#fff', marginRight:5, verticalAlign:'middle' }}></span>
              Destination
            </span>
          </>
        )}
        <span className="tm-legend-item">
          <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#ef4444', marginRight:5, verticalAlign:'middle' }}></span>
          {isMoving ? 'Moving' : 'Current Location'}
        </span>
        {label && <span className="tm-legend-label">{label}</span>}
      </div>
    </div>
  );
}
