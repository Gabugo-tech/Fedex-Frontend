import React, { useState, useEffect } from 'react';
import { signOut } from '../api/auth';
import {
  getShipments, deleteShipment, updateLocation,
  addEvent, deleteEvent, createShipment, updateShipment, getShipment,
  uploadImage, deleteImage,
} from '../api/admin';
import AdminMapPicker from '../components/AdminMapPicker';
import { generateTrackingNumber } from '../utils/generateTrackingNumber';

// Status → progress step mapping (auto, no manual input needed)
const STATUSES = [
  { value: 'pending',      label: 'Pending',         icon: 'fa-clock',                step: 0 },
  { value: 'in-transit',   label: 'In Transit',       icon: 'fa-plane',                step: 2 },
  { value: 'out-delivery', label: 'Out for Delivery', icon: 'fa-truck',                step: 3 },
  { value: 'delivered',    label: 'Delivered',        icon: 'fa-circle-check',          step: 4 },
  { value: 'exception',    label: 'Exception',        icon: 'fa-triangle-exclamation',  step: 1 },
];

const EMPTY_FORM = {
  tracking_number: '', service: 'GBT Express',
  status: 'in-transit', status_label: 'In Transit',
  status_icon: 'fa-plane', progress_step: 2,
  origin: '', destination: '', current_location: '',
  weight: '', estimated_delivery: '',
  delivered_at: null, recipient: '',
  map_lat: '', map_lng: '',
  origin_lat: '', origin_lng: '',
  dest_lat: '',  dest_lng: '',
  pickup_time: '', delivery_time: '',
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

  useEffect(() => { loadShipments(); }, []);

  // ── DATA ──────────────────────────────────────────────
  async function loadShipments() {
    setLoading(true);
    try {
      const data = await getShipments(token);
      setShipments(data.shipments);
    } catch (e) { toast_show(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function loadExpanded(id) {
    try {
      const data = await getShipment(id, token);
      setExpandedData(data);
      setLocationForm({
        map_lat: data.shipment.map_lat || '',
        map_lng: data.shipment.map_lng || '',
        current_location: data.shipment.current_location || '',
      });
    } catch (e) { toast_show(e.message, 'error'); }
  }

  // ── TOAST ─────────────────────────────────────────────
  function toast_show(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
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
      if (editingShipment) {
        await updateShipment(editingShipment.id, form, token);
        toast_show('Shipment updated');
      } else {
        await createShipment(form, token);
        toast_show('Shipment created');
      }
      goToList();
      loadShipments();
    } catch (e) { toast_show(e.message, 'error'); }
    finally { setSaving(false); }
  }

  // ── DELETE ────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('Delete this shipment? This cannot be undone.')) return;
    try {
      await deleteShipment(id, token);
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
    });
    setEditingShipment(s);
    setView('form');
  }

  // ── TOGGLE EXPAND ROW ─────────────────────────────────
  function handleExpand(s) {
    if (expandedId === s.id) {
      setExpandedId(null);
      setExpandedData(null);
    } else {
      setExpandedId(s.id);
      loadExpanded(s.id);
    }
  }

  // ── UPDATE LOCATION ───────────────────────────────────
  async function handleUpdateLocation(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateLocation(expandedId, locationForm, token);
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
      }, token);
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
      await deleteEvent(id, token);
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
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

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
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        await uploadImage(expandedId, { base64, mimeType: file.type }, token);
        toast_show('Image uploaded successfully');
        loadExpanded(expandedId);
        loadShipments();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast_show(err.message, 'error');
    } finally {
      setImageUploading(false);
    }
  }

  async function handleImageDelete() {
    if (!window.confirm('Remove this image?')) return;
    try {
      await deleteImage(expandedId, token);
      toast_show('Image removed');
      loadExpanded(expandedId);
      loadShipments();
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
          <button className="btn-logout" onClick={async () => { await signOut(); onLogout(); }}>
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
                        <span className={`map-pin-indicator ${s.origin_lat ? 'set' : ''}`}>
                          <i className="fa-solid fa-map"></i>
                          {s.origin_lat ? ' Map set' : ' No map'}
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
                                <div className="form-group">
                                  <label>Where is the package now?</label>
                                  <input type="text"
                                    placeholder="e.g. Chicago, IL — Sorting Facility"
                                    value={locationForm.current_location}
                                    onChange={e => setLocationForm(f => ({ ...f, current_location: e.target.value }))} />
                                </div>
                                <button type="button" className="btn-map-pick-simple"
                                  onClick={() => setMapPicker('location')}>
                                  <i className="fa-solid fa-map-location-dot"></i> Pick location on map
                                </button>
                                {(locationForm.map_lat && locationForm.map_lng) && (
                                  <p className="coords-preview">
                                    <i className="fa-solid fa-check-circle" style={{ color: 'var(--green)' }}></i>
                                    &nbsp;Pin set: {parseFloat(locationForm.map_lat).toFixed(4)}, {parseFloat(locationForm.map_lng).toFixed(4)}
                                  </p>
                                )}
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
                    <input type="text" placeholder="e.g. GBT Express"
                      value={form.service} required
                      onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
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

              {/* ── SECTION 3: Route ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">3</span>
                  Route
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Pickup City / Origin *</label>
                    <input type="text" placeholder="e.g. Los Angeles, CA"
                      value={form.origin} required
                      onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Delivery Address / Destination *</label>
                    <input type="text" placeholder="e.g. New York, NY 10001"
                      value={form.destination} required
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Where is the package right now? *</label>
                  <input type="text" placeholder="e.g. Memphis, TN — Sorting Facility"
                    value={form.current_location} required
                    onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} />
                </div>
              </div>

              {/* ── SECTION 4: Package Details ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">4</span>
                  Package Details
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Weight <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. 2.4 lbs"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Estimated Delivery Date <span className="optional">(optional)</span></label>
                    <input type="text" placeholder="e.g. September 18, 2026"
                      value={form.estimated_delivery}
                      onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))} />
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

              {/* ── SECTION 5: Map ── */}
              <div className="form-section">
                <div className="form-section-title">
                  <span className="form-step-num">5</span>
                  Live Map Setup
                </div>
                <p className="section-desc">
                  Set the map coordinates so customers can see the package moving on a live map.
                </p>

                <div className="map-setup-grid">
                  <div className="map-setup-item">
                    <div className="map-setup-label">
                      <span className="map-dot origin"></span> Pickup Location
                    </div>
                    <button type="button" className="btn-map-pick-simple"
                      onClick={() => setMapPicker('origin')}>
                      <i className="fa-solid fa-map-location-dot"></i>
                      {form.origin_lat
                        ? `✓ Set (${parseFloat(form.origin_lat).toFixed(3)}, ${parseFloat(form.origin_lng).toFixed(3)})`
                        : 'Click to set on map'}
                    </button>
                  </div>

                  <div className="map-setup-item">
                    <div className="map-setup-label">
                      <span className="map-dot pkg"></span> Current Position
                    </div>
                    <button type="button" className="btn-map-pick-simple"
                      onClick={() => setMapPicker('current')}>
                      <i className="fa-solid fa-map-location-dot"></i>
                      {form.map_lat
                        ? `✓ Set (${parseFloat(form.map_lat).toFixed(3)}, ${parseFloat(form.map_lng).toFixed(3)})`
                        : 'Click to set on map'}
                    </button>
                  </div>

                  <div className="map-setup-item">
                    <div className="map-setup-label">
                      <span className="map-dot dest"></span> Delivery Destination
                    </div>
                    <button type="button" className="btn-map-pick-simple"
                      onClick={() => setMapPicker('dest')}>
                      <i className="fa-solid fa-map-location-dot"></i>
                      {form.dest_lat
                        ? `✓ Set (${parseFloat(form.dest_lat).toFixed(3)}, ${parseFloat(form.dest_lng).toFixed(3)})`
                        : 'Click to set on map'}
                    </button>
                  </div>
                </div>
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
