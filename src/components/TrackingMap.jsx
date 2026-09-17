import React, { useEffect, useRef } from 'react';

export default function TrackingMap({ lat, lng, label }) {
  const mapRef     = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!lat || !lng) return;

    // Load Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    function initMap() {
      const L = window.L;
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([lat, lng], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Custom FedEx-purple marker
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-marker"><i class="fa-solid fa-location-dot"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${label || 'Package Location'}</strong>`)
        .openPopup();

      instanceRef.current = map;
    }

    if (window.L) {
      initMap();
    } else {
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id  = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        // Script tag exists but may not be loaded yet
        const wait = setInterval(() => {
          if (window.L) { clearInterval(wait); initMap(); }
        }, 100);
      }
    }

    return () => {
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
