/**
 * BreedingPanel — breeding records for a patient.
 *
 * Shows existing breeding records and allows creating new ones.
 * Clients can add breeding info but not veterinary conclusions.
 * Doctors can add veterinary observations.
 */

import { useState } from 'react';
import { Heart, Plus, CalendarDays, Activity, Check } from 'lucide-react';
import { db } from '@/lib/db';

interface BreedingPanelProps {
  patientId: string;
  patientName: string;
  species: string;
  breedingEligible: boolean;
  role: 'client' | 'doctor' | 'admin' | 'frontdesk';
}

export function BreedingPanel({ patientId, patientName, species, breedingEligible, role }: BreedingPanelProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    partnerDetails: '',
    breedingDate: '',
    expectedDate: '',
    notes: '',
    veterinaryObservations: '',
  });

  if (!breedingEligible) {
    return (
      <div className="breeding-panel">
        <div className="breeding-header">
          <Heart size={18} />
          <h3>Breeding</h3>
        </div>
        <p className="breeding-not-eligible">
          Breeding tracking is not enabled for {patientName}.
          {role === 'client' && ' You can enable it when registering or editing this animal.'}
        </p>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!form.partnerDetails.trim() && !form.breedingDate) return;

    const newRecord = {
      patientId,
      partner_details: form.partnerDetails,
      breeding_date: form.breedingDate || null,
      expected_date: form.expectedDate || null,
      notes: form.notes,
      veterinary_observations: role === 'doctor' || role === 'admin' ? form.veterinaryObservations : null,
      status: form.expectedDate ? 'Active' : 'Planned',
    };

    const created = await db.createBreedingRecord(newRecord);
    if (created) {
      await db.logAction('breeding_record_created', 'breeding', patientId, newRecord);
    }

    setRecords([...records, {
      id: created?.id ?? `br_${Date.now()}`,
      patientId,
      partnerPatientId: null,
      partnerDetails: form.partnerDetails,
      breedingDate: form.breedingDate,
      expectedDate: form.expectedDate,
      numberOfOffspring: null,
      breedingOutcome: null,
      veterinaryObservations: form.veterinaryObservations || null,
      notes: form.notes,
      status: form.expectedDate ? 'Active' : 'Planned',
    }]);

    setForm({ partnerDetails: '', breedingDate: '', expectedDate: '', notes: '', veterinaryObservations: '' });
    setShowForm(false);
  };

  return (
    <div className="breeding-panel">
      <div className="breeding-header">
        <Heart size={18} />
        <h3>Breeding Records</h3>
        {!showForm && (
          <button className="link" onClick={() => setShowForm(true)}><Plus size={14} /> Add Record</button>
        )}
      </div>

      {showForm && (
        <div className="breeding-form">
          <div className="form-grid">
            <label>Partner Details<input value={form.partnerDetails} onChange={(e) => setForm({ ...form, partnerDetails: e.target.value })} placeholder="Partner animal name, breed, or owner" /></label>
            <label>Breeding Date<input type="date" value={form.breedingDate} onChange={(e) => setForm({ ...form, breedingDate: e.target.value })} /></label>
            <label>Expected Date (if pregnant)<input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></label>
            {(role === 'doctor' || role === 'admin') && (
              <label className="wide">Veterinary Observations<textarea value={form.veterinaryObservations} onChange={(e) => setForm({ ...form, veterinaryObservations: e.target.value })} placeholder="Clinical observations (doctors only)" /></label>
            )}
            <label className="wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional breeding notes" /></label>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="primary" onClick={handleAdd}><Check size={14} /> Save Record</button>
          </div>
        </div>
      )}

      {records.length === 0 && !showForm ? (
        <p className="empty-hint">No breeding records yet. Click "Add Record" to create one.</p>
      ) : (
        <div className="breeding-list">
          {records.map((r) => (
            <div className="breeding-card" key={r.id}>
              <div className="breeding-card-head">
                <span className={`status ${r.status.toLowerCase()}`}>{r.status.toUpperCase()}</span>
                {r.breedingDate && <small><CalendarDays size={12} /> Bred: {r.breedingDate}</small>}
                {r.expectedDate && <small><Activity size={12} /> Expected: {r.expectedDate}</small>}
              </div>
              {r.partnerDetails && <p><strong>Partner:</strong> {r.partnerDetails}</p>}
              {r.notes && <p className="muted-text">{r.notes}</p>}
              {r.veterinaryObservations && (
                <div className="vet-observation">
                  <strong>Veterinary Observations:</strong>
                  <p>{r.veterinaryObservations}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
