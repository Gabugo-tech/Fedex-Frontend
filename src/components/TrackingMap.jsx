import React, { useEffect, useRef, useState } from 'react';
import { getJourneyFraction, interpolatePosition } from '../utils/mapMath';

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

// ── Curved arc (quadratic bezier) ───────────────────────
// Bug fix #6: returns the control point too so we can fitBounds on the full arc
function buildArc(lat1, lng1, lat2, lng2, steps = 200) {
  const midLat  = (lat1 + lat2) / 2;
  const midLng  = (lng1 + lng2) / 2;
  const dist    = Math.hypot(lat2 - lat1, lng2 - lng1);
  const curveH  = dist * 0.18;
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
  // include the control point in returned data for bounds calculation
  points._ctrl = { lat: ctrlLat, lng: ctrlLng };
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

// ── Format remaining time ────────────────────────────────
function formatRemaining(deliveryTime) {
  const ms = new Date(deliveryTime).getTime() - Date.now();
  if (ms <= 0) return 'Arrived';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
}

// ── Smooth interpolation between two arc points ──────────
// Bug fix #2: allows sub-index decimal position for smooth real-time movement
function interpolateArc(arc, t) {
  const maxIdx = arc.length - 1;
  const raw    = t * maxIdx;
  const lo     = Math.floor(raw);
  const hi     = Math.min(lo + 1, maxIdx);
  const frac   = raw - lo;
  return {
    lat: arc[lo].lat + (arc[hi].lat - arc[lo].lat) * frac,
    lng: arc[lo].lng + (arc[hi].lng - arc[lo].lng) * frac,
    idx: lo,
  };
}

// ── Component ────────────────────────────────────────────
export default function TrackingMap({
  lat, lng, label,
  originLat, originLng,
  destLat, destLng,
  status,
  liveLabel,
  pickupTime,
  deliveryTime,
}) {
  const mapRef       = useRef(null);
  const instanceRef  = useRef(null);
  const animRef      = useRef(null);
  const cancelledRef = useRef(false);
  const labelRef     = useRef(label);
  const [mapLoading, setMapLoading]       = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => { labelRef.current = label; }, [label]);

  useEffect(() => {
    if (!deliveryTime) return;
    const update = () => setTimeRemaining(formatRemaining(deliveryTime));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deliveryTime]);

  useEffect(() => {
    const hasRoute      = originLat && originLng && destLat && destLng;
    const hasPos        = lat && lng;
    if (!hasRoute && !hasPos) return;

    cancelledRef.current = false;

    const hasTimeWindow = pickupTime && deliveryTime
      && status !== 'delivered'
      && status !== 'pending';

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

        // Bug fix #6: fit bounds including the arc control point so full curve is visible
        const ctrl = arc._ctrl;
        const bounds = L.latLngBounds([
          [originLat, originLng],
          [destLat,   destLng],
          [ctrl.lat,  ctrl.lng],
        ]);
        map.fitBounds(bounds, { padding: [48, 48] });

        // Dashed full-route line
        L.polyline(latlngs, {
          color: '#c0b0e0', weight: 2.5, dashArray: '7 5', opacity: 0.7,
        }).addTo(map);

        // Origin marker — GREEN
        L.marker([originLat, originLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;border-radius:50%;background:${GREEN_HEX};border:3px solid #fff;box-shadow:0 0 0 2px ${GREEN_HEX}"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup('<strong>Origin</strong>');

        // Destination marker — RED
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

        // Starting position
        let startFrac = 0;
        if (hasTimeWindow) {
          const f = getJourneyFraction(pickupTime, deliveryTime);
          if (f !== null) startFrac = f;
        }
        const startPos = interpolateArc(arc, startFrac);

        const marker = L.marker([startPos.lat, startPos.lng], { icon: pkgIcon })
          .addTo(map)
          .bindPopup(`<strong>${labelRef.current || 'Package'}</strong>`);

        // Travelled trail — Bug fix #4: start with full trail to startFrac
        const trailPoints = arc.slice(0, startPos.idx + 1).map(p => [p.lat, p.lng]);
        const trailLayer  = L.polyline(trailPoints, {
          color: PURPLE_HEX, weight: 3, opacity: 0.7,
        }).addTo(map);

        // Bug fix #1: use bearing-to-north offset
        // ✈ emoji faces UP (north) in most fonts, bearing 0 = North, so offset = 0
        // We use 0 offset and rotate purely by bearing
        function rotatePlane(bearing) {
          const el = marker.getElement();
          if (!el) return;
          const inner  = el.querySelector('.plane-marker-inner');
          const target = inner || el;
          target.style.transformOrigin = '50% 50%';
          // ✈ in most browsers points up-right (~45°), so subtract 45
          target.style.transform = `rotate(${bearing - 45}deg)`;
        }

        // Set initial bearing
        if (startFrac > 0 && startPos.idx > 0) {
          const prev = arc[startPos.idx - 1];
          rotatePlane(getBearing(prev.lat, prev.lng, startPos.lat, startPos.lng));
        } else {
          // Point toward destination from origin
          rotatePlane(getBearing(originLat, originLng, destLat, destLng));
        }

        // Fix #20: pause animation when tab is hidden to save CPU
        const handleVisibility = () => {
          if (document.hidden) {
            if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        // Always animate smoothly (loop). If real-time window is set,
        // snap to the correct real-time position every second as well.
        const isDelivered = status === 'delivered';
        let idx       = startPos.idx;
        let fadeSteps = 0;
        const FADE_STEPS = 20;
        const STEP_MS    = isDelivered ? 50 : 120;

        animRef.current = setInterval(() => {
          if (cancelledRef.current) {
            clearInterval(animRef.current); animRef.current = null; return;
          }

          // If real-time window is valid, override position with clock-based position
          if (hasTimeWindow) {
            const frac = getJourneyFraction(pickupTime, deliveryTime);
            if (frac !== null && frac < 1) {
              const pos = interpolateArc(arc, frac);
              // Only update idx if it differs, to avoid jitter
              if (pos.idx !== idx) {
                idx = pos.idx;
                marker.setLatLng([pos.lat, pos.lng]);
                trailLayer.setLatLngs(arc.slice(0, idx + 1).map(p => [p.lat, p.lng]));
                if (idx > 0) {
                  const prev = arc[idx - 1];
                  rotatePlane(getBearing(prev.lat, prev.lng, pos.lat, pos.lng));
                }
              }
            }
          }

          // Always step forward for visible movement
          idx += 1;

          if (idx > arc.length - 1) {
            if (isDelivered) {
              idx = arc.length - 1;
              clearInterval(animRef.current); animRef.current = null; return;
            } else {
              fadeSteps++;
              trailLayer.setStyle({
                opacity: Math.max(0, 0.7 - (fadeSteps / FADE_STEPS) * 0.7),
              });
              if (fadeSteps >= FADE_STEPS) {
                // If real-time window is set, restart from real position
                if (hasTimeWindow) {
                  const frac = getJourneyFraction(pickupTime, deliveryTime);
                  idx = frac !== null ? Math.floor(frac * (arc.length - 1)) : 0;
                } else {
                  idx = 0;
                }
                fadeSteps = 0;
                trailLayer.setLatLngs(arc.slice(0, idx + 1).map(p => [p.lat, p.lng]));
                trailLayer.setStyle({ opacity: 0.7 });
                rotatePlane(getBearing(originLat, originLng, destLat, destLng));
              }
              return;
            }
          }

          const pos = arc[idx];
          marker.setLatLng([pos.lat, pos.lng]);
          trailLayer.addLatLng([pos.lat, pos.lng]);
          if (idx > 0) {
            const prev = arc[idx - 1];
            rotatePlane(getBearing(prev.lat, prev.lng, pos.lat, pos.lng));
          }
        }, STEP_MS);

      } else if (hasPos) {
        map.setView([lat, lng], 7);
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📍</div>`,
            iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
          }),
        }).addTo(map)
          .bindPopup(`<strong>${labelRef.current || 'Package Location'}</strong>`)
          .openPopup();
      }
    }).catch(() => {});

    return () => {
      cancelledRef.current = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animRef.current)    { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current){ instanceRef.current.remove();   instanceRef.current = null; }
    };
  }, [lat, lng, originLat, originLng, destLat, destLng, status, pickupTime, deliveryTime]);

  const canShow    = (originLat && originLng && destLat && destLng) || (lat && lng);
  if (!canShow) return null;

  const isLive     = status === 'in-transit' || status === 'out-delivery';
  const isRealTime = pickupTime && deliveryTime && isLive;
  const mapTitle   = liveLabel || 'Live Package Location';

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
        {/* Fix #44: add role and aria-label for accessibility */}
        <div
          ref={mapRef}
          className="tracking-map"
          role="img"
          aria-label={`Package route map from ${label || 'origin'} to destination`}
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
