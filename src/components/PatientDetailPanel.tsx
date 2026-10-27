/**
 * PatientDetailPanel — comprehensive patient profile with 8 tabs.
 *
 * Tabs: Overview, Medical History, Clinical Records, Appointments,
 * Prescriptions, Weight Tracking, Billing, Photos.
 * All data comes from real API queries — no hardcoded medical data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PawPrint, X, MapPin, Phone, FileText, Heart, ClipboardList,
  Clock3, ImageIcon, AlertCircle, Loader2, CalendarDays,
  TrendingUp, DollarSign, Plus, Scale, Activity, Syringe,
  Upload, Trash2, Camera, FlaskConical,
} from 'lucide-react';
import { BreedingPanel } from './BreedingPanel';
import { LabResultsPanel } from './LabResultsPanel';
import { VaccinationPanel } from './VaccinationPanel';
import { PrescriptionWriterModal } from './PrescriptionWriterModal';
import { AppointmentBookingModal } from './AppointmentBookingModal';
import { InvoiceModal } from './InvoiceModal';
import {
  fetchPatients, fetchClients, fetchClinicalRecordsByPatient,
  fetchPrescriptions, fetchAppointmentsByPatient, fetchPaymentsByPatient,
  fetchWeightRecords, insertWeightRecord,
  fetchPatientPhotos, uploadPatientPhoto, deletePatientPhoto,
  fetchInvoicesByPatient,
} from '@/lib/queries';

type TabKey = 'overview' | 'medical' | 'records' | 'appointments' | 'prescriptions' | 'weight' | 'billing' | 'photos' | 'labs' | 'vaccinations';

interface PatientDetailPanelProps {
  patientId: string;
  role: 'doctor' | 'admin';
  onClose: () => void;
}

function parseWeightValue(weightStr: string | null | undefined): number | null {
  if (!weightStr) return null;
  const match = String(weightStr).match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export function PatientDetailPanel({ patientId, role, onClose }: PatientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [patient, setPatient] = useState<any | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [clinicalRecords, setClinicalRecords] = useState<any[]>([]);
  const [rxRecords, setRxRecords] = useState<any[]>([]);
  const [apptRecords, setApptRecords] = useState<any[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<any[]>([]);
  const [weightRecords, setWeightRecords] = useState<any[]>([]);
  const [photoRecords, setPhotoRecords] = useState<any[]>([]);
  const [invoiceRecords, setInvoiceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  const loadAll = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    const [patRes, cliRes, clinRes, rxRes, apptRes, payRes, wtRes, photoRes, invRes] = await Promise.all([
      fetchPatients(),
      fetchClients(),
      fetchClinicalRecordsByPatient(patientId),
      fetchPrescriptions(),
      fetchAppointmentsByPatient(patientId),
      fetchPaymentsByPatient(patientId),
      fetchWeightRecords(patientId),
      fetchPatientPhotos(patientId),
      fetchInvoicesByPatient(patientId),
    ]);
    const p = (patRes.data as any[])?.find((x) => (x.petId ?? x.patientId) === patientId);
    if (p) setPatient(p);
    const c = (cliRes.data as any[])?.find((x) => x.ownerId === p?.ownerId);
    if (c) setClient(c);
    if (clinRes.data) setClinicalRecords(clinRes.data as any[]);
    if (rxRes.data) setRxRecords((rxRes.data as any[]).filter((r: any) => (r.petId ?? r.patientId) === patientId));
    if (apptRes.data) setApptRecords(apptRes.data as any[]);
    if (payRes.data) setPaymentRecords(payRes.data as any[]);
    if (wtRes.data) setWeightRecords(wtRes.data as any[]);
    else setWeightRecords([]);
    if (photoRes.data) setPhotoRecords(photoRes.data as any[]);
    else setPhotoRecords([]);
    if (invRes.data) setInvoiceRecords(invRes.data as any[]);
    else setInvoiceRecords([]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <div className="patient-detail-panel">
        <div className="detail-head">
          <div className="empty-state"><Loader2 size={24} className="spin" /><p>Loading patient...</p></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="patient-detail-panel">
        <div className="detail-head">
          <div className="empty-state"><PawPrint size={36} /><h3>Patient not found</h3><p>This patient may not exist or you may not have access.</p></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
    );
  }

  const name = patient.name ?? 'Unknown';
  const species = patient.species === 'Other' ? (patient.customSpecies ?? 'Other') : (patient.species ?? 'Unknown');
  const breed = patient.breed ?? 'Not recorded';
  const pid = patient.petId ?? patient.patientId ?? patientId;
  const ownerName = client?.name ?? client?.fullName ?? 'Unknown';

  const tabs: { key: TabKey; label: string; icon: typeof PawPrint }[] = [
    { key: 'overview', label: 'Overview', icon: PawPrint },
    { key: 'medical', label: 'Medical History', icon: Heart },
    { key: 'records', label: 'Clinical Records', icon: FileText },
    { key: 'appointments', label: 'Appointments', icon: CalendarDays },
    { key: 'prescriptions', label: 'Prescriptions', icon: ClipboardList },
    { key: 'weight', label: 'Weight Tracking', icon: Scale },
    { key: 'billing', label: 'Billing', icon: DollarSign },
    { key: 'photos', label: 'Photos', icon: ImageIcon },
    { key: 'labs', label: 'Lab Results', icon: FlaskConical },
    { key: 'vaccinations', label: 'Vaccinations', icon: Syringe },
  ];

  return (
    <div className="patient-detail-panel">
      <div className="detail-head">
        <div className="pet-icon large"><PawPrint size={24} /></div>
        <div className="detail-title">
          <h2>{name}</h2>
          <p>
            <span className="pid-badge">{pid}</span>
            <em className={`tag ${patient.species?.toLowerCase()}`}>{species}</em>
            <span className="muted">{breed}{patient.color ? ` · ${patient.color}` : ''}</span>
          </p>
          <p className="owner-line">
            <small>Owner: <strong>{ownerName}</strong></small>
            {client && <small className="cid-badge">{client.ownerId ?? client.clientId ?? ''}</small>}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="patient-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={activeTab === t.key ? 'active' : ''} onClick={() => setActiveTab(t.key)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="patient-detail-body">
        {activeTab === 'overview' && <OverviewTab patient={patient} client={client} apptRecords={apptRecords} weightRecords={weightRecords} invoiceRecords={invoiceRecords} />}
        {activeTab === 'medical' && <MedicalTab patient={patient} role={role} />}
        {activeTab === 'records' && <RecordsTab records={clinicalRecords} />}
        {activeTab === 'appointments' && <AppointmentsTab records={apptRecords} role={role} onBook={() => setShowApptModal(true)} />}
        {activeTab === 'prescriptions' && <PrescriptionsTab records={rxRecords} role={role} onCreate={() => setShowRxModal(true)} />}
        {activeTab === 'weight' && <WeightTab patientId={pid} records={weightRecords} role={role} onSaved={loadAll} />}
        {activeTab === 'billing' && <BillingTab records={paymentRecords} invoiceRecords={invoiceRecords} role={role} onCreate={() => setShowInvoiceModal(true)} onViewInvoice={(inv) => { setViewingInvoice(inv); setShowInvoiceModal(true); }} />}
        {activeTab === 'photos' && <PhotosTab patientId={pid} photos={photoRecords} onSaved={loadAll} />}
        {activeTab === 'labs' && <LabResultsPanel patientId={pid} clientId={client?.ownerId ?? client?.clientId ?? ''} role={role} onSaved={loadAll} />}
        {activeTab === 'vaccinations' && <VaccinationPanel patientId={pid} clientId={client?.ownerId ?? client?.clientId ?? ''} role={role} onSaved={loadAll} />}
      </div>

      {showRxModal && client && (
        <PrescriptionWriterModal
          patientId={pid}
          clientId={client.ownerId ?? client.clientId ?? ''}
          patientName={name}
          clientName={ownerName}
          doctorName={role === 'doctor' ? 'Dr. ' + (client?.name ?? '') : 'Attending Veterinarian'}
          onClose={() => setShowRxModal(false)}
          onSaved={loadAll}
        />
      )}
      {showApptModal && client && (
        <AppointmentBookingModal
          patientId={pid}
          clientId={client.ownerId ?? client.clientId ?? ''}
          patientName={name}
          clientName={ownerName}
          role={role}
          onClose={() => setShowApptModal(false)}
          onBooked={loadAll}
        />
      )}
      {showInvoiceModal && client && (
        <InvoiceModal
          clientId={client.ownerId ?? client.clientId ?? ''}
          patientId={pid}
          patientName={name}
          clientName={ownerName}
          invoice={viewingInvoice}
          mode={viewingInvoice ? 'view' : 'create'}
          onClose={() => { setShowInvoiceModal(false); setViewingInvoice(null); }}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}

// ---- Overview Tab ----

function OverviewTab({ patient, client, apptRecords, weightRecords, invoiceRecords }: {
  patient: any; client: any; apptRecords: any[]; weightRecords: any[]; invoiceRecords: any[];
}) {
  const upcoming = apptRecords.filter((a) => {
    const d = new Date(a.preferredDate ?? a.date ?? '');
    return d >= new Date(new Date().toDateString());
  });
  const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null;

  return (
    <div className="overview-tab">
      <div className="info-grid">
        <div><label>PATIENT ID</label><strong className="pid-text">{patient.petId ?? patient.patientId}</strong></div>
        <div><label>SPECIES</label><strong>{patient.species === 'Other' ? patient.customSpecies ?? 'Other' : patient.species}</strong></div>
        <div><label>BREED</label><strong>{patient.breed ?? 'Not recorded'}</strong></div>
        <div><label>SEX</label><strong>{patient.sex ?? 'Not recorded'}</strong></div>
        <div><label>AGE</label><strong>{patient.estimatedAge ?? patient.age ?? 'Not recorded'}</strong></div>
        <div><label>DATE OF BIRTH</label><strong>{patient.dateOfBirth ? formatDisplayDate(patient.dateOfBirth) : 'Not recorded'}</strong></div>
        <div><label>CURRENT WEIGHT</label><strong>{latestWeight ? `${latestWeight.weight_value} ${latestWeight.weight_unit}` : (patient.weight ?? 'Not recorded')}</strong></div>
        <div><label>COLOR</label><strong>{patient.color ?? 'Not recorded'}</strong></div>
        <div><label>MICROCHIP</label><strong>{patient.microchipNumber ?? 'Not recorded'}</strong></div>
        <div><label>STATUS</label><strong>{patient.status ?? 'Active'}</strong></div>
      </div>

      <div className="owner-section">
        <h4>Owner / Client</h4>
        <div className="info-grid">
          <div><label>CLIENT ID</label><strong className="cid-text">{client?.ownerId ?? client?.clientId ?? ''}</strong></div>
          <div><label>NAME</label><strong>{client?.name ?? client?.fullName ?? ''}</strong></div>
          <div><label>PHONE</label><strong>{client?.phone ?? ''}</strong></div>
          <div><label>EMAIL</label><strong>{client?.email ?? ''}</strong></div>
          <div className="wide"><label>ADDRESS</label><strong>{[client?.address, client?.city, client?.state].filter(Boolean).join(', ') || 'Not recorded'}</strong></div>
        </div>
      </div>

      <div className="owner-section">
        <h4>Quick Health Summary</h4>
        <div className="info-grid">
          <div className="wide"><label><AlertCircle size={12} /> ALLERGIES</label><strong>{patient.allergies || 'None recorded'}</strong></div>
          <div className="wide"><label>EXISTING CONDITIONS</label><strong>{patient.existingConditions || 'None recorded'}</strong></div>
          <div className="wide"><label><Syringe size={12} /> VACCINATIONS</label><strong>{patient.vaccinationInfo || 'Not recorded'}</strong></div>
          <div className="wide"><label>CURRENT MEDICATIONS</label><strong>{patient.medications || 'None recorded'}</strong></div>
          <div className="wide"><label>UPCOMING APPOINTMENT</label><strong>{upcoming.length > 0 ? `${formatDisplayDate(upcoming[0].preferredDate ?? upcoming[0].date)} — ${upcoming[0].appointmentType ?? upcoming[0].reason ?? 'Visit'}` : 'None scheduled'}</strong></div>
          <div className="wide"><label>OUTSTANDING INVOICES</label><strong>{(() => {
            const outstanding = invoiceRecords.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + (parseFloat(inv.total) - parseFloat(inv.paid_amount ?? 0)), 0);
            return outstanding > 0 ? `₹${outstanding.toFixed(2)} outstanding` : 'None outstanding';
          })()}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ---- Medical History Tab ----

function MedicalTab({ patient, role }: { patient: any; role: 'doctor' | 'admin' }) {
  const hasAllergies = patient.allergies && patient.allergies.trim();
  const hasConditions = patient.existingConditions && patient.existingConditions.trim();
  const hasVaccinations = patient.vaccinationInfo && patient.vaccinationInfo.trim();
  const hasMedications = patient.medications && patient.medications.trim();
  const hasHistory = patient.medicalHistory && patient.medicalHistory.trim();
  const hasSpecialReq = patient.specialRequirements && patient.specialRequirements.trim();

  return (
    <div className="medical-tab">
      <div className="info-grid">
        <div className="wide"><label><AlertCircle size={12} /> ALLERGIES</label><strong>{hasAllergies ? patient.allergies : 'None recorded'}</strong></div>
        <div className="wide"><label>EXISTING MEDICAL CONDITIONS</label><strong>{hasConditions ? patient.existingConditions : 'None recorded'}</strong></div>
        <div className="wide"><label><Syringe size={12} /> VACCINATION HISTORY</label><strong>{hasVaccinations ? patient.vaccinationInfo : 'Not recorded'}</strong></div>
        <div className="wide"><label>CURRENT MEDICATIONS</label><strong>{hasMedications ? patient.medications : 'None recorded'}</strong></div>
        <div className="wide"><label>MEDICAL HISTORY</label><strong>{hasHistory ? patient.medicalHistory : 'No previous medical history recorded'}</strong></div>
        <div className="wide"><label>SPECIAL REQUIREMENTS</label><strong>{hasSpecialReq ? patient.specialRequirements : 'None recorded'}</strong></div>
        <div className="wide"><label>IDENTIFICATION DETAILS</label><strong>{patient.identificationDetails || 'Not recorded'}</strong></div>
        <div className="wide"><label>NOTES</label><strong>{patient.notes || 'No notes'}</strong></div>
      </div>
      {role === 'doctor' && (
        <div className="vet-observation">
          <strong>Medical history is managed through clinical records and patient updates.</strong>
          <p>To add or update medical information, create a clinical record or update the patient profile.</p>
        </div>
      )}
    </div>
  );
}

// ---- Clinical Records Tab ----

function RecordsTab({ records }: { records: any[] }) {
  if (records.length === 0) {
    return <p className="empty-hint">No clinical records found for this patient.</p>;
  }
  return (
    <div className="records-tab">
      {records.map((r, i) => (
        <div className="record-card" key={r.recordId ?? r.record_id ?? i}>
          <div className="record-pet">
            <div className="pet-icon"><FileText size={16} /></div>
            <div><strong>{r.reason ?? 'Consultation'}</strong><small>{formatDisplayDate(r.visitDate ?? r.visit_date ?? r.date)}</small></div>
          </div>
          <div className="record-grid">
            <div><label>DIAGNOSIS</label><strong>{r.diagnosis ?? '—'}</strong></div>
            <div><label>TREATMENT</label><strong>{r.treatment ?? '—'}</strong></div>
            <div><label>NOTES</label><strong>{r.notes ?? '—'}</strong></div>
            <div><label>FOLLOW-UP</label><strong>{r.followUp ?? r.follow_up ?? '—'}</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Appointments Tab ----

function AppointmentsTab({ records, role, onBook }: { records: any[]; role: 'doctor' | 'admin'; onBook: () => void }) {
  return (
    <div className="records-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={16} /> Appointments
        </h4>
        <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={onBook}>
          <Plus size={14} /> Book Appointment
        </button>
      </div>
      {records.length === 0 ? (
        <p className="empty-hint">No appointments found for this patient. Click "Book Appointment" to schedule one.</p>
      ) : (
        <>{[...records].sort((a, b) => {
          const da = new Date(a.preferredDate ?? a.date ?? '').getTime();
          const db = new Date(b.preferredDate ?? b.date ?? '').getTime();
          return db - da;
        }).map((a, i) => (
          <div className="record-card" key={a.appointmentId ?? a.appointment_id ?? i}>
            <div className="record-pet">
              <div className="pet-icon"><CalendarDays size={16} /></div>
              <div>
                <strong>{a.appointmentType ?? a.reason ?? 'Appointment'}</strong>
                <small>{formatDisplayDate(a.preferredDate ?? a.date)}{a.preferredTime ?? a.time ? ` · ${a.preferredTime ?? a.time}` : ''}</small>
              </div>
            </div>
            <div className="record-grid">
              <div><label>STATUS</label><strong><em className={`status ${(a.status ?? 'pending').toLowerCase()}`}>{(a.status ?? 'Pending').toUpperCase()}</em></strong></div>
              <div><label>LOCATION</label><strong>{a.visitLocation ?? '—'}</strong></div>
              {a.reason && <div><label>REASON</label><strong>{a.reason}</strong></div>}
            </div>
          </div>
        ))}</>
      )}
    </div>
  );
}

// ---- Prescriptions Tab ----

function PrescriptionsTab({ records, role, onCreate }: { records: any[]; role: 'doctor' | 'admin'; onCreate: () => void }) {
  return (
    <div className="rx-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ClipboardList size={16} /> Prescriptions
        </h4>
        {(role === 'doctor' || role === 'admin') && (
          <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={onCreate}>
            <Plus size={14} /> Create Prescription
          </button>
        )}
      </div>
      {records.length === 0 ? (
        <p className="empty-hint">No prescriptions for this patient. Click "Create Prescription" to write one.</p>
      ) : (
        <>{records.map((r, i) => {
          const meds = typeof r.medications === 'string' ? r.medications : (r.medications && Array.isArray(r.medications))
            ? r.medications.map((m: any) => typeof m === 'string' ? m : `${m.name ?? m.medication ?? ''} ${m.dosage ?? ''}`).join(', ')
            : r.meds ?? '—';
          return (
            <div className="rx-card" key={r.rxId ?? r.rx_id ?? i}>
              <div className="pet-icon"><ClipboardList size={16} /></div>
              <div style={{ flex: 1 }}>
                <strong>{r.vet ?? r.doctorName ?? 'Veterinarian'} <small>· {formatDisplayDate(r.date ?? r.createdAt ?? r.created_at)}</small></strong>
                <div className="rx-meds">{meds}</div>
                <small>Status: <em className={`status ${r.status === 'Active' || r.status === 'active' || r.status === 'finalized' || r.status === 'Finalized' ? 'confirmed' : 'pending'}`}>{(r.status ?? 'pending').toUpperCase()}</em></small>
              </div>
            </div>
          );
        })}</>
      )}
    </div>
  );
}

// ---- Weight Tracking Tab ----

function WeightTab({ patientId, records, role, onSaved }: {
  patientId: string; records: any[]; role: 'doctor' | 'admin'; onSaved: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('kg');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = role === 'doctor' || role === 'admin';

  const handleSave = async () => {
    const val = parseFloat(weight);
    if (isNaN(val) || val <= 0) { setError('Enter a valid weight value'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await insertWeightRecord({ patientId, weightValue: val, weightUnit: unit, recordedDate: date, notes: notes || undefined });
    setSaving(false);
    if (err) { setError(err); return; }
    setAdding(false);
    setWeight(''); setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    onSaved();
  };

  const sorted = [...records].sort((a, b) =>
    new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
  );

  const chartPoints = sorted.map((r, i) => {
    const x = (i / Math.max(sorted.length - 1, 1)) * 100;
    const val = parseFloat(r.weight_value);
    return { x, val, date: r.recorded_date, unit: r.weight_unit };
  });

  const values = chartPoints.map((p) => p.val);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 1;
  const range = maxVal - minVal || 1;

  const pathD = chartPoints.map((p, i) => {
    const y = 100 - ((p.val - minVal) / range) * 80 - 10;
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${y}`;
  }).join(' ');

  return (
    <div className="weight-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Scale size={16} /> Weight History
        </h4>
        {canAdd && !adding && (
          <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setAdding(true)}>
            <Plus size={14} /> Add Measurement
          </button>
        )}
      </div>

      {adding && (
        <div className="breeding-form" style={{ marginBottom: '14px' }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 100px 1fr' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#687993', fontWeight: 700 }}>WEIGHT VALUE</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 25.5"
                style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#687993', fontWeight: 700 }}>UNIT</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px' }}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#687993', fontWeight: 700 }}>DATE</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px' }} />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '11px', color: '#687993', fontWeight: 700 }}>NOTES (OPTIONAL)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular checkup"
              style={{ display: 'block', width: '100%', border: '1px solid #dce3ed', borderRadius: '6px', padding: '10px', marginTop: '6px', fontSize: '13px' }} />
          </div>
          {error && <p style={{ color: '#e73535', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Save Measurement
            </button>
            <button className="secondary" onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-hint">No weight records available. Add a measurement to start tracking weight over time.</div>
      ) : (
        <>
          {sorted.length >= 2 && (
            <div className="weight-chart-container">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '180px', background: '#f8faff', borderRadius: '8px', border: '1px solid #dfe4eb' }}>
                <polyline points={pathD} fill="none" stroke="#112b73" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                {chartPoints.map((p, i) => {
                  const y = 100 - ((p.val - minVal) / range) * 80 - 10;
                  return <circle key={i} cx={p.x} cy={y} r="1.5" fill="#112b73" vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#8290a5' }}>
                <span>{formatDisplayDate(sorted[0].recorded_date)}</span>
                <span>{formatDisplayDate(sorted[sorted.length - 1].recorded_date)}</span>
              </div>
            </div>
          )}

          <div className="weight-table">
            <div className="table-head" style={{ gridTemplateColumns: '1fr 100px 80px 1fr' }}>
              <span>DATE</span><span>WEIGHT</span><span>UNIT</span><span>NOTES</span>
            </div>
            {[...sorted].reverse().map((r, i) => (
              <div className="table-row" key={r.id ?? i} style={{ gridTemplateColumns: '1fr 100px 80px 1fr', cursor: 'default' }}>
                <div><strong>{formatDisplayDate(r.recorded_date)}</strong></div>
                <div><strong className="pid-text">{r.weight_value}</strong></div>
                <div><span>{r.weight_unit}</span></div>
                <div><span>{r.notes || '—'}</span></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Billing Tab ----

function BillingTab({ records, invoiceRecords, role, onCreate, onViewInvoice }: {
  records: any[]; invoiceRecords: any[]; role: 'doctor' | 'admin'; onCreate: () => void; onViewInvoice: (inv: any) => void;
}) {
  const canCreate = role === 'doctor' || role === 'admin';
  const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.amount ?? '0'), 0);
  const paidAmount = records.filter((r) => r.status === 'paid' || r.status === 'Paid').reduce((sum, r) => sum + parseFloat(r.amount ?? '0'), 0);
  const outstanding = totalAmount - paidAmount;
  const invTotal = invoiceRecords.reduce((s, inv) => s + parseFloat(inv.total ?? 0), 0);
  const invOutstanding = invoiceRecords
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (parseFloat(inv.total) - parseFloat(inv.paid_amount ?? 0)), 0);

  return (
    <div className="billing-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DollarSign size={16} /> Billing & Invoices
        </h4>
        {canCreate && (
          <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={onCreate}>
            <Plus size={14} /> Create Invoice
          </button>
        )}
      </div>

      <div className="info-grid" style={{ marginBottom: '16px' }}>
        <div><label>TOTAL BILLED</label><strong>₹{(totalAmount + invTotal).toFixed(2)}</strong></div>
        <div><label>PAID</label><strong style={{ color: '#0b9b55' }}>₹{paidAmount.toFixed(2)}</strong></div>
        <div><label>OUTSTANDING</label><strong style={{ color: (outstanding + invOutstanding) > 0 ? '#e73535' : '#0b9b55' }}>₹{(outstanding + invOutstanding).toFixed(2)}</strong></div>
      </div>

      {invoiceRecords.length > 0 && (
        <div className="records-tab" style={{ marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: '#687993', textTransform: 'uppercase', letterSpacing: '.04em' }}>Invoices</h5>
          {invoiceRecords.map((inv, i) => (
            <div className="record-card" key={inv.invoice_id ?? inv.invoiceId ?? i}>
              <div className="record-pet">
                <div className="pet-icon"><FileText size={16} /></div>
                <div>
                  <strong>{inv.invoice_id ?? inv.invoiceId ?? 'Invoice'}</strong>
                  <small>{inv.created_at ? formatDisplayDate(inv.created_at) : '—'}</small>
                </div>
              </div>
              <div className="record-grid">
                <div><label>TOTAL</label><strong>₹{parseFloat(inv.total ?? 0).toFixed(2)}</strong></div>
                <div><label>OUTSTANDING</label><strong style={{ color: (parseFloat(inv.total) - parseFloat(inv.paid_amount ?? 0)) > 0 ? '#e73535' : '#0b9b55' }}>₹{(parseFloat(inv.total) - parseFloat(inv.paid_amount ?? 0)).toFixed(2)}</strong></div>
                <div><label>STATUS</label><strong><em className={`status ${(inv.status ?? 'draft').toLowerCase().replace('_', '')}`}>{(inv.status ?? 'DRAFT').toUpperCase()}</em></strong></div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <button className="link" onClick={() => onViewInvoice(inv)}>View Invoice</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {records.length > 0 && (
        <div className="records-tab">
          <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: '#687993', textTransform: 'uppercase', letterSpacing: '.04em' }}>Payment Records</h5>
          {records.map((r, i) => (
            <div className="record-card" key={r.paymentId ?? r.payment_id ?? i}>
              <div className="record-pet">
                <div className="pet-icon"><DollarSign size={16} /></div>
                <div>
                  <strong>{r.service ?? 'Service'}</strong>
                  <small>{formatDisplayDate(r.dueDate ?? r.paidAt ?? r.createdAt)}</small>
                </div>
              </div>
              <div className="record-grid">
                <div><label>AMOUNT</label><strong>₹{r.amount ?? '0'}</strong></div>
                <div><label>METHOD</label><strong>{r.method ?? '—'}</strong></div>
                <div><label>STATUS</label><strong><em className={`status ${(r.status ?? 'pending').toLowerCase()}`}>{(r.status ?? 'Pending').toUpperCase()}</em></strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {records.length === 0 && invoiceRecords.length === 0 && (
        <p className="empty-hint">No billing records or invoices found for this patient.</p>
      )}
    </div>
  );
}

// ---- Photos Tab ----

function PhotosTab({ patientId, photos, onSaved }: {
  patientId: string; photos: any[]; onSaved: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      const { error: err } = await uploadPatientPhoto(patientId, file, 'photo');
      if (err) { setError(err); break; }
    }
    setUploading(false);
    onSaved();
  };

  const handleDelete = async (photo: any) => {
    const storageKey = photo.fileName ?? '';
    const { error: err } = await deletePatientPhoto(photo.id, storageKey);
    if (err) { setError(err); return; }
    onSaved();
  };

  return (
    <div className="photos-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={16} /> Photos & Media
        </h4>
        <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Upload Photo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        className={`photo-dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={24} />
        <p>Drag and drop photos here, or click to browse</p>
        <small>JPEG, PNG, WebP up to 10MB</small>
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}

      {photos.length === 0 && !uploading ? (
        <p className="empty-hint">No photos uploaded yet. Upload photos to build a visual record for this patient.</p>
      ) : (
        <div className="photo-gallery">
          {photos.map((photo, i) => (
            <div className="photo-thumb" key={photo.id ?? i}>
              <img src={photo.url} alt={photo.fileName} onClick={() => setLightbox(photo.url)} />
              <div className="photo-thumb-info">
                <small>{photo.fileName}</small>
                <small>{photo.uploadedAt ? formatDisplayDate(photo.uploadedAt) : ''}</small>
              </div>
              <button className="photo-delete-btn" onClick={() => handleDelete(photo)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Photo" />
          <button className="lightbox-close"><X size={20} /></button>
        </div>
      )}
    </div>
  );
}
