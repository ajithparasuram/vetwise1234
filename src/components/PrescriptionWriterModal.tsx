/**
 * PrescriptionWriterModal — professional prescription writing interface.
 * Supports medication entry, draft saving, and finalization.
 * Only doctors can finalize; admins can save drafts.
 */

import { useState } from 'react';
import { X, Check, Plus, Trash2, Loader2, ClipboardList, Pill, FileDown } from 'lucide-react';
import { insertPrescription, finalizePrescription, fetchPrescriptionPdf } from '@/lib/queries';

interface Medication {
  name: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

const ROUTES = ['Oral', 'Topical', 'Injectable (IM)', 'Injectable (IV)', 'Subcutaneous', 'Ophthalmic', 'Otic', 'Inhaled'];
const FREQUENCIES = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours', 'As needed', 'Weekly'];

interface Props {
  patientId: string;
  clientId: string;
  patientName: string;
  clientName: string;
  doctorName: string;
  onClose: () => void;
  onSaved: () => void;
}

const emptyMed: Medication = { name: '', strength: '', dosage: '', route: 'Oral', frequency: 'Twice daily', duration: '', quantity: '', instructions: '' };

export function PrescriptionWriterModal({ patientId, clientId, patientName, clientName, doctorName, onClose, onSaved }: Props) {
  const [diagnosis, setDiagnosis] = useState('');
  const [meds, setMeds] = useState<Medication[]>([{ ...emptyMed }]);
  const [followUp, setFollowUp] = useState('');
  const [rxDate, setRxDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRxId, setCreatedRxId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const addMed = () => setMeds((m) => [...m, { ...emptyMed }]);
  const removeMed = (i: number) => setMeds((m) => m.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof Medication, val: string) =>
    setMeds((m) => m.map((med, idx) => idx === i ? { ...med, [field]: val } : med));

  const validate = (): string | null => {
    if (!diagnosis.trim()) return 'Diagnosis is required';
    const validMeds = meds.filter((m) => m.name.trim());
    if (validMeds.length === 0) return 'At least one medication is required';
    for (const m of validMeds) {
      if (!m.dosage.trim()) return `Dosage is required for ${m.name}`;
      if (!m.duration.trim()) return `Duration is required for ${m.name}`;
    }
    return null;
  };

  const buildPayload = (status: string) => ({
    patientId,
    clientId,
    diagnosis: diagnosis.trim(),
    medications: meds.filter((m) => m.name.trim()),
    followUpInstructions: followUp.trim(),
    status,
    date: rxDate,
    vet: doctorName,
  });

  const handleSaveDraft = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setSaving(true); setError(null);
    const { data, error: err } = await insertPrescription(buildPayload('draft'));
    setSaving(false);
    if (err) { setError(err); return; }
    const id = (data as any)?.rxId ?? (data as any)?.rx_id;
    setCreatedRxId(id);
    onSaved();
  };

  const handleFinalize = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setFinalizing(true); setError(null);
    const { data: created, error: err1 } = await insertPrescription(buildPayload('pending'));
    if (err1 || !created) { setFinalizing(false); setError(err1 ?? 'Failed to create prescription'); return; }
    const id = (created as any)?.rxId ?? (created as any)?.rx_id;
    const { error: err2 } = await finalizePrescription(id);
    setFinalizing(false);
    if (err2) { setError(err2); return; }
    setCreatedRxId(id);
    onSaved();
  };

  const handleDownloadPdf = async () => {
    if (!createdRxId) return;
    const { data, error: err } = await fetchPrescriptionPdf(createdRxId);
    if (err || !data) { setError(err ?? 'PDF not available'); return; }
    const url = (data as any).url;
    setPdfUrl(url);
    window.open(url, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">VETWISE</p>
            <h2>Write Prescription</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-scroll">
          <div className="rx-patient-bar">
            <div><label>PATIENT</label><strong>{patientName}</strong></div>
            <div><label>CLIENT</label><strong>{clientName}</strong></div>
            <div><label>VETERINARIAN</label><strong>{doctorName}</strong></div>
            <div><label>DATE</label><strong>{rxDate}</strong></div>
          </div>

          <div className="form-section">
            <div className="form-section-header"><ClipboardList size={16} /><span>Clinical Details</span></div>
            <div className="form-section-body">
              <label className="wide">
                Diagnosis *
                <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Primary diagnosis" />
              </label>
              <label className="wide">
                Follow-up Instructions
                <textarea value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="Revisit in X days, monitor for..." />
              </label>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <Pill size={16} /><span>Medications</span>
              <button type="button" className="ghost-btn" onClick={addMed}><Plus size={14} /> Add Medication</button>
            </div>
            <div className="form-section-body">
              {meds.map((m, i) => (
                <div className="med-card" key={i}>
                  <div className="med-card-head">
                    <strong>Medication {i + 1}</strong>
                    {meds.length > 1 && <button type="button" className="icon-btn sm" onClick={() => removeMed(i)}><Trash2 size={14} /></button>}
                  </div>
                  <div className="form-grid">
                    <label>Medication Name *<input value={m.name} onChange={(e) => updateMed(i, 'name', e.target.value)} placeholder="e.g. Amoxicillin" /></label>
                    <label>Strength<input value={m.strength} onChange={(e) => updateMed(i, 'strength', e.target.value)} placeholder="e.g. 250mg" /></label>
                    <label>Dosage *<input value={m.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} placeholder="e.g. 1 tablet" /></label>
                    <label>Route<select value={m.route} onChange={(e) => updateMed(i, 'route', e.target.value)}>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select></label>
                    <label>Frequency<select value={m.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)}>{FREQUENCIES.map((f) => <option key={f}>{f}</option>)}</select></label>
                    <label>Duration *<input value={m.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} placeholder="e.g. 7 days" /></label>
                    <label>Quantity<input value={m.quantity} onChange={(e) => updateMed(i, 'quantity', e.target.value)} placeholder="e.g. 14 tablets" /></label>
                    <label className="wide">Instructions<input value={m.instructions} onChange={(e) => updateMed(i, 'instructions', e.target.value)} placeholder="Give with food, complete full course" /></label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}
          {createdRxId && <div className="rx-success-banner"><Check size={16} /> Prescription {createdRxId} saved successfully.</div>}
        </div>

        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>{createdRxId ? 'Close' : 'Cancel'}</button>
          {createdRxId && (
            <button className="secondary" onClick={handleDownloadPdf}><FileDown size={16} /> Download PDF</button>
          )}
          {!createdRxId && (
            <>
              <button className="secondary" onClick={handleSaveDraft} disabled={saving || finalizing}>
                {saving ? <Loader2 size={14} className="spin" /> : <Check size={16} />} Save Draft
              </button>
              <button className="primary" onClick={handleFinalize} disabled={saving || finalizing}>
                {finalizing ? <Loader2 size={14} className="spin" /> : <Check size={16} />} Finalize & Sign
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
