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

export default function TrackingMap({ lat, lng, label }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;

    let cancelled = false;

    loadLeaflet().then(() => {
      if (cancelled || !mapRef.current) return;

      // Destroy previous instance if coords changed
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }

      const L   = window.L;
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView([lat, lng], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div class="map-marker"><i class="fa-solid fa-location-dot"></i></div>`,
        iconSize:   [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${label || 'Package Location'}</strong>`)
        .openPopup();

      instanceRef.current = map;
    });

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, [lat, lng, label]);

  if (!lat || !lng) return null;

  return (
    <div className="tracking-map-section">
      <h4><i className="fa-solid fa-location-dot"></i> Live Package Location</h4>
      <div ref={mapRef} className="tracking-map"></div>
      <p className="tracking-map-label">
        <i className="fa-solid fa-circle-dot" style={{ color: 'var(--orange)' }}></i> {label}
      </p>
    </div>
  );
}
