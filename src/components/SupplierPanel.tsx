/**
 * SupplierPanel — supplier management for inventory.
 * Admins can add/edit suppliers; doctors and front desk can view.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Truck, Plus, Loader2, Check, X, Search, MapPin, Phone, Mail, FileText } from 'lucide-react';
import { fetchSuppliers, insertSupplier, updateSupplier } from '@/lib/queries';

interface Props {
  role: 'admin' | 'doctor' | 'frontdesk';
}

export function SupplierPanel({ role }: Props) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  const canManage = role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchSuppliers();
    if (err) { setError(err); }
    else if (data) setSuppliers(data);
    else setSuppliers([]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((s) =>
      (s.name ?? '').toLowerCase().includes(q) ||
      (s.contact_person ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q) ||
      (s.phone ?? '').includes(q) ||
      (s.gstin ?? '').toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const resetForm = () => {
    setName(''); setContactPerson(''); setEmail(''); setPhone('');
    setAddress(''); setGstin(''); setStatus('active'); setNotes('');
    setError(null);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Supplier name is required'); return; }
    setSaving(true); setError(null);
    if (editing) {
      const { error: err } = await updateSupplier(editing, {
        name: name.trim(),
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        gstin: gstin || null,
        status,
        notes: notes || null,
      });
      setSaving(false);
      if (err) { setError(err); return; }
    } else {
      const { error: err } = await insertSupplier({
        name: name.trim(),
        contactPerson: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        gstin: gstin || undefined,
        status,
        notes: notes || undefined,
      });
      setSaving(false);
      if (err) { setError(err); return; }
    }
    setAdding(false); setEditing(null);
    resetForm();
    load();
  };

  const startEdit = (s: any) => {
    setEditing(s.id);
    setAdding(true);
    setName(s.name ?? '');
    setContactPerson(s.contact_person ?? '');
    setEmail(s.email ?? '');
    setPhone(s.phone ?? '');
    setAddress(s.address ?? '');
    setGstin(s.gstin ?? '');
    setStatus(s.status ?? 'active');
    setNotes(s.notes ?? '');
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedId);

  if (loading) {
    return <div className="empty-state"><Loader2 size={24} className="spin" /><p>Loading suppliers...</p></div>;
  }

  return (
    <div className="supplier-panel">
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="searchbar" style={{ flex: 1, minWidth: '200px' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." />
        </div>
        {canManage && !adding && (
          <button className="primary" onClick={() => { setAdding(true); setEditing(null); resetForm(); }}>
            <Plus size={16} /> Add Supplier
          </button>
        )}
      </div>

      {adding && (
        <div className="breeding-form" style={{ marginBottom: '14px' }}>
          <h4 style={{ margin: '0 0 12px', fontFamily: 'Manrope', fontSize: '14px', color: '#132f65' }}>
            {editing ? 'Edit Supplier' : 'New Supplier'}
          </h4>
          <div className="form-grid">
            <label>Supplier Name *
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier / vendor name" />
            </label>
            <label>Contact Person
              <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Contact person" />
            </label>
            <label>Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@example.com" />
            </label>
            <label>Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
            </label>
            <label className="wide">Address
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            </label>
            <label>GSTIN
              <input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </label>
            <label>Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="wide">Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Supplier notes" />
            </label>
          </div>
          {error && <p style={{ color: '#e73535', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />} {editing ? 'Update' : 'Create'} Supplier
            </button>
            <button className="secondary" onClick={() => { setAdding(false); setEditing(null); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      {selectedSupplier && (
        <div className="supplier-detail" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={16} /> {selectedSupplier.name}
            </h4>
            <button className="secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setSelectedId(null)}>
              <X size={14} /> Close
            </button>
          </div>
          <div className="info-grid">
            <div><label>SUPPLIER ID</label><strong>{selectedSupplier.supplier_id ?? '—'}</strong></div>
            <div><label>CONTACT PERSON</label><strong>{selectedSupplier.contact_person ?? '—'}</strong></div>
            <div><label>EMAIL</label><strong>{selectedSupplier.email ?? '—'}</strong></div>
            <div><label>PHONE</label><strong>{selectedSupplier.phone ?? '—'}</strong></div>
            <div className="wide"><label>ADDRESS</label><strong>{selectedSupplier.address ?? '—'}</strong></div>
            <div><label>GSTIN</label><strong>{selectedSupplier.gstin ?? '—'}</strong></div>
            <div><label>STATUS</label><strong><em className={`status ${selectedSupplier.status === 'active' ? 'confirmed' : 'pending'}`}>{(selectedSupplier.status ?? 'active').toUpperCase()}</em></strong></div>
            {selectedSupplier.notes && <div className="wide"><label>NOTES</label><strong>{selectedSupplier.notes}</strong></div>}
          </div>
        </div>
      )}

      {filtered.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <Truck size={32} />
          <h3>No suppliers found</h3>
          <p>{canManage ? 'Click "Add Supplier" to create your first supplier record.' : 'Supplier records will appear here once they are added.'}</p>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr .8fr .8fr' }}>
            <span>SUPPLIER</span><span>CONTACT</span><span>EMAIL</span><span>PHONE</span><span>STATUS</span><span></span>
          </div>
          {filtered.map((s) => (
            <div className="table-row" key={s.id} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr .8fr .8fr' }}>
              <div><strong>{s.name}</strong>{s.supplier_id && <small>{s.supplier_id}</small>}</div>
              <div><span>{s.contact_person ?? '—'}</span></div>
              <div><span>{s.email ?? '—'}</span></div>
              <div><span>{s.phone ?? '—'}</span></div>
              <div><span className={`status ${s.status === 'active' ? 'confirmed' : 'pending'}`}>{(s.status ?? 'active').toUpperCase()}</span></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="link" onClick={() => setSelectedId(s.id)}>View</button>
                {canManage && <button className="link" onClick={() => startEdit(s)}>Edit</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
