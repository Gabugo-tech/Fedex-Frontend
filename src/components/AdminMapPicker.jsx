import React, { useEffect, useRef, useState } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadLeaflet() {
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
        if (window.L) { clearInterval(wait); resolve(); }
      }, 50);
      return;
    }
    const script = Object.assign(document.createElement('script'), {
      id: 'leaflet-js', src: LEAFLET_JS,
    });
    script.onload  = resolve;
    script.onerror = () => reject(new Error('Failed to load Leaflet. Check your connection.'));
    document.head.appendChild(script);
  });
}

export default function AdminMapPicker({ initialLat, initialLng, onConfirm, onClose }) {
  const mapRef      = useRef(null);
  const leafletRef  = useRef(null);
  const markerRef   = useRef(null);
  const mountedRef  = useRef(true);

  const [coords, setCoords] = useState({
    lat: parseFloat(initialLat) || 39.8283,
    lng: parseFloat(initialLng) || -98.5795,
  });
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [searchError, setSearchError]   = useState(null);
  const [mapError, setMapError]         = useState(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    loadLeaflet().then(() => {
      if (!mountedRef.current || !mapRef.current) return;
      initMap();
    }).catch(err => {
      if (mountedRef.current) setMapError(err.message);
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

  // Search using Nominatim (OpenStreetMap free geocoding API)
  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'PulsTrack/1.0 (support@pulstrack.com)' } }
      );
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.length === 0) {
        setSearchError('No results found. Try a different name.');
      } else {
        setSearchResults(data);
      }
    } catch {
      if (mountedRef.current) setSearchError('Search failed. Check your connection.');
    } finally {
      if (mountedRef.current) setSearching(false);
    }
  }

  function handleSearchKey(e) {
    if (e.key === 'Enter') handleSearch();
  }

  // When user picks a result, fly the map there and move the marker
  function handleSelectResult(result) {
    const lat = parseFloat(parseFloat(result.lat).toFixed(6));
    const lng = parseFloat(parseFloat(result.lon).toFixed(6));
    const c   = { lat, lng };

    setCoords(c);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);

    if (leafletRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletRef.current.flyTo([lat, lng], 8, { duration: 1.2 });
      markerRef.current.bindPopup(result.display_name.split(',').slice(0, 2).join(',')).openPopup();
    }
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

        {/* SEARCH BAR */}
        <div className="map-search-bar">
          <div className="map-search-input-row">
            <input
              type="text"
              className="map-search-input"
              placeholder="Search country, city or address…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              aria-label="Search location"
              autoComplete="off"
            />
            <button
              className="btn-map-search"
              onClick={handleSearch}
              disabled={searching}
              aria-label="Search"
            >
              {searching
                ? <i className="fa-solid fa-spinner fa-spin"></i>
                : <i className="fa-solid fa-magnifying-glass"></i>
              }
              <span>{searching ? 'Searching…' : 'Search'}</span>
            </button>
          </div>

          {/* SEARCH ERROR */}
          {searchError && (
            <p className="map-search-error">
              <i className="fa-solid fa-triangle-exclamation"></i> {searchError}
            </p>
          )}

          {/* SEARCH RESULTS DROPDOWN */}
          {searchResults.length > 0 && (
            <ul className="map-search-results" role="listbox">
              {searchResults.map(r => (
                <li
                  key={r.place_id}
                  role="option"
                  className="map-search-result-item"
                  onClick={() => handleSelectResult(r)}
                >
                  <i className="fa-solid fa-location-dot"></i>
                  <span>{r.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="map-picker-hint">
          Then fine-tune by clicking the map or dragging the marker.
        </p>

        {/* MAP */}
        <div ref={mapRef} className="map-picker-map">
          {mapError && (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '8px', color: '#888', fontSize: '14px',
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: '#e55', fontSize: '24px' }}></i>
              <span>{mapError}</span>
            </div>
          )}
        </div>

        {/* CURRENT COORDS */}
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
