/**
 * VaccinationPanel — vaccination tracking for the patient profile.
 * Doctors and admins can add vaccination records; clients view only.
 * Displays chronological history with due-date status calculations.
 */

import { useState, useEffect, useCallback } from 'react';
import { Syringe, Plus, Loader2, Check, Clock, AlertCircle, Calendar } from 'lucide-react';
import { fetchVaccinationsByPatient, insertVaccination } from '@/lib/queries';

interface Props {
  patientId: string;
  clientId: string;
  role: 'doctor' | 'admin';
  onSaved: () => void;
}

const VACCINE_CATEGORIES = ['Core', 'Non-Core', 'Rabies', 'Bordetella', 'Leptospirosis', 'Lyme', 'Canine Influenza', 'Feline Leukemia', 'Other'];
const ROUTES = ['Subcutaneous', 'Intramuscular', 'Intranasal', 'Oral', 'Topical', 'Other'];

function calcStatus(nextDueDate: string | null): { label: string; cls: string; icon: typeof Check } {
  if (!nextDueDate) return { label: 'NO DUE DATE', cls: 'pending', icon: Clock };
  const due = new Date(nextDueDate);
  const now = new Date();
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) return { label: 'OVERDUE', cls: 'overdue', icon: AlertCircle };
  if (daysUntilDue <= 30) return { label: 'DUE SOON', cls: 'pending', icon: Clock };
  return { label: 'COMPLETED', cls: 'confirmed', icon: Check };
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function VaccinationPanel({ patientId, clientId, role, onSaved }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vaccineName, setVaccineName] = useState('');
  const [vaccineCategory, setVaccineCategory] = useState('Core');
  const [manufacturer, setManufacturer] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('Subcutaneous');
  const [vaccinationDate, setVaccinationDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');
  const [administeringVet, setAdministeringVet] = useState('');
  const [notes, setNotes] = useState('');

  const canAdd = role === 'doctor' || role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchVaccinationsByPatient(patientId);
    if (err) { setError(err); }
    else if (data) setRecords(data);
    else setRecords([]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!vaccineName.trim()) { setError('Vaccine name is required'); return; }
    if (!vaccinationDate) { setError('Vaccination date is required'); return; }
    setSaving(true); setError(null);
    const { error: err } = await insertVaccination({
      patientId,
      clientId,
      vaccineName: vaccineName.trim(),
      vaccineCategory,
      manufacturer: manufacturer.trim() || undefined,
      batchNumber: batchNumber.trim() || undefined,
      dosage: dosage.trim() || undefined,
      route,
      vaccinationDate,
      nextDueDate: nextDueDate || undefined,
      administeringVet: administeringVet.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (err) { setError(err); return; }
    setAdding(false);
    setVaccineName(''); setManufacturer(''); setBatchNumber(''); setDosage('');
    setNextDueDate(''); setAdministeringVet(''); setNotes('');
    setVaccinationDate(new Date().toISOString().split('T')[0]);
    load();
    onSaved();
  };

  if (loading) {
    return <div className="empty-state"><Loader2 size={20} className="spin" /><p>Loading vaccinations...</p></div>;
  }

  const overdueCount = records.filter((r) => r.next_due_date && calcStatus(r.next_due_date).cls === 'overdue').length;
  const dueSoonCount = records.filter((r) => r.next_due_date && calcStatus(r.next_due_date).cls === 'pending').length;

  return (
    <div className="vaccination-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Syringe size={16} /> Vaccination History
        </h4>
        {canAdd && !adding && (
          <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setAdding(true)}>
            <Plus size={14} /> Add Vaccination
          </button>
        )}
      </div>

      {records.length > 0 && (
        <div className="stats-row four" style={{ marginBottom: '14px' }}>
          <div className="stat"><strong>{records.length}</strong><span>Total Vaccinations</span></div>
          <div className="stat green"><strong>{records.filter((r) => r.next_due_date && calcStatus(r.next_due_date).cls === 'confirmed').length}</strong><span>Up to Date</span></div>
          <div className="stat orange"><strong>{dueSoonCount}</strong><span>Due Soon (30d)</span></div>
          <div className="stat red"><strong>{overdueCount}</strong><span>Overdue</span></div>
        </div>
      )}

      {adding && (
        <div className="breeding-form" style={{ marginBottom: '14px' }}>
          <div className="form-grid">
            <label>Vaccine Name *
              <input value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} placeholder="e.g. Rabies Vaccine" />
            </label>
            <label>Category
              <select value={vaccineCategory} onChange={(e) => setVaccineCategory(e.target.value)}>
                {VACCINE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Manufacturer
              <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="e.g. BioCan" />
            </label>
            <label>Batch Number
              <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Batch / lot number" />
            </label>
            <label>Dosage
              <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g. 1 ml" />
            </label>
            <label>Route
              <select value={route} onChange={(e) => setRoute(e.target.value)}>
                {ROUTES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>Vaccination Date *
              <input type="date" value={vaccinationDate} onChange={(e) => setVaccinationDate(e.target.value)} />
            </label>
            <label>Next Due Date
              <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </label>
            <label className="wide">Administering Veterinarian
              <input value={administeringVet} onChange={(e) => setAdministeringVet(e.target.value)} placeholder="Vet name" />
            </label>
            <label className="wide">Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinical notes" />
            </label>
          </div>
          {error && <p style={{ color: '#e73535', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Save Vaccination
            </button>
            <button className="secondary" onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {records.length === 0 && !adding ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <Syringe size={32} />
          <h3>No vaccinations recorded</h3>
          <p>{canAdd ? 'Click "Add Vaccination" to record the first vaccine.' : 'Vaccination records will appear here once recorded by your veterinarian.'}</p>
        </div>
      ) : (
        <div className="records-tab">
          {records.map((r, i) => {
            const st = calcStatus(r.next_due_date);
            return (
              <div className="record-card" key={r.id ?? r.vaccination_id ?? i}>
                <div className="record-pet">
                  <div className="pet-icon"><Syringe size={16} /></div>
                  <div>
                    <strong>{r.vaccine_name}</strong>
                    <small>{r.vaccine_category ?? '—'} · {formatDate(r.vaccination_date)}</small>
                  </div>
                  <em className={`status ${st.cls}`} style={{ marginLeft: 'auto' }}>
                    <st.icon size={10} /> {st.label}
                  </em>
                </div>
                <div className="record-grid">
                  <div><label>VACCINE</label><strong>{r.vaccine_name}</strong></div>
                  <div><label>CATEGORY</label><strong>{r.vaccine_category ?? '—'}</strong></div>
                  <div><label>VACCINATED ON</label><strong>{formatDate(r.vaccination_date)}</strong></div>
                  <div><label>NEXT DUE</label><strong>{r.next_due_date ? formatDate(r.next_due_date) : 'Not scheduled'}</strong></div>
                  {r.manufacturer && <div><label>MANUFACTURER</label><strong>{r.manufacturer}</strong></div>}
                  {r.batch_number && <div><label>BATCH</label><strong>{r.batch_number}</strong></div>}
                  {r.dosage && <div><label>DOSAGE</label><strong>{r.dosage}</strong></div>}
                  {r.route && <div><label>ROUTE</label><strong>{r.route}</strong></div>}
                  {r.administering_vet && <div><label>VETERINARIAN</label><strong>{r.administering_vet}</strong></div>}
                  {r.notes && <div className="wide"><label>NOTES</label><strong>{r.notes}</strong></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
