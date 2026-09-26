import React, { useState, useEffect, useRef } from 'react';
import { signOut, supabase } from '../api/auth';
import {
  getShipments, deleteShipment, updateLocation,
  addEvent, deleteEvent, createShipment, updateShipment, getShipment,
  uploadImage, deleteImage,
} from '../api/admin';
import AdminMapPicker from '../components/AdminMapPicker';
import { generateTrackingNumber } from '../utils/generateTrackingNumber';

// ── CurrentLocationPicker ─────────────────────────────────────────────────────
// Inline search + mini map for setting the package's current location pin
function CurrentLocationPicker({ value, lat, lng, onChange }) {
  const mapRef     = useRef(null);
  const instanceRef = useRef(null);
  const markerRef  = useRef(null);
  const mountedRef = useRef(true);
  const [query, setQuery]       = useState(value || '');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  useEffect(() => {
    mountedRef.current = true;
    // Init map
    const loadL = () => new Promise((resolve, reject) => {
      if (!document.getElementById('leaflet-css')) {
        const link = Object.assign(document.createElement('link'), {
          id: 'leaflet-css', rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
        });
        document.head.appendChild(link);
      }
      if (window.L) return resolve();
      const existing = document.getElementById('leaflet-js');
      if (existing) {
        const wait = setInterval(() => { if (window.L) { clearInterval(wait); resolve(); } }, 50);
        return;
      }
      const s = Object.assign(document.createElement('script'), {
        id: 'leaflet-js', src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      });
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });

    loadL().then(() => {
      if (!mountedRef.current || !mapRef.current || instanceRef.current) return;
      const L = window.L;
      const initLat = lat ? parseFloat(lat) : 20;
      const initLng = lng ? parseFloat(lng) : 0;
      const zoom    = lat ? 12 : 2;
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })
        .setView([initLat, initLng], zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([parseFloat(lat), parseFloat(lng)], { draggable: true })
          .addTo(map);
        markerRef.current.on('dragend', e => {
          const { lat: la, lng: lo } = e.target.getLatLng();
          onChange({ location: query, lat: parseFloat(la.toFixed(6)), lng: parseFloat(lo.toFixed(6)) });
        });
      }

      map.on('click', e => {
        const { lat: la, lng: lo } = e.latlng;
        const pos = { lat: parseFloat(la.toFixed(6)), lng: parseFloat(lo.toFixed(6)) };
        if (markerRef.current) markerRef.current.setLatLng([pos.lat, pos.lng]);
        else markerRef.current = L.marker([pos.lat, pos.lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', ev => {
          const { lat: dla, lng: dlo } = ev.target.getLatLng();
          onChange({ location: query, lat: parseFloat(dla.toFixed(6)), lng: parseFloat(dlo.toFixed(6)) });
        });
        onChange({ location: query, lat: pos.lat, lng: pos.lng });
      });

      instanceRef.current = map;
    }).catch(() => {});

    return () => {
      mountedRef.current = false;
      if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }
    };
  }, []);

  // If lat/lng change externally, move marker
  useEffect(() => {
    if (!instanceRef.current || !lat || !lng) return;
    const L  = window.L;
    const pos = [parseFloat(lat), parseFloat(lng)];
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos, { draggable: true }).addTo(instanceRef.current);
    }
    instanceRef.current.setView(pos, 12);
  }, [lat, lng]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true); setSearchErr(''); setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'PulsTrack/1.0 (support@pulstrack.com)' } }
      );
      const data = await res.json();
      if (!mountedRef.current) return;
      if (!data.length) setSearchErr('No results found.');
      else setResults(data);
    } catch { if (mountedRef.current) setSearchErr('Search failed. Check your connection.'); }
    finally  { if (mountedRef.current) setSearching(false); }
  }

  function handleSelect(r) {
    const la = parseFloat(parseFloat(r.lat).toFixed(6));
    const lo = parseFloat(parseFloat(r.lon).toFixed(6));
    const name = r.display_name.split(',').slice(0, 2).join(',').trim();
    setQuery(name);
    setResults([]);
    onChange({ location: name, lat: la, lng: lo });
  }

  return (
    <div className="clp-wrap">
      {/* Search bar */}
      <div className="clp-search-row">
        <input
          className="clp-input"
          type="text"
          placeholder="Search city, address, facility…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" className="btn-admin-primary clp-btn" onClick={handleSearch} disabled={searching}>
          {searching ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
          {searching ? ' Searching…' : ' Search'}
        </button>
      </div>

      {searchErr && <p className="clp-err"><i className="fa-solid fa-triangle-exclamation"></i> {searchErr}</p>}

      {results.length > 0 && (
        <ul className="clp-results">
          {results.map(r => (
            <li key={r.place_id} className="clp-result-item" onClick={() => handleSelect(r)}>
              <i className="fa-solid fa-location-dot"></i> {r.display_name}
            </li>
          ))}
        </ul>
      )}

      {/* Map */}
      <div ref={mapRef} className="clp-map"></div>

      {lat && lng && (
        <p className="field-hint" style={{ color: 'var(--green)', marginTop: '8px' }}>
          <i className="fa-solid fa-check-circle"></i> Pin set: {query || 'Custom location'} ({parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)})
          &nbsp;— drag the pin to fine-tune
        </p>
      )}
    </div>
  );
}

// Status → progress step mapping (auto, no manual input needed)
const STATUSES = [
  { value: 'pending',      label: 'Pending',         icon: 'fa-clock',                step: 0 },
  { value: 'in-transit',   label: 'In Transit',       icon: 'fa-plane',                step: 2 },
  { value: 'out-delivery', label: 'Out for Delivery', icon: 'fa-truck',                step: 3 },
  { value: 'delivered',    label: 'Delivered',        icon: 'fa-circle-check',          step: 4 },
  { value: 'exception',    label: 'Exception',        icon: 'fa-triangle-exclamation',  step: 1 },
];

const EMPTY_FORM = {
  tracking_number: '', service: 'PulsTrack Express',
  status: 'in-transit', status_label: 'In Transit',
  status_icon: 'fa-plane', progress_step: 2,
  item_name: '',
  origin: '', destination: '', current_location: '',
  weight: '', estimated_delivery: '',
  delivered_at: null, recipient: '',
  map_lat: '', map_lng: '',
  origin_lat: '', origin_lng: '',
  dest_lat: '',  dest_lng: '',
  pickup_time: '', delivery_time: '',
  // Delivio fields
  sender_name: '', sender_phone: '', sender_email: '',
  receiver_name: '', receiver_phone: '', receiver_email: '', receiver_address: '',
  package_size: '', declared_amount: '', special_note: '', service_tags: '',
  _imageFile: null, _imageUrl: null,
};

const makeEmptyEvent = () => ({
  status: '', location: '',
  event_time: new Date().toISOString().slice(0, 16),
  is_latest: false,
});

export default function AdminDashboard({ session, onLogout, onBackToSite }) {
  const token = session?.access_token;

  const [shipments, setShipments]             = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [view, setView]                       = useState('list');   // 'list' | 'form'
  const [editingShipment, setEditingShipment] = useState(null);
  const [expandedId, setExpandedId]           = useState(null);
  const [expandedData, setExpandedData]       = useState(null);
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [eventForm, setEventForm]             = useState(makeEmptyEvent);
  const [locationForm, setLocationForm]       = useState({ map_lat: '', map_lng: '', current_location: '' });
  const [saving, setSaving]                   = useState(false);
  const [toast, setToast]                     = useState(null);
  const [mapPicker, setMapPicker]             = useState(null);
  const [sidebarOpen, setSidebarOpen]         = useState(false);
  const [imageUploading, setImageUploading]   = useState(false);
  const [geoStatus, setGeoStatus]             = useState({ origin: '', dest: '' });
  const [geoResults, setGeoResults]           = useState({ origin: [], dest: [] });
  const [geoConfirmed, setGeoConfirmed]       = useState({ origin: '', dest: '' });
  const geocodeTimers                         = useRef({});
  // Live token ref — updated by Supabase auth state changes so long sessions don't 401
  const tokenRef = useRef(session?.access_token);
  useEffect(() => { tokenRef.current = session?.access_token; }, [session]);

  // Keep token fresh: subscribe to Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.access_token) {
        tokenRef.current = newSession.access_token;
      } else {
        // Session expired — force logout
        onLogout();
      }
    });
    return () => subscription.unsubscribe();
  }, [onLogout]);

  // ── AUTO-GEOCODE with dropdown picker ────────────────
  function scheduleGeocode(field, value) {
    clearTimeout(geocodeTimers.current[field]);
    // Clear results if input is too short
    if (!value.trim() || value.trim().length < 3) {
      setGeoResults(r => ({ ...r, [field]: [] }));
      setGeoStatus(s => ({ ...s, [field]: '' }));
      return;
    }

    geocodeTimers.current[field] = setTimeout(async () => {
      setGeoStatus(s => ({ ...s, [field]: 'loading' }));
      setGeoResults(r => ({ ...r, [field]: [] }));
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'PulsTrack/1.0 (support@pulstrack.com)' } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.length === 0) {
          setGeoStatus(s => ({ ...s, [field]: 'notfound' }));
        } else {
          setGeoResults(r => ({ ...r, [field]: data }));
          setGeoStatus(s => ({ ...s, [field]: 'choose' }));
        }
      } catch (err) {
        console.warn('Geocode failed:', err.message);
        setGeoStatus(s => ({ ...s, [field]: 'error' }));
      }
    }, 700);
  }

  // Called when admin clicks a result from the dropdown
  function handleGeoSelect(field, result) {
    const lat = parseFloat(parseFloat(result.lat).toFixed(6));
    const lng = parseFloat(parseFloat(result.lon).toFixed(6));
    const name = result.display_name;

    if (field === 'origin') {
      setForm(f => ({ ...f, origin_lat: lat, origin_lng: lng }));
    } else {
      setForm(f => ({ ...f, dest_lat: lat, dest_lng: lng }));
    }
    // Close the dropdown
    setGeoResults(r => ({ ...r, [field]: [] }));
    setGeoStatus(s => ({ ...s, [field]: 'ok' }));
    // Store the confirmed display name for reference
    setGeoConfirmed(c => ({ ...c, [field]: name }));
  }

  useEffect(() => {
    loadShipments();
    // Fix: clean up geocode timers on unmount
    return () => {
      Object.values(geocodeTimers.current).forEach(id => clearTimeout(id));
    };
  }, []);

  // ── DATA ──────────────────────────────────────────────
  async function loadShipments() {
    setLoading(true);
    try {
      const data = await getShipments(tokenRef.current);
      setShipments(data.shipments);
    } catch (e) { toast_show(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function loadExpanded(id) {
    try {
      const data = await getShipment(id, tokenRef.current);
      setExpandedData(data);
      setLocationForm({
        map_lat: data.shipment.map_lat || '',
        map_lng: data.shipment.map_lng || '',
        current_location: data.shipment.current_location || '',
      });
    } catch (e) { toast_show(e.message, 'error'); }
  }

  // Fix #35: error toasts persist longer (8s), success toasts dismiss at 3.5s
  function toast_show(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'error' ? 8000 : 3500);
  }

  // ── STATUS CHANGE — auto-sets progress step ───────────
  function handleStatusChange(val) {
    const s = STATUSES.find(s => s.value === val);
    setForm(f => ({
      ...f,
      status:        val,
      status_label:  s?.label    || val,
      status_icon:   s?.icon     || 'fa-box',
      progress_step: s?.step     ?? f.progress_step,
    }));
  }

  // ── SAVE SHIPMENT ─────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let shipmentId;
      // Fix #28: strip client-only temp fields before sending to backend
      const { _imageFile, _imageUrl, ...formData } = form;
      if (editingShipment) {
        await updateShipment(editingShipment.id, formData, tokenRef.current);
        shipmentId = editingShipment.id;
        toast_show('Shipment updated');
      } else {
        const result = await createShipment(formData, tokenRef.current);
        shipmentId = result.shipment.id;
        toast_show('Shipment created');
      }

      // If a new image file was selected, upload it after saving
      if (form._imageFile && shipmentId) {
        try {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = ev => resolve(ev.target.result.split(',')[1]);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(form._imageFile);
          });
          await uploadImage(shipmentId, { base64, mimeType: form._imageFile.type }, tokenRef.current);
          toast_show('Image uploaded successfully');
        } catch (imgErr) {
          toast_show(`Shipment saved but image failed: ${imgErr.message}`, 'error');
        }
      }

      goToList();
      loadShipments();
    } catch (e) {
      // Fix: handle 409 duplicate tracking number — auto-regenerate
      if (e.message?.includes('already exists')) {
        toast_show('Tracking number already exists — generating a new one', 'error');
        setForm(f => ({ ...f, tracking_number: generateTrackingNumber() }));
      } else {
        toast_show(e.message, 'error');
      }
    } finally { setSaving(false); }
  }

  // ── DELETE ────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Delete this shipment? This cannot be undone.')) return;
    try {
      await deleteShipment(id, tokenRef.current);
      toast_show('Shipment deleted');
      if (expandedId === id) { setExpandedId(null); setExpandedData(null); }
      loadShipments();
    } catch (e) { toast_show(e.message, 'error'); }
  }

  // ── EDIT ──────────────────────────────────────────────
  function handleEdit(s) {
    setForm({
      tracking_number: s.tracking_number,
      service:         s.service || '',
      status:          s.status,
      status_label:    s.status_label,
      status_icon:     s.status_icon,
      progress_step:   s.progress_step || 0,
      item_name:       s.item_name || '',
      origin:          s.origin || '',
      destination:     s.destination || '',
      current_location:s.current_location || '',
      weight:          s.weight || '',
      estimated_delivery: s.estimated_delivery || '',
      delivered_at:    s.delivered_at || null,
      recipient:       s.recipient || '',
      map_lat:         s.map_lat    || '',
      map_lng:         s.map_lng    || '',
      origin_lat:      s.origin_lat || '',
      origin_lng:      s.origin_lng || '',
      dest_lat:        s.dest_lat   || '',
      dest_lng:        s.dest_lng   || '',
      pickup_time:     s.pickup_time   ? s.pickup_time.slice(0, 16)   : '',
      delivery_time:   s.delivery_time ? s.delivery_time.slice(0, 16) : '',
      // Delivio fields
      sender_name:      s.sender_name      || '',
      sender_phone:     s.sender_phone     || '',
      sender_email:     s.sender_email     || '',
      receiver_name:    s.receiver_name    || '',
      receiver_phone:   s.receiver_phone   || '',
      receiver_email:   s.receiver_email   || '',
      receiver_address: s.receiver_address || '',
      package_size:     s.package_size     || '',
      declared_amount:  s.declared_amount  || '',
      special_note:     s.special_note     || '',
      service_tags:     s.service_tags     || '',
    });
    setEditingShipment(s);
    setView('form');
  }

  // ── TOGGLE EXPAND ROW ─────────────────────────────────
  function handleExpand(s) {
    if (expandedId === s.id) {
      setExpandedId(null);
      setExpandedData(null);
      setLocationForm({ map_lat: '', map_lng: '', current_location: '' });
      setEventForm(makeEmptyEvent());
    } else {
      setExpandedId(s.id);
      setExpandedData(null);
      setLocationForm({ map_lat: '', map_lng: '', current_location: '' });
      setEventForm(makeEmptyEvent());
      loadExpanded(s.id);
    }
  }

  // ── UPDATE LOCATION ───────────────────────────────────
  async function handleUpdateLocation(e) {
    e.preventDefault();
    if (!locationForm.map_lat || !locationForm.map_lng) {
      toast_show('Please search for a location and pick a pin on the map first', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateLocation(expandedId, locationForm, tokenRef.current);
      toast_show('Live location updated');
      loadExpanded(expandedId);
      loadShipments();
    } catch (e) { toast_show(e.message, 'error'); }
    finally { setSaving(false); }
  }

  // ── ADD EVENT ─────────────────────────────────────────
  async function handleAddEvent(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addEvent(expandedId, {
        ...eventForm,
        event_time: new Date(eventForm.event_time).toISOString(),
      }, tokenRef.current);
      toast_show('Event added');
      setEventForm(makeEmptyEvent());
      loadExpanded(expandedId);
    } catch (e) { toast_show(e.message, 'error'); }
    finally { setSaving(false); }
  }

  // ── DELETE EVENT ──────────────────────────────────────
  async function handleDeleteEvent(id) {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(id, tokenRef.current);
      toast_show('Event deleted');
      loadExpanded(expandedId);
    } catch (e) { toast_show(e.message, 'error'); }
  }

  // ── MAP PICKER ────────────────────────────────────────
  function handleMapPick(lat, lng) {
    if (mapPicker === 'current')  setForm(f => ({ ...f, map_lat: lat, map_lng: lng }));
    if (mapPicker === 'origin')   setForm(f => ({ ...f, origin_lat: lat, origin_lng: lng }));
    if (mapPicker === 'dest')     setForm(f => ({ ...f, dest_lat: lat, dest_lng: lng }));
    if (mapPicker === 'location') setLocationForm(f => ({ ...f, map_lat: lat, map_lng: lng }));
    setMapPicker(null);
  }

  // ── IMAGE UPLOAD ─────────────────────────────────────
  // Fix: properly handle async errors in FileReader callback
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const shipmentId = expandedId; // capture before async

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast_show('Only JPEG, PNG, WebP and GIF images are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast_show('Image must be under 5MB', 'error');
      return;
    }

    setImageUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = ev => resolve(ev.target.result.split(',')[1]);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      await uploadImage(shipmentId, { base64, mimeType: file.type }, tokenRef.current);
      toast_show('Image uploaded successfully');
      if (shipmentId) { loadExpanded(shipmentId); loadShipments(); }
    } catch (err) {
      toast_show(err.message || 'Upload failed', 'error');
    } finally {
      setImageUploading(false);
    }
  }

  async function handleImageDelete() {
    if (!window.confirm('Remove this image?')) return;
    const shipmentId = expandedId; // capture before async
    try {
      await deleteImage(shipmentId, tokenRef.current);
      toast_show('Image removed');
      if (shipmentId) { loadExpanded(shipmentId); loadShipments(); }
    } catch (err) {
      toast_show(err.message, 'error');
    }
  }

  // ── NAV ───────────────────────────────────────────────
  function goToList() {
    setView('list');
    setEditingShipment(null);
    setForm(EMPTY_FORM);
    setSidebarOpen(false);
  }

  function goToCreate() {
    setEditingShipment(null);
    setForm(EMPTY_FORM);
    setView('form');
    setSidebarOpen(false);
  }

  // ── RENDER ────────────────────────────────────────────

  return (
    <div className="admin-layout">

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-logo">
          <span className="logo-pulse">Puls</span><span className="logo-track">Track</span>
          <span className="admin-badge">Admin</span>
        </div>

        <nav className="admin-nav">
          <button className={view === 'list' ? 'active' : ''} onClick={goToList}>
            <i className="fa-solid fa-list"></i> All Shipments
          </button>
          <button className={view === 'form' && !editingShipment ? 'active' : ''} onClick={goToCreate}>
            <i className="fa-solid fa-plus"></i> New Shipment
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-email">
            <i className="fa-solid fa-user-shield"></i>
            <span>{session?.user?.email}</span>
          </div>
          <button className="btn-sidebar-action" onClick={onBackToSite}>
            <i className="fa-solid fa-arrow-left"></i> Back to site
          </button>
          {/* Fix #25: signOut try/catch so onLogout always fires */}
          <button className="btn-logout" onClick={async () => {
            try { await signOut(); } catch (_) {}
            onLogout();
          }}>
            <i className="fa-solid fa-right-from-bracket"></i> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <div className="admin-mobile-header">
        <button className="admin-hamburger" onClick={() => setSidebarOpen(o => !o)}>
          <i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>
        <div className="logo" style={{ fontSize: '22px', fontWeight: 900 }}>
          <span className="logo-pulse">Puls</span><span className="logo-track">Track</span>
        </div>
        <button className="btn-admin-primary" style={{ padding: '7px 14px', fontSize: '13px' }} onClick={goToCreate}>
          <i className="fa-solid fa-plus"></i> New
        </button>
      </div>

      {/* ── MAIN ── */}
      <main className="admin-main">

        {/* Toast */}
        {toast && (
          <div className={`admin-toast ${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`}></i>
            {toast.msg}
          </div>
        )}

        {/* ════════════════════════════════
            VIEW: SHIPMENTS LIST
        ════════════════════════════════ */}
        {view === 'list' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <div>
                <h1><i className="fa-solid fa-boxes-stacked"></i> Shipments</h1>
                <p className="admin-section-sub">
                  {shipments.length} shipment{shipments.length !== 1 ? 's' : ''} total
                </p>
              </div>
              <button className="btn-admin-primary" onClick={goToCreate}>
                <i className="fa-solid fa-plus"></i> New Shipment
              </button>
            </div>

            {loading ? (
              <div className="admin-spinner-wrap"><div className="spinner"></div></div>
            ) : shipments.length === 0 ? (
              <div className="admin-empty">
                <i className="fa-solid fa-box-open"></i>
                <p>No shipments yet.</p>
                <button className="btn-admin-primary" style={{ marginTop: '16px' }} onClick={goToCreate}>
                  <i className="fa-solid fa-plus"></i> Create your first shipment
                </button>
              </div>
            ) : (
              <div className="shipment-list">
                {shipments.map(s => (
                  <div key={s.id} className={`shipment-row-wrap ${expandedId === s.id ? 'expanded' : ''}`}>

                    {/* ── SHIPMENT ROW ── */}
                    <div className="shipment-row">
                      <div className="shipment-row-main">
                        <div className="shipment-tracking-num">{s.tracking_number}</div>
                        <div className="shipment-route">
                          <span>{s.origin}</span>
                          <i className="fa-solid fa-arrow-right" style={{ color: 'var(--gray-400)', fontSize: '11px' }}></i>
                          <span>{s.destination}</span>
                        </div>
                      </div>
                      <div className="shipment-row-meta">
                        <span className={`status-badge ${s.status}`}>
                          <i className={`fa-solid ${s.status_icon}`}></i> {s.status_label}
                        </span>
                        <span className={`map-pin-indicator ${s.map_lat ? 'set' : ''}`}>
                          <i className="fa-solid fa-map"></i>
                          {s.map_lat ? ' Map set' : ' No map'}
                        </span>
                      </div>
                      <div className="shipment-row-actions">
                        <button className="btn-row-action btn-manage"
                          title={expandedId === s.id ? 'Close' : 'Manage'}
                          onClick={() => handleExpand(s)}>
                          <i className={`fa-solid ${expandedId === s.id ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                          <span>{expandedId === s.id ? 'Close' : 'Manage'}</span>
                        </button>
                        <button className="btn-row-action btn-edit-row" title="Edit" onClick={() => handleEdit(s)}>
                          <i className="fa-solid fa-pen"></i>
                          <span>Edit</span>
                        </button>
                        <button className="btn-row-action btn-del-row" title="Delete" onClick={() => handleDelete(s.id)}>
                          <i className="fa-solid fa-trash"></i>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* ── EXPANDED PANEL ── */}
                    {expandedId === s.id && (
                      <div className="shipment-expand-panel">
                        {!expandedData ? (
                          <div className="admin-spinner-wrap" style={{ padding: '24px' }}>
                            <div className="spinner"></div>
                          </div>
                        ) : (
                          <div className="expand-grid">

                            {/* LEFT: Update live location */}
                            <div className="expand-col">
                              <h3 className="expand-col-title">
                                <i className="fa-solid fa-location-dot"></i> Update Live Location
                              </h3>
                              <p className="expand-col-desc">
                                This moves the pin on the customer's live map.
                              </p>
                              <form onSubmit={handleUpdateLocation}>
                                <CurrentLocationPicker
                                  value={locationForm.current_location || ''}
                                  lat={locationForm.map_lat}
                                  lng={locationForm.map_lng}
                                  onChange={({ location, lat, lng }) =>
                                    setLocationForm(f => ({ ...f, current_location: location, map_lat: lat, map_lng: lng }))
                                  }
                                />
                                <button type="submit" className="btn-admin-primary" disabled={saving} style={{ marginTop: '12px' }}>
                                  {saving
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                                    : <><i className="fa-solid fa-floppy-disk"></i> Save Location</>
                                  }
                                </button>
                              </form>
                            </div>

                            {/* RIGHT: Add tracking event */}
                            <div className="expand-col">
                              <h3 className="expand-col-title">
                                <i className="fa-solid fa-timeline"></i> Add Update
                              </h3>
                              <p className="expand-col-desc">
                                This appears in the customer's tracking history.
                              </p>
                              <form onSubmit={handleAddEvent}>
                                <div className="form-group">
                                  <label>What happened?</label>
                                  <input type="text"
                                    placeholder="e.g. Package arrived at sorting facility"
                                    value={eventForm.status} required
                                    onChange={e => setEventForm(f => ({ ...f, status: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                  <label>Where?</label>
                                  <input type="text"
                                    placeholder="e.g. Chicago, IL"
                                    value={eventForm.location} required
                                    onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                  <label>When?</label>
                                  <input type="datetime-local"
                                    value={eventForm.event_time}
                                    onChange={e => setEventForm(f => ({ ...f, event_time: e.target.value }))} />
                                </div>
                                <label className="checkbox-label">
                                  <input type="checkbox" checked={eventForm.is_latest}
                                    onChange={e => setEventForm(f => ({ ...f, is_latest: e.target.checked }))} />
                                  <span>Show as most recent update</span>
                                </label>
                                <button type="submit" className="btn-admin-primary" disabled={saving} style={{ marginTop: '12px' }}>
                                  {saving
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Adding...</>
                                    : <><i className="fa-solid fa-plus"></i> Add Update</>
                                  }
                                </button>
                              </form>
                            </div>

                            {/* BOTTOM: History */}
                            <div className="expand-col expand-col-full">
                              <h3 className="expand-col-title">
                                <i className="fa-solid fa-image"></i> Item Image
                                <span className="expand-col-desc-inline">Shown to customers when they track this shipment</span>
                              </h3>
                              <div className="image-upload-area">
                                {expandedData.shipment?.item_image_url ? (
                                  <div className="image-preview-wrap">
                                    <img
                                      src={expandedData.shipment.item_image_url}
                                      alt="Item"
                                      className="image-preview"
                                    />
                                    <button
                                      className="btn-row-action btn-del-row"
                                      onClick={handleImageDelete}
                                      style={{ marginTop: '10px' }}
                                    >
                                      <i className="fa-solid fa-trash"></i>
                                      <span>Remove Image</span>
                                    </button>
                                  </div>
                                ) : (
                                  <label className="image-upload-label">
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif"
                                      onChange={handleImageUpload}
                                      style={{ display: 'none' }}
                                      disabled={imageUploading}
                                    />
                                    <div className="image-upload-placeholder">
                                      {imageUploading ? (
                                        <>
                                          <i className="fa-solid fa-spinner fa-spin"></i>
                                          <span>Uploading...</span>
                                        </>
                                      ) : (
                                        <>
                                          <i className="fa-solid fa-cloud-arrow-up"></i>
                                          <span>Click to upload item photo</span>
                                          <small>JPEG, PNG, WebP or GIF — max 5MB</small>
                                        </>
                                      )}
                                    </div>
                                  </label>
                                )}
                              </div>
                            </div>

                            {/* TRACKING HISTORY */}
                            <div className="expand-col expand-col-full">
                              <h3 className="expand-col-title">
                                <i className="fa-solid fa-clock-rotate-left"></i> Tracking History
                                <span className="event-count">{expandedData.events?.length || 0}</span>
                              </h3>
                              {!expandedData.events?.length ? (
                                <p className="admin-empty-small">No updates yet. Add one above.</p>
                              ) : (
                                <div className="events-list">
                                  {expandedData.events.map(evt => (
                                    <div key={evt.id} className={`event-row ${evt.is_latest ? 'latest' : ''}`}>
                                      <div className="event-dot"></div>
                                      <div className="event-info">
                                        <div className="event-status">
                                          {evt.status}
                                          {evt.is_latest && <span className="latest-tag">LATEST</span>}
                                        </div>
                                        <div className="event-meta">
                                          <i className="fa-solid fa-location-dot"></i> {evt.location}
                                          &nbsp;·&nbsp;
                                          <i className="fa-solid fa-clock"></i> {new Date(evt.event_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                      </div>
                                      <button className="btn-icon btn-delete" title="Delete"
                                        onClick={() => handleDeleteEvent(evt.id)}>
                                        <i className="fa-solid fa-trash"></i>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            VIEW: CREATE / EDIT FORM
        ════════════════════════════════ */}
        {view === 'form' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <div>
                <h1>
                  <i className={`fa-solid ${editingShipment ? 'fa-pen' : 'fa-plus'}`}></i>
                  {editingShipment ? 'Edit Shipment' : 'New Shipment'}
                </h1>
                <p className="admin-section-sub">
                  {editingShipment ? `Editing ${editingShipment.tracking_number}` : 'Fill in the shipment details below'}
                </p>
              </div>
              <button className="btn-admin-secondary" onClick={goToList}>
                <i className="fa-solid fa-arrow-left"></i> Back to list
              </button>
            </div>

            <form onSubmit={handleSave} className="shipment-form-clean">

              {/* ── SECTION 1: Tracking Info ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">1</span>
                  Tracking Details
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tracking Number *</label>
                    <div className="tracking-gen-row">
                      <input type="text"
                        placeholder="Click Generate or type manually"
                        value={form.tracking_number} required
                        disabled={!!editingShipment}
                        onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value.toUpperCase() }))} />
                      {!editingShipment && (
                        <button type="button" className="btn-generate"
                          onClick={() => setForm(f => ({ ...f, tracking_number: generateTrackingNumber() }))}>
                          <i className="fa-solid fa-wand-magic-sparkles"></i> Generate
                        </button>
                      )}
                    </div>
                    <p className="field-hint">Auto-format: PLT-2026-XXXXXXXX</p>
                  </div>
                  <div className="form-group">
                    <label>Service Type *</label>
                    <input type="text" placeholder="e.g. PulsTrack Express"
                      value={form.service} required
                      onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Package / Item Name *</label>
                  <input type="text" placeholder="e.g. iPhone 15 Pro, Nike Shoes, Electronics Package"
                    value={form.item_name} required
                    onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
                  <p className="field-hint">This is shown to the customer on the tracking page.</p>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Origin / Pickup City *</label>
                    <input type="text" placeholder="e.g. Los Angeles, CA"
                      value={form.origin} required
                      onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Destination *</label>
                    <input type="text" placeholder="e.g. Seoul, South Korea"
                      value={form.destination} required
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: Status ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">2</span>
                  Package Status
                </div>
                <div className="status-picker">
                  {STATUSES.map(s => (
                    <button key={s.value} type="button"
                      className={`status-pick-btn ${form.status === s.value ? 'active' : ''} ${s.value}`}
                      onClick={() => handleStatusChange(s.value)}>
                      <i className={`fa-solid ${s.icon}`}></i>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── SECTION 4: Package Details ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">3</span>`n                  Package Details
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Weight <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. 2.4 lbs"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                </div>

                {/* Real-time map timing */}
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Pickup Date &amp; Time
                      <span className="optional"> — for live map tracking</span>
                    </label>
                    <input type="datetime-local"
                      value={form.pickup_time || ''}
                      onChange={e => setForm(f => ({ ...f, pickup_time: e.target.value || null }))} />
                  </div>
                  <div className="form-group">
                    <label>
                      Expected Delivery Date &amp; Time
                      <span className="optional"> — for live map tracking</span>
                    </label>
                    <input type="datetime-local"
                      value={form.delivery_time || ''}
                      onChange={e => setForm(f => ({ ...f, delivery_time: e.target.value || null }))} />
                  </div>
                </div>
                <p className="field-hint" style={{ marginTop: '-8px' }}>
                  <i className="fa-solid fa-circle-info"></i> When both are set, the plane on the map moves automatically based on the real clock — no manual updates needed.
                </p>

                {/* Only show if status is delivered */}
                {form.status === 'delivered' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Delivered At</label>
                      <input type="datetime-local"
                        value={form.delivered_at || ''}
                        onChange={e => setForm(f => ({ ...f, delivered_at: e.target.value || null }))} />
                    </div>
                    <div className="form-group">
                      <label>Recipient Name <span className="optional">(optional)</span></label>
                      <input type="text" placeholder="e.g. J. Mitchell"
                        value={form.recipient}
                        onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 5: Sender & Receiver ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">4</span>
                  Sender &amp; Receiver
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sender Name <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. Kim Seo-Jeong"
                      value={form.sender_name}
                      onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Sender Phone <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. +1-555-000-1234"
                      value={form.sender_phone}
                      onChange={e => setForm(f => ({ ...f, sender_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Sender Email <span className="optional">(optional)</span></label>
                    <input type="email" placeholder="e.g. sender@email.com"
                      value={form.sender_email}
                      onChange={e => setForm(f => ({ ...f, sender_email: e.target.value }))} />
                  </div>
                </div>

                <div className="form-divider"></div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Receiver Name <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. GUOYONGQUAN"
                      value={form.receiver_name}
                      onChange={e => setForm(f => ({ ...f, receiver_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Receiver Phone <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. +82-10-7334-5188"
                      value={form.receiver_phone}
                      onChange={e => setForm(f => ({ ...f, receiver_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Receiver Email <span className="optional">(optional)</span></label>
                    <input type="email" placeholder="e.g. receiver@email.com"
                      value={form.receiver_email}
                      onChange={e => setForm(f => ({ ...f, receiver_email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Receiver Full Address <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. Room 202, 85 Hanggaul-ro, Ansan-si"
                      value={form.receiver_address}
                      onChange={e => setForm(f => ({ ...f, receiver_address: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* ── SECTION 6: Extra Package Info ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">5</span>
                  Extra Package Info
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Package Size <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. Medium, Large, 30x20x15cm"
                      value={form.package_size}
                      onChange={e => setForm(f => ({ ...f, package_size: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Declared Amount <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. $30,000"
                      value={form.declared_amount}
                      onChange={e => setForm(f => ({ ...f, declared_amount: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Service Tags <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. Air Freight, Express (comma-separated)"
                      value={form.service_tags}
                      onChange={e => setForm(f => ({ ...f, service_tags: e.target.value }))} />
                    <p className="field-hint"><i className="fa-solid fa-circle-info"></i> Tags appear as pills on the tracking page (e.g. "Air Freight, Express")</p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Special Note <span className="optional">(optional)</span></label>
                    <textarea placeholder="e.g. Handle with care, Fragile contents"
                      rows={3}
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '14px', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: '8px', outline: 'none' }}
                      value={form.special_note}
                      onChange={e => setForm(f => ({ ...f, special_note: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* ── SECTION 7: Live Map ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">6</span>
                  Live Map — Current Location
                </div>
                <p className="section-desc">
                  Search for where the package is right now. This pin is shown to customers on the tracking page.
                </p>

                {/* Search input */}
                <CurrentLocationPicker
                  value={form.current_location || ''}
                  lat={form.map_lat}
                  lng={form.map_lng}
                  onChange={({ location, lat, lng }) =>
                    setForm(f => ({ ...f, current_location: location, map_lat: lat, map_lng: lng }))
                  }
                />
              </div>

              {/* ── SECTION 6: Package Image ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">7</span>
                  Package Image <span className="optional">(optional)</span>
                </div>
                <p className="section-desc">
                  Upload a photo of the package. Customers will see this on the tracking page.
                </p>
                {editingShipment ? (
                  <div className="image-upload-area">
                    {form._imageUrl ? (
                      <div className="image-preview-wrap">
                        <img src={form._imageUrl} alt="Package" className="image-preview" />
                        <button type="button" className="btn-row-action btn-del-row"
                          onClick={() => setForm(f => ({ ...f, _imageFile: null, _imageUrl: null }))}
                          style={{ marginTop: '10px' }}>
                          <i className="fa-solid fa-trash"></i> <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <p className="admin-empty-small">
                        <i className="fa-solid fa-circle-info"></i> To upload an image for this shipment, save it first then use the <strong>Manage</strong> button on the shipments list.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="image-upload-area">
                    {form._imageUrl ? (
                      <div className="image-preview-wrap">
                        <img src={form._imageUrl} alt="Package preview" className="image-preview" />
                        <p style={{ fontSize: '12px', color: 'var(--green)', marginTop: '6px' }}>
                          <i className="fa-solid fa-check-circle"></i> Image ready — will upload after shipment is created
                        </p>
                        <button type="button" className="btn-row-action btn-del-row"
                          onClick={() => setForm(f => ({ ...f, _imageFile: null, _imageUrl: null }))}
                          style={{ marginTop: '8px' }}>
                          <i className="fa-solid fa-trash"></i> <span>Remove</span>
                        </button>
                      </div>
                    ) : (
                      <label className="image-upload-label">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast_show('Image must be under 5MB', 'error');
                              return;
                            }
                            // Fix #7: revoke previous object URL to prevent memory leak
                            if (form._imageUrl) URL.revokeObjectURL(form._imageUrl);
                            const url = URL.createObjectURL(file);
                            setForm(f => ({ ...f, _imageFile: file, _imageUrl: url }));
                          }}
                        />
                        <div className="image-upload-placeholder">
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                          <span>Click to upload package photo</span>
                          <small>JPEG, PNG, WebP or GIF — max 5MB</small>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* ── FORM ACTIONS ── */}
              <div className="form-actions form-actions-sticky">
                <button type="button" className="btn-admin-secondary" onClick={goToList}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin-primary btn-save-big" disabled={saving}>
                  {saving
                    ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                    : <><i className="fa-solid fa-floppy-disk"></i>
                        {editingShipment ? 'Save Changes' : 'Create Shipment'}
                      </>
                  }
                </button>
              </div>

            </form>
          </div>
        )}
      </main>

      {/* MAP PICKER MODAL */}
      {mapPicker && (
        <AdminMapPicker
          initialLat={
            mapPicker === 'current'  ? form.map_lat    :
            mapPicker === 'origin'   ? form.origin_lat :
            mapPicker === 'dest'     ? form.dest_lat   :
            locationForm.map_lat
          }
          initialLng={
            mapPicker === 'current'  ? form.map_lng    :
            mapPicker === 'origin'   ? form.origin_lng :
            mapPicker === 'dest'     ? form.dest_lng   :
            locationForm.map_lng
          }
          onConfirm={handleMapPick}
          onClose={() => setMapPicker(null)}
        />
      )}

      {/* SIDEBAR OVERLAY on mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

