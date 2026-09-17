import React, { useState, useEffect } from 'react';
import { signOut } from '../api/auth';
import {
  getShipments, deleteShipment, updateLocation, addEvent, deleteEvent,
  createShipment, updateShipment, getShipment,
} from '../api/admin';
import AdminMapPicker from '../components/AdminMapPicker';

const STATUSES = [
  { value: 'pending',      label: 'Pending',          icon: 'fa-clock' },
  { value: 'in-transit',   label: 'In Transit',        icon: 'fa-plane' },
  { value: 'out-delivery', label: 'Out for Delivery',  icon: 'fa-truck' },
  { value: 'delivered',    label: 'Delivered',          icon: 'fa-circle-check' },
  { value: 'exception',    label: 'Exception',          icon: 'fa-triangle-exclamation' },
];

const EMPTY_SHIPMENT = {
  tracking_number: '', status: 'in-transit', status_label: 'In Transit',
  status_icon: 'fa-plane', service: '', weight: '', origin: '', destination: '',
  current_location: '', estimated_delivery: '', delivered_at: null,
  recipient: '', progress_step: 1, map_lat: '', map_lng: '',
};

// Factory function so the timestamp is fresh each time it's called
const makeEmptyEvent = () => ({
  status: '', location: '', event_time: new Date().toISOString().slice(0, 16), is_latest: false,
});

export default function AdminDashboard({ session, onLogout, onBackToSite }) {
  const token = session?.access_token;

  const [shipments, setShipments]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('shipments'); // 'shipments' | 'create'
  const [editingShipment, setEditingShipment] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentDetail, setShipmentDetail] = useState(null);
  const [form, setForm]                 = useState(EMPTY_SHIPMENT);
  const [eventForm, setEventForm]       = useState(makeEmptyEvent);
  const [locationForm, setLocationForm] = useState({ map_lat: '', map_lng: '', current_location: '' });
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState(null); // 'form' | 'location'

  useEffect(() => { loadShipments(); }, []);

  async function loadShipments() {
    setLoading(true);
    try {
      const data = await getShipments(token);
      setShipments(data.shipments);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function loadShipmentDetail(id) {
    try {
      const data = await getShipment(id, token);
      setShipmentDetail(data);
      setLocationForm({
        map_lat: data.shipment.map_lat || '',
        map_lng: data.shipment.map_lng || '',
        current_location: data.shipment.current_location || '',
      });
    } catch (e) { showToast(e.message, 'error'); }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handleStatusChange(val) {
    const s = STATUSES.find(s => s.value === val);
    setForm(f => ({ ...f, status: val, status_label: s?.label || val, status_icon: s?.icon || 'fa-box' }));
  }

  async function handleSaveShipment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingShipment) {
        await updateShipment(editingShipment.id, form, token);
        showToast('Shipment updated successfully');
      } else {
        await createShipment(form, token);
        showToast('Shipment created successfully');
      }
      setForm(EMPTY_SHIPMENT);
      setEditingShipment(null);
      setActiveTab('shipments');
      loadShipments();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this shipment? This cannot be undone.')) return;
    try {
      await deleteShipment(id, token);
      showToast('Shipment deleted');
      if (selectedShipment?.id === id) { setSelectedShipment(null); setShipmentDetail(null); }
      loadShipments();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function handleEdit(shipment) {
    setForm({
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      status_label: shipment.status_label,
      status_icon: shipment.status_icon,
      service: shipment.service || '',
      weight: shipment.weight || '',
      origin: shipment.origin || '',
      destination: shipment.destination || '',
      current_location: shipment.current_location || '',
      estimated_delivery: shipment.estimated_delivery || '',
      delivered_at: shipment.delivered_at || null,
      recipient: shipment.recipient || '',
      progress_step: shipment.progress_step || 0,
      map_lat: shipment.map_lat || '',
      map_lng: shipment.map_lng || '',
    });
    setEditingShipment(shipment);
    setActiveTab('create');
  }

  async function handleUpdateLocation(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateLocation(selectedShipment.id, locationForm, token);
      showToast('Location updated on map');
      loadShipmentDetail(selectedShipment.id);
      loadShipments();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await addEvent(selectedShipment.id, {
        ...eventForm,
        event_time: new Date(eventForm.event_time).toISOString(),
      }, token);
      showToast('Event added');
      setEventForm(makeEmptyEvent());
      loadShipmentDetail(selectedShipment.id);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDeleteEvent(id) {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(id, token);
      showToast('Event deleted');
      loadShipmentDetail(selectedShipment.id);
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function handleLogout() {
    await signOut();
    onLogout();
  }

  function handleMapPick(lat, lng) {
    if (mapPickerTarget === 'form') {
      setForm(f => ({ ...f, map_lat: lat, map_lng: lng }));
    } else {
      setLocationForm(f => ({ ...f, map_lat: lat, map_lng: lng }));
    }
    setShowMapPicker(false);
  }

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="logo-fed">Fed</span><span className="logo-ex">Ex</span>
          <span className="admin-badge">Admin</span>
        </div>
        <nav className="admin-nav">
          <button className={activeTab === 'shipments' ? 'active' : ''}
            onClick={() => { setActiveTab('shipments'); setEditingShipment(null); setForm(EMPTY_SHIPMENT); }}>
            <i className="fa-solid fa-boxes-stacked"></i> Shipments
          </button>
          <button className={activeTab === 'create' ? 'active' : ''}
            onClick={() => { setActiveTab('create'); setEditingShipment(null); setForm(EMPTY_SHIPMENT); }}>
            <i className="fa-solid fa-plus"></i> {editingShipment ? 'Edit Shipment' : 'New Shipment'}
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-user-email">
            <i className="fa-solid fa-user-shield"></i> {session?.user?.email}
          </span>
          {/* Fix #6: back-to-site keeps session alive, logout clears it */}
          <button className="btn-admin-secondary" style={{ fontSize: '13px', padding: '8px 14px' }}
            onClick={onBackToSite}>
            <i className="fa-solid fa-arrow-left"></i> Back to site
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        {toast && (
          <div className={`admin-toast ${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`}></i>
            {toast.msg}
          </div>
        )}

        {/* ===== SHIPMENTS LIST ===== */}
        {activeTab === 'shipments' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h1><i className="fa-solid fa-boxes-stacked"></i> All Shipments</h1>
              <button className="btn-admin-primary"
                onClick={() => { setActiveTab('create'); setEditingShipment(null); setForm(EMPTY_SHIPMENT); }}>
                <i className="fa-solid fa-plus"></i> New Shipment
              </button>
            </div>

            {loading ? (
              <div className="admin-spinner-wrap"><div className="spinner"></div></div>
            ) : shipments.length === 0 ? (
              <div className="admin-empty">
                <i className="fa-solid fa-box-open"></i>
                <p>No shipments yet. Create your first one.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tracking #</th>
                      <th>Status</th>
                      <th>Service</th>
                      <th>Destination</th>
                      <th>Map Pin</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(s => (
                      <tr key={s.id} className={selectedShipment?.id === s.id ? 'selected' : ''}>
                        <td className="tracking-cell">{s.tracking_number}</td>
                        <td>
                          <span className={`status-badge ${s.status}`}>
                            <i className={`fa-solid ${s.status_icon}`}></i> {s.status_label}
                          </span>
                        </td>
                        <td>{s.service}</td>
                        <td>{s.destination}</td>
                        <td className="map-pin-cell">
                          {s.map_lat && s.map_lng
                            ? <span className="pin-set"><i className="fa-solid fa-location-dot"></i> Set</span>
                            : <span className="pin-unset"><i className="fa-regular fa-circle"></i> Not set</span>
                          }
                        </td>
                        <td className="actions-cell">
                          <button className="btn-icon btn-view" title="Manage"
                            onClick={() => {
                              setSelectedShipment(s);
                              loadShipmentDetail(s.id);
                            }}>
                            <i className="fa-solid fa-sliders"></i>
                          </button>
                          <button className="btn-icon btn-edit" title="Edit"
                            onClick={() => handleEdit(s)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="btn-icon btn-delete" title="Delete"
                            onClick={() => handleDelete(s.id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SHIPMENT DETAIL PANEL */}
            {selectedShipment && shipmentDetail && (
              <div className="admin-detail-panel">
                <div className="admin-detail-header">
                  <h2><i className="fa-solid fa-sliders"></i> Manage: {selectedShipment.tracking_number}</h2>
                  <button className="btn-icon btn-close" onClick={() => { setSelectedShipment(null); setShipmentDetail(null); }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* UPDATE MAP LOCATION */}
                <div className="admin-card">
                  <h3><i className="fa-solid fa-location-dot"></i> Live Map Location</h3>
                  <p className="admin-card-desc">Update the pin shown on the live map for this shipment.</p>
                  <form onSubmit={handleUpdateLocation} className="location-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Latitude</label>
                        <input type="number" step="any" placeholder="e.g. 40.7128"
                          value={locationForm.map_lat}
                          onChange={e => setLocationForm(f => ({ ...f, map_lat: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Longitude</label>
                        <input type="number" step="any" placeholder="e.g. -74.0060"
                          value={locationForm.map_lng}
                          onChange={e => setLocationForm(f => ({ ...f, map_lng: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Current Location Label</label>
                      <input type="text" placeholder="e.g. New York, NY — Delivered"
                        value={locationForm.current_location}
                        onChange={e => setLocationForm(f => ({ ...f, current_location: e.target.value }))} />
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn-admin-secondary"
                        onClick={() => { setMapPickerTarget('location'); setShowMapPicker(true); }}>
                        <i className="fa-solid fa-map"></i> Pick on Map
                      </button>
                      <button type="submit" className="btn-admin-primary" disabled={saving}>
                        {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> Update Location</>}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ADD TRACKING EVENT */}
                <div className="admin-card">
                  <h3><i className="fa-solid fa-timeline"></i> Add Tracking Event</h3>
                  <form onSubmit={handleAddEvent} className="event-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Status</label>
                        <input type="text" placeholder="e.g. Arrived at FedEx hub"
                          value={eventForm.status} required
                          onChange={e => setEventForm(f => ({ ...f, status: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Location</label>
                        <input type="text" placeholder="e.g. Memphis, TN"
                          value={eventForm.location} required
                          onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date & Time</label>
                        <input type="datetime-local"
                          value={eventForm.event_time}
                          onChange={e => setEventForm(f => ({ ...f, event_time: e.target.value }))} />
                      </div>
                      <div className="form-group form-group-check">
                        <label>
                          <input type="checkbox" checked={eventForm.is_latest}
                            onChange={e => setEventForm(f => ({ ...f, is_latest: e.target.checked }))} />
                          &nbsp; Mark as latest event
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="btn-admin-primary" disabled={saving}>
                      {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Adding...</> : <><i className="fa-solid fa-plus"></i> Add Event</>}
                    </button>
                  </form>
                </div>

                {/* EVENTS LIST */}
                <div className="admin-card">
                  <h3><i className="fa-solid fa-list"></i> Tracking History ({shipmentDetail.events?.length || 0} events)</h3>
                  {shipmentDetail.events?.length === 0 ? (
                    <p className="admin-empty-small">No events yet.</p>
                  ) : (
                    <div className="events-list">
                      {shipmentDetail.events.map(evt => (
                        <div key={evt.id} className={`event-row ${evt.is_latest ? 'latest' : ''}`}>
                          <div className="event-dot"></div>
                          <div className="event-info">
                            <div className="event-status">{evt.status} {evt.is_latest && <span className="latest-tag">LATEST</span>}</div>
                            <div className="event-meta">
                              <i className="fa-solid fa-location-dot"></i> {evt.location} &nbsp;·&nbsp;
                              <i className="fa-solid fa-clock"></i> {new Date(evt.event_time).toLocaleString()}
                            </div>
                          </div>
                          <button className="btn-icon btn-delete" onClick={() => handleDeleteEvent(evt.id)}>
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

        {/* ===== CREATE / EDIT SHIPMENT ===== */}
        {activeTab === 'create' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h1>
                <i className={`fa-solid ${editingShipment ? 'fa-pen' : 'fa-plus'}`}></i>
                {editingShipment ? `Edit: ${editingShipment.tracking_number}` : 'New Shipment'}
              </h1>
            </div>
            <div className="admin-card">
              <form onSubmit={handleSaveShipment} className="shipment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tracking Number *</label>
                    <input type="text" placeholder="e.g. FX123456789US"
                      value={form.tracking_number} required
                      disabled={!!editingShipment}
                      onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="form-group">
                    <label>Service *</label>
                    <input type="text" placeholder="e.g. FedEx Express"
                      value={form.service} required
                      onChange={e => setForm(f => ({ ...f, service: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status *</label>
                    <select value={form.status} onChange={e => handleStatusChange(e.target.value)}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Progress Step (0–4)</label>
                    <input type="number" min="0" max="4"
                      value={form.progress_step}
                      onChange={e => setForm(f => ({ ...f, progress_step: parseInt(e.target.value) }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Origin *</label>
                    <input type="text" placeholder="e.g. Los Angeles, CA"
                      value={form.origin} required
                      onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Destination *</label>
                    <input type="text" placeholder="e.g. New York, NY 10001"
                      value={form.destination} required
                      onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Current Location *</label>
                  <input type="text" placeholder="e.g. Memphis, TN — FedEx Hub"
                    value={form.current_location} required
                    onChange={e => setForm(f => ({ ...f, current_location: e.target.value }))} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Weight</label>
                    <input type="text" placeholder="e.g. 2.4 lbs"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Estimated Delivery</label>
                    <input type="text" placeholder="e.g. September 18, 2026"
                      value={form.estimated_delivery}
                      onChange={e => setForm(f => ({ ...f, estimated_delivery: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Delivered At (if delivered)</label>
                    <input type="datetime-local"
                      value={form.delivered_at || ''}
                      onChange={e => setForm(f => ({ ...f, delivered_at: e.target.value || null }))} />
                  </div>
                  <div className="form-group">
                    <label>Recipient</label>
                    <input type="text" placeholder="e.g. J. Mitchell"
                      value={form.recipient}
                      onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Map Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 40.7128"
                      value={form.map_lat}
                      onChange={e => setForm(f => ({ ...f, map_lat: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Map Longitude</label>
                    <input type="number" step="any" placeholder="e.g. -74.0060"
                      value={form.map_lng}
                      onChange={e => setForm(f => ({ ...f, map_lng: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <button type="button" className="btn-admin-secondary"
                    onClick={() => { setMapPickerTarget('form'); setShowMapPicker(true); }}>
                    <i className="fa-solid fa-map"></i> Pick Location on Map
                  </button>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-admin-secondary"
                    onClick={() => { setActiveTab('shipments'); setEditingShipment(null); setForm(EMPTY_SHIPMENT); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-admin-primary" disabled={saving}>
                    {saving
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                      : <><i className="fa-solid fa-floppy-disk"></i> {editingShipment ? 'Update Shipment' : 'Create Shipment'}</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* MAP PICKER MODAL */}
      {showMapPicker && (
        <AdminMapPicker
          initialLat={mapPickerTarget === 'form' ? form.map_lat : locationForm.map_lat}
          initialLng={mapPickerTarget === 'form' ? form.map_lng : locationForm.map_lng}
          onConfirm={handleMapPick}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
