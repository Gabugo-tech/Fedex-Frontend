import React, { useEffect, useRef, useState } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Fix #4: loadLeaflet returns a promise that can be cancelled externally
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
      // Fix #4: clear this interval when cancelled
      const wait = setInterval(() => {
        if (cancelRef.current) { clearInterval(wait); return reject(new Error('cancelled')); }
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

/**
 * Fix #6: Build a curved arc using a control point that curves
 * perpendicular to the route midpoint, so east-west routes still arc.
 */
function buildArc(lat1, lng1, lat2, lng2, steps = 120) {
  const points = [];
  const midLat  = (lat1 + lat2) / 2;
  const midLng  = (lng1 + lng2) / 2;
  // Curve height = 15% of the straight-line distance, perpendicular to route
  const dist    = Math.hypot(lat2 - lat1, lng2 - lng1);
  const curveH  = dist * 0.18;
  // Rotate 90° from route direction for the control point
  const dx = lat2 - lat1, dy = lng2 - lng1;
  const len = Math.hypot(dx, dy) || 1;
  const ctrlLat = midLat + (dy / len) * curveH;
  const ctrlLng = midLng - (dx / len) * curveH;

  for (let i = 0; i <= steps; i++) {
    const t   = i / steps;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * ctrlLat + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * ctrlLng + t * t * lng2;
    points.push({ lat, lng });
  }
  return points;
}

/**
 * Correct geographic bearing from A to B (0 = North, 90 = East).
 */
function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const x  = Math.sin(Δλ) * Math.cos(φ2);
  const y  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

// Fix #1 & #2: hardcoded hex colours — no CSS variables inside Leaflet
const PURPLE_HEX = '#4d148c';
const ORANGE_HEX = '#ff6200';
const GREEN_HEX  = '#00843d';
const RED_HEX    = '#d0021b';

export default function TrackingMap({
  lat, lng, label,
  originLat, originLng,
  destLat, destLng,
  status,
  liveLabel,
}) {
  const mapRef       = useRef(null);
  const instanceRef  = useRef(null);
  const animRef      = useRef(null);
  const cancelledRef = useRef(false); // Fix #3 & #4
  const [mapLoading, setMapLoading] = useState(true); // Fix #10

  // Fix #8: memoize label so it doesn't re-trigger the effect on every render
  const labelRef = useRef(label);
  useEffect(() => { labelRef.current = label; }, [label]);

  useEffect(() => {
    const hasRoute = originLat && originLng && destLat && destLng;
    const hasPos   = lat && lng;
    if (!hasRoute && !hasPos) return;

    cancelledRef.current = false;

    loadLeaflet(cancelledRef).then(() => {
      if (cancelledRef.current || !mapRef.current) return;

      // Tear down previous instance
      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }

      const L = window.L;

      // Fix #5: fit bounds to the route instead of fixed zoom
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      instanceRef.current = map;
      setMapLoading(false); // Fix #10

      if (hasRoute) {
        const arc     = buildArc(originLat, originLng, destLat, destLng, 120);
        const latlngs = arc.map(p => [p.lat, p.lng]);

        // Fix #5: fit map to route bounds with padding
        const bounds = L.latLngBounds([
          [originLat, originLng],
          [destLat,   destLng],
        ]);
        map.fitBounds(bounds, { padding: [40, 40] });

        // Dashed route line
        L.polyline(latlngs, {
          color:     '#c0b0e0',
          weight:    2.5,
          dashArray: '7 5',
          opacity:   0.7,
        }).addTo(map);

        // Fix #9: consistent — use icons everywhere, no emoji in popups
        // Origin dot
        L.marker([originLat, originLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${GREEN_HEX};border:3px solid #fff;box-shadow:0 0 0 2px ${GREEN_HEX}"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>Origin</strong>');

        // Destination dot
        L.marker([destLat, destLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${RED_HEX};border:3px solid #fff;box-shadow:0 0 0 2px ${RED_HEX}"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>Destination</strong>');

        // Plane marker
        const pkgIcon = L.divIcon({
          className: 'plane-marker-wrap',
          html: `<div class="plane-marker-inner">✈</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18],
        });

        const marker = L.marker([arc[0].lat, arc[0].lng], { icon: pkgIcon })
          .addTo(map)
          .bindPopup(`<strong>${labelRef.current || 'Package Location'}</strong>`);

        // Fix #1: use hardcoded hex for trail colour
        const trailLayer = L.polyline([], {
          color:   PURPLE_HEX,
          weight:  3,
          opacity: 0.65,
        }).addTo(map);

        const isDelivered = status === 'delivered';
        let idx = 0;

        // Fix #7: use opacity fade instead of instant clear on loop reset
        let fadeSteps = 0;
        const FADE_STEPS = 15;

        animRef.current = setInterval(() => {
          // Fix #3: properly guard against cancelled state
          if (cancelledRef.current) {
            clearInterval(animRef.current);
            animRef.current = null;
            return;
          }

          idx += 1;

          if (idx > arc.length - 1) {
            if (isDelivered) {
              idx = arc.length - 1;
              clearInterval(animRef.current);
              animRef.current = null;
              return;
            } else {
              // Fix #7: graceful fade-out before reset
              fadeSteps++;
              trailLayer.setStyle({ opacity: Math.max(0, 0.65 - (fadeSteps / FADE_STEPS) * 0.65) });
              if (fadeSteps >= FADE_STEPS) {
                idx = 0;
                fadeSteps = 0;
                trailLayer.setLatLngs([]);
                trailLayer.setStyle({ opacity: 0.65 });
              }
              return;
            }
          }

          const pos = arc[idx];
          marker.setLatLng([pos.lat, pos.lng]);
          trailLayer.setLatLngs(arc.slice(0, idx + 1).map(p => [p.lat, p.lng]));

          // Rotate plane to face direction of travel
          if (idx > 0) {
            const prev      = arc[idx - 1];
            const bearing   = getBearing(prev.lat, prev.lng, pos.lat, pos.lng);
            const rotateDeg = bearing - 90; // ✈ points East by default
            const el        = marker.getElement();
            if (el) {
              const inner  = el.querySelector('.plane-marker-inner');
              const target = inner || el;
              target.style.transformOrigin = 'center center';
              target.style.transform       = `rotate(${rotateDeg}deg)`;
            }
          }
        }, isDelivered ? 40 : 80);

      } else if (hasPos) {
        map.setView([lat, lng], 7);
        // Fix #2: hardcoded hex colour, no CSS variable
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="font-size:28px;color:${PURPLE_HEX};filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));line-height:1">📍</div>`,
            iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
          }),
        }).addTo(map)
          .bindPopup(`<strong>${labelRef.current || 'Package Location'}</strong>`)
          .openPopup();
      }
    }).catch(() => {
      // Silently ignore cancellation errors
    });

    return () => {
      cancelledRef.current = true;
      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }
    };
    // Fix #8: label intentionally omitted from deps — accessed via ref
  }, [lat, lng, originLat, originLng, destLat, destLng, status]);

  const canShow = (originLat && originLng && destLat && destLng) || (lat && lng);
  if (!canShow) return null;

  const isLive = status === 'in-transit' || status === 'out-delivery';

  // Fix #11: liveLabel fallback comes from parent (already translated)
  const mapTitle = liveLabel || 'Live Package Location';

  return (
    <div className="tracking-map-section">
      <h4>
        <i className="fa-solid fa-location-dot"></i> {mapTitle}
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

      {/* Fix #10: loading placeholder while Leaflet loads */}
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
          style={{ visibility: mapLoading ? 'hidden' : 'visible' }}
        ></div>
      </div>

      <div className="tracking-map-legend">
        {originLat && (
          <>
            <span><span className="legend-dot origin"></span> Origin</span>
            <span><span className="legend-dot dest"></span> Destination</span>
            <span><span className="legend-dot pkg"></span> Package</span>
          </>
        )}
        <span className="tracking-map-label-text">
          <i className="fa-solid fa-circle-dot" style={{ color: ORANGE_HEX }}></i> {label}
        </span>
      </div>
    </div>
  );
}
