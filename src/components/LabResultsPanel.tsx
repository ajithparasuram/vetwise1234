/**
 * LabResultsPanel — laboratory results viewer for the patient profile.
 * Displays lab test results with values, reference ranges, and status.
 * Doctors and admins can add new lab results and export PDF reports.
 */

import { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, Loader2, X, Check, Clock, Download, FileDown } from 'lucide-react';
import { fetchLabResultsByPatient, insertLabResult } from '@/lib/queries';

interface Props {
  patientId: string;
  clientId: string;
  role: 'doctor' | 'admin';
  onSaved: () => void;
}

const TEST_CATEGORIES = ['Hematology', 'Biochemistry', 'Urinalysis', 'Microbiology', 'Endocrinology', 'Parasitology', 'Cytology', 'Other'];
void ['pending', 'in_progress', 'completed', 'reviewed', 'cancelled'];

function statusBadge(status: string) {
  const cls = status === 'completed' || status === 'reviewed' ? 'confirmed' : status === 'cancelled' ? 'overdue' : 'pending';
  const icon = status === 'completed' || status === 'reviewed' ? <Check size={10} /> : status === 'cancelled' ? <X size={10} /> : <Clock size={10} />;
  return <em className={`status ${cls}`}>{icon} {status.toUpperCase()}</em>;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function generateLabPdfHtml(patientId: string, results: any[], singleResult?: any): string {
  const reportDate = new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const reportId = singleResult?.lab_result_id ?? `VW-LAB-REPORT-${Date.now()}`;
  const resultsToRender = singleResult ? [singleResult] : results;

  const resultRows = resultsToRender.map((r) => `
    <tr>
      <td>${r.test_name ?? '—'}</td>
      <td>${r.test_category ?? '—'}</td>
      <td>${r.result_value ?? '—'} ${r.unit ?? ''}</td>
      <td>${r.reference_range ?? '—'}</td>
      <td>${formatDate(r.collected_date)}</td>
      <td>${formatDate(r.reported_date)}</td>
      <td>${r.performed_by ?? '—'}</td>
      <td><span class="badge ${(r.status ?? 'pending').toLowerCase()}">${(r.status ?? 'pending').toUpperCase()}</span></td>
    </tr>
    ${r.notes ? `<tr class="notes-row"><td colspan="8"><strong>Notes:</strong> ${r.notes}</td></tr>` : ''}
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>VetWise Lab Report — ${reportId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a2a44; padding: 32px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #112b73; padding-bottom: 16px; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 800; color: #112b73; }
  .brand small { display: block; font-size: 11px; font-weight: 400; color: #687993; margin-top: 2px; }
  .report-meta { text-align: right; font-size: 11px; color: #687993; }
  .report-meta strong { color: #1a2a44; }
  h1 { font-size: 16px; color: #112b73; margin-bottom: 16px; }
  .patient-info { background: #f4f7fc; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
  .patient-info h2 { font-size: 12px; color: #687993; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
  .patient-info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .patient-info-grid div { font-size: 12px; }
  .patient-info-grid label { display: block; color: #687993; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
  .patient-info-grid strong { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #112b73; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; padding: 8px 10px; text-align: left; }
  tbody td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #e4e8f0; }
  .notes-row td { background: #fafbfe; font-size: 11px; color: #4a5670; }
  .badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .badge.completed, .badge.reviewed { background: #e6f9ee; color: #0b9b55; }
  .badge.pending, .badge.in_progress { background: #fff4e0; color: #d97706; }
  .badge.cancelled { background: #fde8e8; color: #e73535; }
  .footer { border-top: 1px solid #e4e8f0; padding-top: 12px; font-size: 10px; color: #687993; display: flex; justify-content: space-between; }
  .footer strong { color: #1a2a44; }
  @media print { body { padding: 16px; } .page-break { page-break-before: always; } }
</style>
</head>
<body>
  <div class="report-header">
    <div class="brand">VetWise<small>Veterinary Laboratory Report</small></div>
    <div class="report-meta">
      <strong>Report ID:</strong> ${reportId}<br/>
      <strong>Generated:</strong> ${reportDate}<br/>
      <strong>Patient ID:</strong> ${patientId}
    </div>
  </div>

  <h1>${singleResult ? 'Laboratory Test Result' : 'Laboratory Report — All Results'}</h1>

  <div class="patient-info">
    <h2>Patient Information</h2>
    <div class="patient-info-grid">
      <div><label>Patient ID</label><strong>${patientId}</strong></div>
      <div><label>Report Date</label><strong>${reportDate}</strong></div>
      <div><label>Total Tests</label><strong>${resultsToRender.length}</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Test Name</th><th>Category</th><th>Result</th><th>Ref Range</th>
        <th>Collected</th><th>Reported</th><th>Performed By</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${resultRows}</tbody>
  </table>

  <div class="footer">
    <span><strong>VetWise Pet Care</strong> — Confidential veterinary laboratory report</span>
    <span>Report ID: ${reportId}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

export function LabResultsPanel({ patientId, clientId, role, onSaved }: Props) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testName, setTestName] = useState('');
  const [testCategory, setTestCategory] = useState('Hematology');
  const [resultValue, setResultValue] = useState('');
  const [unit, setUnit] = useState('');
  const [refRange, setRefRange] = useState('');
  const [collectedDate, setCollectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportedDate, setReportedDate] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [notes, setNotes] = useState('');

  const canAdd = role === 'doctor' || role === 'admin';
  const canExport = role === 'doctor' || role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchLabResultsByPatient(patientId);
    if (err) { setError(err); }
    else if (data) setResults(data);
    else setResults([]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!testName.trim()) { setError('Test name is required'); return; }
    setSaving(true); setError(null);
    const { error: err } = await insertLabResult({
      patientId,
      clientId,
      testName: testName.trim(),
      testCategory,
      resultValue: resultValue.trim() || undefined,
      unit: unit.trim() || undefined,
      referenceRange: refRange.trim() || undefined,
      status: 'completed',
      collectedDate,
      reportedDate: reportedDate || undefined,
      performedBy: performedBy.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (err) { setError(err); return; }
    setAdding(false);
    setTestName(''); setResultValue(''); setUnit(''); setRefRange(''); setNotes(''); setPerformedBy(''); setReportedDate('');
    setCollectedDate(new Date().toISOString().split('T')[0]);
    load();
    onSaved();
  };

  const exportSinglePdf = (result: any) => {
    const html = generateLabPdfHtml(patientId, results, result);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) { setError('Pop-up blocked. Please allow pop-ups to export the PDF.'); }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const exportAllPdf = () => {
    if (results.length === 0) return;
    const html = generateLabPdfHtml(patientId, results);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) { setError('Pop-up blocked. Please allow pop-ups to export the PDF.'); }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  if (loading) {
    return <div className="empty-state"><Loader2 size={20} className="spin" /><p>Loading lab results...</p></div>;
  }

  return (
    <div className="lab-results-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '14px', color: '#132f65', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FlaskConical size={16} /> Laboratory Results
        </h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canExport && results.length > 0 && (
            <button className="secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={exportAllPdf}>
              <FileDown size={14} /> Export All
            </button>
          )}
          {canAdd && !adding && (
            <button className="primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setAdding(true)}>
              <Plus size={14} /> Add Lab Result
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="breeding-form" style={{ marginBottom: '14px' }}>
          <div className="form-grid">
            <label>Test Name *
              <input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Complete Blood Count" />
            </label>
            <label>Category
              <select value={testCategory} onChange={(e) => setTestCategory(e.target.value)}>
                {TEST_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Result Value
              <input value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder="e.g. 12.5" />
            </label>
            <label>Unit
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. mg/dL" />
            </label>
            <label className="wide">Reference Range
              <input value={refRange} onChange={(e) => setRefRange(e.target.value)} placeholder="e.g. 8.0 - 15.0" />
            </label>
            <label>Collected Date
              <input type="date" value={collectedDate} onChange={(e) => setCollectedDate(e.target.value)} />
            </label>
            <label>Reported Date
              <input type="date" value={reportedDate} onChange={(e) => setReportedDate(e.target.value)} />
            </label>
            <label className="wide">Performed By
              <input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="Lab or technician name" />
            </label>
            <label className="wide">Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinical notes or interpretation" />
            </label>
          </div>
          {error && <p style={{ color: '#e73535', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Save Result
            </button>
            <button className="secondary" onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {results.length === 0 && !adding ? (
        <p className="empty-hint">No lab results recorded for this patient. Click "Add Lab Result" to record a test.</p>
      ) : (
        <div className="records-tab">
          {results.map((r, i) => (
            <div className="record-card" key={r.id ?? r.lab_result_id ?? i}>
              <div className="record-pet">
                <div className="pet-icon"><FlaskConical size={16} /></div>
                <div>
                  <strong>{r.test_name}</strong>
                  <small>{r.test_category ?? '—'} · Collected {r.collected_date ?? '—'}</small>
                </div>
                {canExport && (
                  <button className="link" style={{ marginLeft: 'auto' }} onClick={() => exportSinglePdf(r)}>
                    <Download size={12} /> PDF
                  </button>
                )}
              </div>
              <div className="record-grid">
                <div><label>RESULT</label><strong>{r.result_value ?? '—'} {r.unit ?? ''}</strong></div>
                <div><label>REFERENCE RANGE</label><strong>{r.reference_range ?? '—'}</strong></div>
                <div><label>STATUS</label><strong>{statusBadge(r.status ?? 'pending')}</strong></div>
                <div><label>PERFORMED BY</label><strong>{r.performed_by ?? '—'}</strong></div>
                {r.reported_date && <div><label>REPORTED</label><strong>{formatDate(r.reported_date)}</strong></div>}
                {r.notes && <div className="wide"><label>NOTES</label><strong>{r.notes}</strong></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
