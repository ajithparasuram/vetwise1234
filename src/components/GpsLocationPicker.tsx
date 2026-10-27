/**
 * GpsLocationPicker — lets clients capture GPS or enter address manually.
 *
 * Features:
 * - "Use My Current Location" button using navigator.geolocation
 * - Reverse geocode via free Nominatim OpenStreetMap API (no key needed)
 * - Manual address entry fallback
 * - Editable address fields after geocoding
 */

import { useState } from 'react';
import { MapPin, LocateFixed, Loader2, Check, Trash2, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { checkServiceability } from '@/lib/queries';

interface SavedLocation {
  id: string;
  clientId: string;
  label: string;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  addressLine: string | null;
  locality: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  isPrimary: boolean;
}

export function GpsLocationPicker({ clientId }: { clientId: string }) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);
  const [form, setForm] = useState({
    label: 'Home',
    latitude: '' as string,
    longitude: '' as string,
    locationAccuracy: '' as string,
    addressLine: '',
    locality: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
  });
  const [error, setError] = useState('');
  const [serviceStatus, setServiceStatus] = useState<{ status: string; message: string } | null>(null);
  const [checkingService, setCheckingService] = useState(false);

  const useCurrentLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device.');
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          locationAccuracy: position.coords.accuracy ? position.coords.accuracy.toFixed(0) : '',
        }));
        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            setForm((prev) => ({
              ...prev,
              addressLine: [addr.house_number, addr.road].filter(Boolean).join(' ') || data.display_name?.split(',')[0] || '',
              locality: addr.suburb || addr.neighbourhood || '',
              city: addr.city || addr.town || addr.village || '',
              district: addr.county || addr.state_district || '',
              state: addr.state || '',
              pincode: addr.postcode || '',
            }));
          }
        } catch {
          // Geocoding is best-effort; user can fill in manually
        }
        setGettingGps(false);
        if (position.coords.latitude && position.coords.longitude) {
          setCheckingService(true);
          const { data: svc } = await checkServiceability(position.coords.latitude, position.coords.longitude);
          if (svc) setServiceStatus({ status: (svc as any).status, message: (svc as any).message });
          setCheckingService(false);
        }
      },
      (err) => {
        setGettingGps(false);
        setError(err.message || 'Unable to get your location. Please enter the address manually.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleSave = async () => {
    if (!form.addressLine.trim() && !form.latitude) {
      setError('Please use GPS or enter an address.');
      return;
    }
    setError('');

    const locData = {
      client_id: clientId,
      label: form.label,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      location_accuracy: form.locationAccuracy ? parseFloat(form.locationAccuracy) : null,
      address_line: form.addressLine || null,
      locality: form.locality || null,
      city: form.city || null,
      district: form.district || null,
      state: form.state || null,
      pincode: form.pincode || null,
      is_primary: locations.length === 0,
    };

    const created = await db.createLocation(locData);
    if (created) {
      await db.logAction('location_update', 'client', clientId, { label: form.label });
    }

    const newLoc: SavedLocation = {
      id: created?.id ?? `loc_${Date.now()}`,
      clientId,
      label: form.label,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      locationAccuracy: form.locationAccuracy ? parseFloat(form.locationAccuracy) : null,
      addressLine: form.addressLine || null,
      locality: form.locality || null,
      city: form.city || null,
      district: form.district || null,
      state: form.state || null,
      pincode: form.pincode || null,
      isPrimary: locations.length === 0,
    };

    setLocations([...locations, newLoc]);
    setForm({ label: 'Home', latitude: '', longitude: '', locationAccuracy: '', addressLine: '', locality: '', city: '', district: '', state: '', pincode: '' });
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await db.deleteLocation(id);
    setLocations(locations.filter((l) => l.id !== id));
  };

  return (
    <div className="gps-panel">
      <div className="gps-header">
        <MapPin size={18} />
        <h3>Service Locations</h3>
        {!showForm && <button className="link" onClick={() => setShowForm(true)}><Plus size={14} /> Add Location</button>}
      </div>

      {showForm && (
        <div className="location-form">
          {error && <p className="login-error">{error}</p>}
          <div className="gps-actions">
            <button className="gps-btn" onClick={useCurrentLocation} disabled={gettingGps}>
              {gettingGps ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />}
              {gettingGps ? 'Getting location...' : 'Use My Current Location'}
            </button>
          </div>

          <div className="form-grid">
            <label>Location Label<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Home, Work, Farm" /></label>
            <label>Latitude<input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="Auto-filled from GPS" readOnly={!!form.latitude} /></label>
            <label>Longitude<input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="Auto-filled from GPS" readOnly={!!form.longitude} /></label>
            <label>Pincode<input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="6-digit pincode" /></label>
            <label className="wide">Address Line<input value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} placeholder="House number, street, area" /></label>
            <label>Locality<input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="Neighbourhood / area" /></label>
            <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" /></label>
            <label>District<input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="District" /></label>
            <label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" /></label>
          </div>

          <div className="modal-actions">
            <button className="secondary" onClick={() => { setShowForm(false); setError(''); }}>Cancel</button>
            <button className="primary" onClick={handleSave}><Check size={16} /> Save Location</button>
          </div>
        </div>
      )}

      {serviceStatus && (
        <div className={`service-banner ${serviceStatus.status}`} style={{ margin: '10px 0', padding: '10px 14px', borderRadius: 8, fontSize: '13px', background: serviceStatus.status === 'available' ? '#e8f5e9' : serviceStatus.status === 'coming_soon' ? '#fff3e0' : '#fce4ec', border: `1px solid ${serviceStatus.status === 'available' ? '#a5d6a7' : serviceStatus.status === 'coming_soon' ? '#ffcc80' : '#f48fb1'}` }}>
          <MapPin size={14} /> {serviceStatus.message}
        </div>
      )}
      {checkingService && <p style={{ fontSize: '12px', color: '#8896a8' }}><Loader2 size={12} className="spin" /> Checking service availability...</p>}

      {locations.length === 0 && !showForm ? (
        <p className="empty-hint">No saved locations. Click "Add Location" to save a service address.</p>
      ) : (
        <div className="location-list">
          {locations.map((loc) => (
            <div className="location-card" key={loc.id}>
              <div className="location-card-head">
                <div className="location-label">
                  <MapPin size={15} />
                  <strong>{loc.label}</strong>
                  {loc.isPrimary && <span className="primary-badge">Primary</span>}
                </div>
                <button className="icon-btn-sm" onClick={() => handleDelete(loc.id)}><Trash2 size={13} /></button>
              </div>
              <div className="location-card-body">
                <p>{loc.addressLine}</p>
                <small>{[loc.locality, loc.city, loc.state, loc.pincode].filter(Boolean).join(', ')}</small>
                {loc.latitude && loc.longitude && (
                  <small className="coords">GPS: {loc.latitude}, {loc.longitude}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
