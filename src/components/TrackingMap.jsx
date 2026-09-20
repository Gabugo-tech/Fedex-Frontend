import React, { useEffect, useRef, useState } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const PURPLE_HEX = '#4d148c';
const ORANGE_HEX = '#ff6200';
const GREEN_HEX  = '#00843d';
const RED_HEX    = '#d0021b';

// ── Leaflet loader ───────────────────────────────────────
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

// ── Curved arc ───────────────────────────────────────────
function buildArc(lat1, lng1, lat2, lng2, steps = 200) {
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dist   = Math.hypot(lat2 - lat1, lng2 - lng1);
  const curveH = dist * 0.18;
  const dx = lat2 - lat1, dy = lng2 - lng1;
  const len = Math.hypot(dx, dy) || 1;
  const ctrlLat = midLat + (dy / len) * curveH;
  const ctrlLng = midLng - (dx / len) * curveH;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t   = i / steps;
    const lat = (1-t)*(1-t)*lat1 + 2*(1-t)*t*ctrlLat + t*t*lat2;
    const lng = (1-t)*(1-t)*lng1 + 2*(1-t)*t*ctrlLng + t*t*lng2;
    points.push({ lat, lng });
  }
  return points;
}

// ── Bearing ──────────────────────────────────────────────
function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const x  = Math.sin(Δλ) * Math.cos(φ2);
  const y  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

/**
 * Calculate fraction (0..1) of journey completed based on real time.
 * Returns null if no valid time window.
 */
function getJourneyFraction(pickupTime, deliveryTime) {
  if (!pickupTime || !deliveryTime) return null;
  const now      = Date.now();
  const start    = new Date(pickupTime).getTime();
  const end      = new Date(deliveryTime).getTime();
  const duration = end - start;
  if (duration <= 0) return null;
  const elapsed  = now - start;
  return Math.min(1, Math.max(0, elapsed / duration));
}

/** Format remaining time as "2h 34m" or "45m" */
function formatRemaining(deliveryTime) {
  const ms = new Date(deliveryTime).getTime() - Date.now();
  if (ms <= 0) return 'Arrived';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

// ── Component ─────────────────────────────────────────────
export default function TrackingMap({
  lat, lng, label,
  originLat, originLng,
  destLat, destLng,
  status,
  liveLabel,
  pickupTime,    // ISO string — when package was picked up
  deliveryTime,  // ISO string — estimated delivery time
}) {
  const mapRef       = useRef(null);
  const instanceRef  = useRef(null);
  const animRef      = useRef(null);
  const cancelledRef = useRef(false);
  const labelRef     = useRef(label);
  const [mapLoading, setMapLoading]       = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => { labelRef.current = label; }, [label]);

  // Update remaining time display every minute
  useEffect(() => {
    if (!deliveryTime) return;
    const update = () => setTimeRemaining(formatRemaining(deliveryTime));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deliveryTime]);

  useEffect(() => {
    const hasRoute = originLat && originLng && destLat && destLng;
    const hasPos   = lat && lng;
    if (!hasRoute && !hasPos) return;

    cancelledRef.current = false;

    // Decide animation mode:
    // REAL-TIME: if pickupTime + deliveryTime are set and status is active
    const hasTimeWindow = pickupTime && deliveryTime && status !== 'delivered' && status !== 'pending';

    loadLeaflet(cancelledRef).then(() => {
      if (cancelledRef.current || !mapRef.current) return;

      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }

      const L   = window.L;
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      instanceRef.current = map;
      setMapLoading(false);

      if (hasRoute) {
        const arc     = buildArc(originLat, originLng, destLat, destLng, 200);
        const latlngs = arc.map(p => [p.lat, p.lng]);

        // Fit bounds to route
        map.fitBounds(
          L.latLngBounds([[originLat, originLng], [destLat, destLng]]),
          { padding: [40, 40] }
        );

        // Dashed full-route line
        L.polyline(latlngs, {
          color: '#c0b0e0', weight: 2.5, dashArray: '7 5', opacity: 0.7,
        }).addTo(map);

        // Origin marker
        L.marker([originLat, originLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${GREEN_HEX};border:3px solid #fff;box-shadow:0 0 0 2px ${GREEN_HEX}"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>Origin</strong>');

        // Destination marker
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

        // Determine starting position
        let startIdx = 0;
        if (hasTimeWindow) {
          const frac = getJourneyFraction(pickupTime, deliveryTime);
          if (frac !== null) startIdx = Math.floor(frac * (arc.length - 1));
        }

        const marker = L.marker([arc[startIdx].lat, arc[startIdx].lng], { icon: pkgIcon })
          .addTo(map)
          .bindPopup(`<strong>${labelRef.current || 'Package'}</strong>`);

        // Travelled trail
        const trailLayer = L.polyline(
          arc.slice(0, startIdx + 1).map(p => [p.lat, p.lng]),
          { color: PURPLE_HEX, weight: 3, opacity: 0.7 }
        ).addTo(map);

        // Helper: apply rotation to plane element
        function rotatePlane(fromIdx, toIdx) {
          if (fromIdx < 0 || toIdx >= arc.length) return;
          const prev    = arc[fromIdx];
          const curr    = arc[toIdx];
          const bearing = getBearing(prev.lat, prev.lng, curr.lat, curr.lng);
          const el      = marker.getElement();
          if (el) {
            const inner  = el.querySelector('.plane-marker-inner');
            const target = inner || el;
            target.style.transformOrigin = 'center center';
            target.style.transform       = `rotate(${bearing - 90}deg)`;
          }
        }

        // Set initial rotation
        if (startIdx > 0) rotatePlane(startIdx - 1, startIdx);

        // ── REAL-TIME MODE ─────────────────────────────────────
        if (hasTimeWindow) {
          // Update every second — position based on actual clock
          animRef.current = setInterval(() => {
            if (cancelledRef.current) {
              clearInterval(animRef.current);
              animRef.current = null;
              return;
            }

            const frac = getJourneyFraction(pickupTime, deliveryTime);
            if (frac === null) return;

            const idx = Math.min(
              arc.length - 1,
              Math.floor(frac * (arc.length - 1))
            );

            const pos = arc[idx];
            marker.setLatLng([pos.lat, pos.lng]);
            trailLayer.setLatLngs(arc.slice(0, idx + 1).map(p => [p.lat, p.lng]));
            if (idx > 0) rotatePlane(idx - 1, idx);

            // Stop when journey is complete
            if (frac >= 1) {
              clearInterval(animRef.current);
              animRef.current = null;
            }
          }, 1000);

        // ── LOOP ANIMATION MODE (no time window set) ────────────
        } else {
          const isDelivered = status === 'delivered';
          let idx = startIdx;
          let fadeSteps = 0;
          const FADE_STEPS = 15;

          animRef.current = setInterval(() => {
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
                // Fade trail then reset
                fadeSteps++;
                trailLayer.setStyle({
                  opacity: Math.max(0, 0.7 - (fadeSteps / FADE_STEPS) * 0.7),
                });
                if (fadeSteps >= FADE_STEPS) {
                  idx = 0;
                  fadeSteps = 0;
                  trailLayer.setLatLngs([]);
                  trailLayer.setStyle({ opacity: 0.7 });
                }
                return;
              }
            }

            const pos = arc[idx];
            marker.setLatLng([pos.lat, pos.lng]);
            trailLayer.setLatLngs(arc.slice(0, idx + 1).map(p => [p.lat, p.lng]));
            if (idx > 0) rotatePlane(idx - 1, idx);
          }, isDelivered ? 40 : 80);
        }

      } else if (hasPos) {
        map.setView([lat, lng], 7);
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
    }).catch(() => {});

    return () => {
      cancelledRef.current = true;
      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }
    };
  }, [lat, lng, originLat, originLng, destLat, destLng, status, pickupTime, deliveryTime]);

  const canShow = (originLat && originLng && destLat && destLng) || (lat && lng);
  if (!canShow) return null;

  const isLive      = status === 'in-transit' || status === 'out-delivery';
  const isRealTime  = pickupTime && deliveryTime && isLive;
  const mapTitle    = liveLabel || 'Live Package Location';

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
        {isRealTime && timeRemaining && (
          <span className="time-remaining-badge">
            <i className="fa-solid fa-clock"></i> {timeRemaining}
          </span>
        )}
      </h4>

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
        {isRealTime && (
          <span className="legend-realtime">
            <i className="fa-solid fa-satellite-dish" style={{ color: ORANGE_HEX }}></i>
            Real-time position
          </span>
        )}
        <span className="tracking-map-label-text">
          <i className="fa-solid fa-circle-dot" style={{ color: ORANGE_HEX }}></i> {label}
        </span>
      </div>
    </div>
  );
}
