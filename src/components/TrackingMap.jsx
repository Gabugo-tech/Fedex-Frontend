import React, { useEffect, useRef } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeaflet() {
  return new Promise((resolve) => {
    if (!document.getElementById('leaflet-css')) {
      const link = Object.assign(document.createElement('link'), {
        id: 'leaflet-css', rel: 'stylesheet', href: LEAFLET_CSS,
      });
      document.head.appendChild(link);
    }
    if (window.L) return resolve();
    if (document.getElementById('leaflet-js')) {
      const wait = setInterval(() => {
        if (window.L) { clearInterval(wait); resolve(); }
      }, 50);
      return;
    }
    const script = Object.assign(document.createElement('script'), {
      id: 'leaflet-js', src: LEAFLET_JS,
    });
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

/**
 * Build a smooth arc of `steps` points between two lat/lng coords.
 * Uses a quadratic bezier curve to simulate a flight path.
 */
function buildArc(lat1, lng1, lat2, lng2, steps = 120) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const midLat = (lat1 + lat2) / 2 + Math.abs(lat2 - lat1) * 0.25;
    const midLng = (lng1 + lng2) / 2;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * midLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * midLng + t * t * lng2;
    points.push({ lat, lng });
  }
  return points;
}

/**
 * Calculate the geographic bearing (in degrees) from point A to point B.
 * Returns 0–360 where 0 = North, 90 = East, 180 = South, 270 = West.
 */
function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = Math.atan2(x, y) * 180 / Math.PI;
  return (bearing + 360) % 360; // normalise to 0–360
}

export default function TrackingMap({
  lat, lng, label,
  originLat, originLng,
  destLat, destLng,
  status,
  liveLabel,
}) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const animRef     = useRef(null);

  useEffect(() => {
    const hasRoute  = originLat && originLng && destLat && destLng;
    const hasPos    = lat && lng;

    // Need at least a route or a position
    if (!hasRoute && !hasPos) return;

    let cancelled = false;

    loadLeaflet().then(() => {
      if (cancelled || !mapRef.current) return;

      // Clean up previous instance
      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }

      const L = window.L;

      // ── MAP VIEW ──
      // Center between origin and destination if we have a route
      const centerLat = hasRoute ? (originLat + destLat) / 2 : lat;
      const centerLng = hasRoute ? (originLng + destLng) / 2 : lng;
      const zoom      = hasRoute ? 4 : 6;

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([centerLat, centerLng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      instanceRef.current = map;

      if (hasRoute) {
        const arc = buildArc(originLat, originLng, destLat, destLng, 120);
        const latlngs = arc.map(p => [p.lat, p.lng]);

        // Full route line (dashed grey)
        L.polyline(latlngs, {
          color: '#c0b0e0',
          weight: 2.5,
          dashArray: '7 5',
          opacity: 0.7,
        }).addTo(map);

        // ── ORIGIN DOT ──
        L.marker([originLat, originLng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="map-origin-dot"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>📦 Origin</strong>');

        // ── DESTINATION DOT ──
        L.marker([destLat, destLng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="map-dest-dot"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>🏠 Destination</strong>');

        // ── PACKAGE MARKER — starts at origin ──
        const pkgIcon = L.divIcon({
          className: 'plane-marker-wrap',
          html: `<div class="plane-marker-inner">✈</div>`,
          iconSize:    [36, 36],
          iconAnchor:  [18, 18],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([arc[0].lat, arc[0].lng], { icon: pkgIcon })
          .addTo(map)
          .bindPopup(`<strong>${label || 'Package Location'}</strong>`);

        // Trailing "travelled" polyline (purple)
        const trailLayer = L.polyline([], {
          color: 'var(--purple)',
          weight: 3,
          opacity: 0.6,
        }).addTo(map);

        // ── ANIMATION ──
        // For delivered packages: do a single pass showing the completed journey
        // For all others: loop continuously so customers always see movement
        const isDelivered = status === 'delivered';
        let idx = 0;

        // How fast the marker moves — slower = more realistic feeling
        const STEP_MS   = isDelivered ? 40 : 80;  // ms per tick
        const STEP_SIZE = 1;                        // arc points per tick

        animRef.current = setInterval(() => {
          if (cancelled) { clearInterval(animRef.current); return; }

          idx += STEP_SIZE;

          // Loop back to start for active shipments; stop at end for delivered
          if (idx > arc.length - 1) {
            if (isDelivered) {
              idx = arc.length - 1;
              clearInterval(animRef.current);
              animRef.current = null;
            } else {
              // Reset: restart from origin for continuous loop
              idx = 0;
              trailLayer.setLatLngs([]);
            }
          }

          const pos = arc[idx];
          marker.setLatLng([pos.lat, pos.lng]);

          // Grow the trail behind the marker
          trailLayer.setLatLngs(arc.slice(0, idx + 1).map(p => [p.lat, p.lng]));

          // Rotate plane to face direction of travel
          // ✈ emoji points East by default, bearing 0 = North, so subtract 90°
          if (idx > 0) {
            const prev = arc[idx - 1];
            const bearing   = getBearing(prev.lat, prev.lng, pos.lat, pos.lng);
            const rotateDeg = bearing - 90;
            const el = marker.getElement();
            if (el) {
              const inner = el.querySelector('.plane-marker-inner');
              const target = inner || el;
              target.style.transformOrigin = 'center center';
              target.style.transform = `rotate(${rotateDeg}deg)`;
            }
          }
        }, STEP_MS);

      } else if (hasPos) {
        // No route data — just show a static pin at current position
        const pkgIcon = L.divIcon({
          className: '',
          html: `<div class="map-pkg-marker"><i class="fa-solid fa-location-dot" style="color:var(--purple);font-size:28px;"></i></div>`,
          iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
        });
        L.marker([lat, lng], { icon: pkgIcon })
          .addTo(map)
          .bindPopup(`<strong>${label || 'Package Location'}</strong>`)
          .openPopup();
      }
    });

    return () => {
      cancelled = true;
      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }
    };
  }, [lat, lng, label, originLat, originLng, destLat, destLng, status]);

  // Show map if we have either a route or a position
  const canShow = (originLat && originLng && destLat && destLng) || (lat && lng);
  if (!canShow) return null;

  const isLive = status === 'in-transit' || status === 'out-delivery';

  return (
    <div className="tracking-map-section">
      <h4>
        <i className="fa-solid fa-location-dot"></i> {liveLabel || 'Live Package Location'}
        {isLive && (
          <span className="live-badge">
            <i className="fa-solid fa-circle"></i> LIVE
          </span>
        )}
        {status === 'delivered' && (
          <span className="delivered-badge">
            <i className="fa-solid fa-circle-check"></i> Delivered
          </span>
        )}
      </h4>
      <div ref={mapRef} className="tracking-map"></div>
      <div className="tracking-map-legend">
        {originLat && (
          <>
            <span><span className="legend-dot origin"></span> Origin</span>
            <span><span className="legend-dot dest"></span> Destination</span>
            <span><span className="legend-dot pkg"></span> Package</span>
          </>
        )}
        <span className="tracking-map-label-text">
          <i className="fa-solid fa-circle-dot" style={{ color: 'var(--orange)' }}></i> {label}
        </span>
      </div>
    </div>
  );
}
