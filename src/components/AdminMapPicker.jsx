import React, { useEffect, useRef, useState } from 'react';

export default function AdminMapPicker({ initialLat, initialLng, onConfirm, onClose }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const markerRef  = useRef(null);
  const [coords, setCoords] = useState({
    lat: parseFloat(initialLat) || 39.8283,
    lng: parseFloat(initialLng) || -98.5795,
  });

  useEffect(() => {
    // Dynamically load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dynamically load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);

    return () => {
      if (leafletRef.current) leafletRef.current.remove();
    };
  }, []);

  function initMap() {
    const L = window.L;
    const map = L.map(mapRef.current).setView([coords.lat, coords.lng], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
    marker.bindPopup('Drag me to set location').openPopup();

    marker.on('dragend', e => {
      const { lat, lng } = e.target.getLatLng();
      setCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
    });

    map.on('click', e => {
      const { lat, lng } = e.latlng;
      const newCoords = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
      marker.setLatLng([newCoords.lat, newCoords.lng]);
      setCoords(newCoords);
    });

    leafletRef.current = map;
    markerRef.current  = marker;
  }

  function handleConfirm() {
    onConfirm(coords.lat, coords.lng);
  }

  return (
    <div className="map-picker-overlay">
      <div className="map-picker-modal">
        <div className="map-picker-header">
          <h3><i className="fa-solid fa-map-location-dot"></i> Pick Package Location</h3>
          <button className="btn-icon btn-close" onClick={onClose}>
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
          <button className="btn-admin-primary" onClick={handleConfirm}>
            <i className="fa-solid fa-check"></i> Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
