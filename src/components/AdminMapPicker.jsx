import React, { useEffect, useRef, useState } from 'react';

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

export default function AdminMapPicker({ initialLat, initialLng, onConfirm, onClose }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const markerRef  = useRef(null);
  // Fix #6: track mount state to prevent crash on fast close
  const mountedRef = useRef(true);
  const [coords, setCoords] = useState({
    lat: parseFloat(initialLat) || 39.8283,
    lng: parseFloat(initialLng) || -98.5795,
  });

  useEffect(() => {
    mountedRef.current = true;

    loadLeaflet().then(() => {
      // Fix #6: bail out if component was unmounted before Leaflet loaded
      if (!mountedRef.current || !mapRef.current) return;
      initMap();
    });

    return () => {
      mountedRef.current = false;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  function initMap() {
    const L   = window.L;
    const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
    marker.bindPopup('Drag me or click the map to set location').openPopup();

    marker.on('dragend', e => {
      if (!mountedRef.current) return;
      const { lat, lng } = e.target.getLatLng();
      setCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
    });

    map.on('click', e => {
      if (!mountedRef.current) return;
      const { lat, lng } = e.latlng;
      const c = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
      marker.setLatLng([c.lat, c.lng]);
      setCoords(c);
    });

    leafletRef.current = map;
    markerRef.current  = marker;
  }

  return (
    <div className="map-picker-overlay">
      <div className="map-picker-modal">
        <div className="map-picker-header">
          <h3><i className="fa-solid fa-map-location-dot"></i> Pick Package Location</h3>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close map picker">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <p className="map-picker-hint">Click anywhere on the map or drag the marker to set the location.</p>
        <div ref={mapRef} className="map-picker-map"></div>
        <div className="map-picker-coords">
          <span><i className="fa-solid fa-location-crosshairs"></i> Lat: <strong>{coords.lat}</strong></span>
          <span>Lng: <strong>{coords.lng}</strong></span>
        </div>
        <div className="map-picker-actions">
          <button className="btn-admin-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-admin-primary" onClick={() => onConfirm(coords.lat, coords.lng)}>
            <i className="fa-solid fa-check"></i> Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
