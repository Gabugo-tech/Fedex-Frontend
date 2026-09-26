import React, { useEffect, useRef, useState } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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

export default function TrackingMap({ lat, lng, label, status }) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const cancelledRef = useRef(false);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lng) return;
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.setView([lat, lng], 13);

      // Single red dot marker
      L.marker([lat, lng], {
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

      instanceRef.current = map;
      setMapLoading(false);
    }).catch(() => {});

    return () => {
      cancelledRef.current = true;
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, [lat, lng]);

  if (!lat || !lng) return null;

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
        <span className="tm-legend-item">
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: '#ef4444', marginRight: 5, verticalAlign: 'middle',
          }}></span>
          Current Location
        </span>
        {label && <span className="tm-legend-label">{label}</span>}
      </div>
    </div>
  );
}
