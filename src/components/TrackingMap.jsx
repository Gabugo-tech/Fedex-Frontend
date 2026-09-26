import React, { useEffect, useRef, useState } from 'react';
import { getJourneyFraction } from '../utils/mapMath';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const PURPLE_HEX = '#a78bfa';
const ORANGE_HEX = '#ff6200';
const GREEN_HEX  = '#22c55e';
const RED_HEX    = '#ef4444';

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

// ── Great-circle arc (slerp-style interpolation on a sphere) ────────────────
// Much more realistic than a flat quadratic bezier for long routes
function buildGreatCircleArc(lat1, lng1, lat2, lng2, steps = 300) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);

  // Convert to 3D unit vectors
  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);

  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  // Angle between the two points
  const dot = Math.min(1, Math.max(-1, x1*x2 + y1*y2 + z1*z2));
  const omega = Math.acos(dot);

  const points = [];

  if (omega < 0.001) {
    // Points are basically the same — straight line
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({ lat: lat1 + (lat2 - lat1) * t, lng: lng1 + (lng2 - lng1) * t });
    }
    return points;
  }

  const sinOmega = Math.sin(omega);

  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const a  = Math.sin((1 - t) * omega) / sinOmega;
    const b  = Math.sin(t * omega) / sinOmega;
    const x  = a * x1 + b * x2;
    const y  = a * y1 + b * y2;
    const z  = a * z1 + b * z2;
    const φ  = Math.atan2(z, Math.sqrt(x*x + y*y));
    const λ  = Math.atan2(y, x);
    points.push({ lat: toDeg(φ), lng: toDeg(λ) });
  }
  return points;
}

// ── Bearing between two lat/lng points ───────────────────
function getBearing(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const x  = Math.sin(Δλ) * Math.cos(φ2);
  const y  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

// ── Smooth arc interpolation ─────────────────────────────
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

// ── Format remaining time ────────────────────────────────
function formatRemaining(deliveryTime) {
  const ms = new Date(deliveryTime).getTime() - Date.now();
  if (ms <= 0) return 'Arrived';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
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
    const hasRoute = originLat && originLng && destLat && destLng;
    const hasPos   = lat && lng;
    if (!hasRoute && !hasPos) return;

    cancelledRef.current = false;

    const hasTimeWindow = pickupTime && deliveryTime
      && status !== 'delivered'
      && status !== 'pending';

    loadLeaflet(cancelledRef).then(() => {
      if (cancelledRef.current || !mapRef.current) return;

      if (animRef.current)     { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current) { instanceRef.current.remove();   instanceRef.current = null; }

      const L   = window.L;
      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      // ── Dark styled tile layer (CartoDB Dark Matter, no API key needed) ──
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      instanceRef.current = map;
      setMapLoading(false);

      if (hasRoute) {
        // ── Great-circle arc ──────────────────────────────────────────────
        const arc     = buildGreatCircleArc(originLat, originLng, destLat, destLng, 300);
        const latlngs = arc.map(p => [p.lat, p.lng]);

        // Fit bounds to show the full route
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds, { padding: [52, 52] });

        // Ghost route line — subtle dashed track
        L.polyline(latlngs, {
          color: '#4a4a6a',
          weight: 2,
          dashArray: '6 6',
          opacity: 0.6,
        }).addTo(map);

        // ── Origin marker ─────────────────────────────────────────────────
        L.marker([originLat, originLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width:13px;height:13px;border-radius:50%;
              background:${GREEN_HEX};
              border:2.5px solid #fff;
              box-shadow:0 0 0 3px ${GREEN_HEX}55,0 0 8px ${GREEN_HEX}88;
            "></div>`,
            iconSize: [13, 13], iconAnchor: [6, 6],
          }),
        }).addTo(map).bindPopup('<strong>Origin</strong>');

        // ── Destination marker ────────────────────────────────────────────
        L.marker([destLat, destLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="
              width:13px;height:13px;border-radius:50%;
              background:${RED_HEX};
              border:2.5px solid #fff;
              box-shadow:0 0 0 3px ${RED_HEX}55,0 0 8px ${RED_HEX}88;
            "></div>`,
            iconSize: [13, 13], iconAnchor: [6, 6],
          }),
        }).addTo(map).bindPopup('<strong>Destination</strong>');

        // ── Plane icon (SVG so we can rotate it cleanly) ──────────────────
        const planeSVG = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="38" height="38">
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <g filter="url(#glow)">
              <!-- plane body -->
              <path d="M32 4 L40 28 L60 34 L40 36 L38 56 L32 50 L26 56 L24 36 L4 34 L24 28 Z"
                fill="${ORANGE_HEX}" stroke="#fff" stroke-width="1.5"/>
            </g>
          </svg>`;

        const pkgIcon = L.divIcon({
          className: 'plane-marker-wrap',
          html: `<div class="plane-marker-inner" style="
            width:38px;height:38px;
            transform-origin:50% 50%;
            filter:drop-shadow(0 2px 6px rgba(0,0,0,0.7));
            transition:transform 0.15s linear;
          ">${planeSVG}</div>`,
          iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -22],
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

        // Travelled trail (glowing purple line behind the plane)
        const trailPoints = arc.slice(0, startPos.idx + 1).map(p => [p.lat, p.lng]);
        const trailLayer  = L.polyline(trailPoints, {
          color: PURPLE_HEX,
          weight: 3,
          opacity: 0.85,
        }).addTo(map);

        // ── Rotate helper ─────────────────────────────────────────────────
        // The SVG plane points UP (north). Bearing 0 = north → offset 0.
        function rotatePlane(bearing) {
          const el = marker.getElement();
          if (!el) return;
          const inner = el.querySelector('.plane-marker-inner');
          if (inner) inner.style.transform = `rotate(${bearing}deg)`;
        }

        // Set initial bearing
        if (startFrac > 0 && startPos.idx > 0) {
          const prev = arc[startPos.idx - 1];
          rotatePlane(getBearing(prev.lat, prev.lng, startPos.lat, startPos.lng));
        } else {
          rotatePlane(getBearing(originLat, originLng, destLat, destLng));
        }

        // ── Animation loop ────────────────────────────────────────────────
        const isDelivered = status === 'delivered';
        // Use float index for smooth sub-step movement
        let floatIdx  = startPos.idx;
        let fadeSteps = 0;
        const FADE_STEPS = 30;
        // Speed: ~300 steps in ~18 seconds = smooth continuous loop
        const STEP_PER_TICK = isDelivered ? 0 : 0.6;
        const TICK_MS       = 60; // ~16fps

        // Pause when tab is hidden
        const handleVisibility = () => {
          if (document.hidden) {
            if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
          } else if (!isDelivered && !animRef.current) {
            startAnim();
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        function startAnim() {
          animRef.current = setInterval(() => {
            if (cancelledRef.current) {
              clearInterval(animRef.current); animRef.current = null; return;
            }

            // If real-time window is set, keep in sync with clock
            if (hasTimeWindow) {
              const frac = getJourneyFraction(pickupTime, deliveryTime);
              if (frac !== null && frac < 1) {
                const realIdx = frac * (arc.length - 1);
                // Don't let the visual loop fall too far behind real time
                if (floatIdx < realIdx - 5) floatIdx = realIdx;
              }
            }

            floatIdx += STEP_PER_TICK;

            if (floatIdx >= arc.length - 1) {
              if (isDelivered) {
                floatIdx = arc.length - 1;
                clearInterval(animRef.current); animRef.current = null; return;
              }

              // Fade out trail, then loop back
              fadeSteps++;
              trailLayer.setStyle({
                opacity: Math.max(0, 0.85 - (fadeSteps / FADE_STEPS) * 0.85),
              });

              if (fadeSteps >= FADE_STEPS) {
                // Restart from real-time position or beginning
                if (hasTimeWindow) {
                  const frac = getJourneyFraction(pickupTime, deliveryTime);
                  floatIdx = frac !== null ? frac * (arc.length - 1) : 0;
                } else {
                  floatIdx = 0;
                }
                fadeSteps = 0;
                trailLayer.setLatLngs(arc.slice(0, Math.floor(floatIdx) + 1).map(p => [p.lat, p.lng]));
                trailLayer.setStyle({ opacity: 0.85 });
                rotatePlane(getBearing(originLat, originLng, destLat, destLng));
              }
              return;
            }

            const pos = interpolateArc(arc, floatIdx / (arc.length - 1));
            marker.setLatLng([pos.lat, pos.lng]);

            // Update trail to current position
            trailLayer.setLatLngs(arc.slice(0, Math.floor(floatIdx) + 1).map(p => [p.lat, p.lng]));

            // Bearing from previous to current for rotation
            const prevIdx = Math.max(0, Math.floor(floatIdx) - 1);
            const prev    = arc[prevIdx];
            rotatePlane(getBearing(prev.lat, prev.lng, pos.lat, pos.lng));
          }, TICK_MS);
        }

        if (!isDelivered) startAnim();

      } else if (hasPos) {
        // Fallback: single pin, no route
        map.setView([lat, lng], 7);
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">📍</div>`,
            iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
          }),
        }).addTo(map)
          .bindPopup(`<strong>${labelRef.current || 'Package Location'}</strong>`)
          .openPopup();
      }
    }).catch(() => {});

    // Cleanup
    let handleVisibility;
    return () => {
      cancelledRef.current = true;
      if (handleVisibility) document.removeEventListener('visibilitychange', handleVisibility);
      if (animRef.current)     { clearInterval(animRef.current); animRef.current = null; }
      if (instanceRef.current) { instanceRef.current.remove();   instanceRef.current = null; }
    };
  }, [lat, lng, originLat, originLng, destLat, destLng, status, pickupTime, deliveryTime]);

  const canShow = (originLat && originLng && destLat && destLng) || (lat && lng);
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
