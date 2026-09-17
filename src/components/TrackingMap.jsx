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

// Interpolate between two lat/lng points by fraction t (0..1)
function interpolate(lat1, lng1, lat2, lng2, t) {
  return {
    lat: lat1 + (lat2 - lat1) * t,
    lng: lng1 + (lng2 - lng1) * t,
  };
}

// Build a great-circle arc of N points between two coords
function buildArc(lat1, lng1, lat2, lng2, steps = 80) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    points.push(interpolate(lat1, lng1, lat2, lng2, i / steps));
  }
  return points;
}

export default function TrackingMap({
  lat, lng, label,
  originLat, originLng,
  destLat, destLng,
  status,
}) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const animRef     = useRef(null);

  useEffect(() => {
    // Need at minimum a current position
    if (!lat || !lng) return;

    let cancelled = false;

    loadLeaflet().then(() => {
      if (cancelled || !mapRef.current) return;

      // Destroy previous instance
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }

      const L = window.L;
      const hasRoute = originLat && originLng && destLat && destLng;

      // Decide initial view
      let centerLat = lat, centerLng = lng, zoom = 5;
      if (hasRoute) {
        centerLat = (originLat + destLat) / 2;
        centerLng = (originLng + destLng) / 2;
        zoom = 3;
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([centerLat, centerLng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // ── ROUTE LINE ──
      if (hasRoute) {
        const arc = buildArc(originLat, originLng, destLat, destLng, 80);
        const latlngs = arc.map(p => [p.lat, p.lng]);

        // Dashed grey route line (full path)
        L.polyline(latlngs, {
          color: '#cccccc',
          weight: 2,
          dashArray: '6 6',
          opacity: 0.8,
        }).addTo(map);

        // Origin marker
        const originIcon = L.divIcon({
          className: '',
          html: `<div class="map-origin-dot" title="Origin"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([originLat, originLng], { icon: originIcon })
          .addTo(map)
          .bindPopup(`<strong>📦 Origin</strong><br/>${label?.split('—')[0] || 'Pickup location'}`);

        // Destination marker
        const destIcon = L.divIcon({
          className: '',
          html: `<div class="map-dest-dot" title="Destination"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([destLat, destLng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<strong>🏠 Destination</strong><br/>Delivery address`);
      }

      // ── PACKAGE MARKER (current position) ──
      const pkgIcon = L.divIcon({
        className: '',
        html: `<div class="map-pkg-marker"><i class="fa-solid fa-location-dot"></i></div>`,
        iconSize:    [36, 36],
        iconAnchor:  [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([lat, lng], { icon: pkgIcon })
        .addTo(map)
        .bindPopup(`<strong>${label || 'Package Location'}</strong>`)
        .openPopup();

      instanceRef.current = map;

      // ── ANIMATION: only if package is in transit and we have a full route ──
      const isMoving = hasRoute &&
        status !== 'delivered' &&
        status !== 'pending';

      if (isMoving) {
        // Determine progress fraction from current lat/lng relative to route
        // Find closest arc point as starting index
        const arc = buildArc(originLat, originLng, destLat, destLng, 200);
        let startIdx = 0;
        let minDist = Infinity;
        arc.forEach((p, i) => {
          const d = Math.hypot(p.lat - lat, p.lng - lng);
          if (d < minDist) { minDist = d; startIdx = i; }
        });

        let idx = startIdx;
        const STEP_INTERVAL = 120; // ms between animation steps
        const STEP_SIZE     = 1;   // arc points per step

        animRef.current = setInterval(() => {
          if (cancelled) { clearInterval(animRef.current); return; }
          idx = (idx + STEP_SIZE);
          if (idx >= arc.length) idx = arc.length - 1;

          const pos = arc[idx];
          marker.setLatLng([pos.lat, pos.lng]);

          // Gently pan the map to follow the marker
          if (idx % 20 === 0) {
            map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 });
          }

          // Stop at destination
          if (idx >= arc.length - 1) {
            clearInterval(animRef.current);
            animRef.current = null;
          }
        }, STEP_INTERVAL);
      }
    });

    return () => {
      cancelled = true;
      if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [lat, lng, label, originLat, originLng, destLat, destLng, status]);

  if (!lat || !lng) return null;

  return (
    <div className="tracking-map-section">
      <h4>
        <i className="fa-solid fa-location-dot"></i> Live Package Location
        {status === 'in-transit' || status === 'out-delivery'
          ? <span className="live-badge"><i className="fa-solid fa-circle"></i> LIVE</span>
          : null
        }
      </h4>
      <div ref={mapRef} className="tracking-map"></div>
      <p className="tracking-map-label">
        <i className="fa-solid fa-circle-dot" style={{ color: 'var(--orange)' }}></i>
        {label}
      </p>
    </div>
  );
}
