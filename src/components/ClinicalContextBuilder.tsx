/**
 * ClinicalContextBuilder — assembles all available information for a selected
 * animal into a structured clinical context for the veterinarian.
 *
 * Combines: current appointment + previous visits + clinical history +
 * previous prescriptions + vaccination history + weight history +
 * known conditions + recent relevant events.
 *
 * Clearly distinguishes recorded clinical data from AI-generated guidance.
 */

import {
  FileText, ClipboardList, Syringe, Activity, AlertCircle, Stethoscope,
  CalendarDays, PawPrint, Shield, Clock,
} from 'lucide-react';
import type { ClinicalContext, ClinicalContextEntry } from '@/lib/orchestration';

interface ClinicalContextBuilderProps {
  context: ClinicalContext | null;
}

function entryIcon(type: ClinicalContextEntry['type']) {
  switch (type) {
    case 'visit': return <CalendarDays size={14} />;
    case 'record': return <FileText size={14} />;
    case 'prescription': return <ClipboardList size={14} />;
    case 'vaccination': return <Syringe size={14} />;
    case 'weight': return <Activity size={14} />;
    case 'condition': return <AlertCircle size={14} />;
    case 'event': return <Clock size={14} />;
  }
}

export function ClinicalContextBuilder({ context }: ClinicalContextBuilderProps) {
  if (!context) {
    return (
      <div className="clinical-context-builder">
        <div className="ccb-header">
          <h3><Stethoscope size={16} /> Clinical Context</h3>
        </div>
        <div className="empty-state"><Stethoscope size={32} /><p>Select a patient to build clinical context.</p></div>
      </div>
    );
  }

  const sortedEntries = [...context.entries].sort((a, b) => b.date.localeCompare(a.date));

  const recordedEntries = sortedEntries.filter((e) => e.source === 'recorded');
  const aiEntries = sortedEntries.filter((e) => e.source === 'ai_guidance');

  return (
    <div className="clinical-context-builder">
      <div className="ccb-header">
        <h3><Stethoscope size={16} /> Clinical Context</h3>
        <small>Assembled at {new Date(context.assembledAt).toLocaleString()}</small>
      </div>

      <div className="ccb-animal-summary">
        <div className="ccb-animal-icon"><PawPrint size={20} /></div>
        <div className="ccb-animal-info">
          <strong>{context.animal.name}</strong>
          <small>{context.animal.species} · {context.animal.breed} · {context.animal.sex} · {context.animal.age} · {context.animal.weight}</small>
          <small>Patient ID: {context.animal.patientId}</small>
        </div>
      </div>

      {context.currentAppointment && (
        <div className="ccb-current-appt">
          <div className="ccb-section-title"><CalendarDays size={14} /> Current Appointment</div>
          <div className="ccb-appt-detail">
            <strong>{context.currentAppointment.reason}</strong>
            <small>Type: {context.currentAppointment.appointmentType}</small>
            {context.currentAppointment.preferredDate && <small>Preferred: {context.currentAppointment.preferredDate} {context.currentAppointment.preferredTime}</small>}
            {context.currentAppointment.location && <small>Location: {context.currentAppointment.location}</small>}
          </div>
        </div>
      )}

      <div className="ccb-quick-facts">
        <div className="ccb-fact">
          <Activity size={14} />
          <div><label>RECENT WEIGHT</label><strong>{context.recentWeight ?? 'Not recorded'}</strong></div>
        </div>
        <div className="ccb-fact">
          <Syringe size={14} />
          <div><label>LAST VACCINATION</label><strong>{context.lastVaccination ?? 'None recorded'}</strong></div>
        </div>
        <div className="ccb-fact">
          <AlertCircle size={14} />
          <div><label>KNOWN CONDITIONS</label><strong>{context.knownConditions.length > 0 ? context.knownConditions.join(', ') : 'None'}</strong></div>
        </div>
      </div>

      <div className="ccb-timeline-section">
        <div className="ccb-section-title"><FileText size={14} /> Clinical History Timeline</div>
        <div className="ccb-timeline">
          {recordedEntries.length === 0 ? (
            <p className="ccb-empty">No recorded clinical history.</p>
          ) : recordedEntries.map((entry, i) => (
            <div key={i} className="ccb-timeline-entry">
              <div className="ccb-timeline-icon">{entryIcon(entry.type)}</div>
              <div className="ccb-timeline-content">
                <div className="ccb-timeline-head">
                  <strong>{entry.title}</strong>
                  <small>{entry.date}</small>
                </div>
                <p>{entry.detail}</p>
                <span className="ccb-source-tag recorded">{entry.sourceLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {aiEntries.length > 0 && (
        <div className="ccb-ai-section">
          <div className="ccb-section-title"><Shield size={14} /> AI-Assisted Guidance <em className="ccb-disclaimer">NOT a clinical record</em></div>
          <div className="ccb-ai-entries">
            {aiEntries.map((entry, i) => (
              <div key={i} className="ccb-timeline-entry ai">
                <div className="ccb-timeline-icon">{entryIcon(entry.type)}</div>
                <div className="ccb-timeline-content">
                  <div className="ccb-timeline-head">
                    <strong>{entry.title}</strong>
                    <small>{entry.date}</small>
                  </div>
                  <p>{entry.detail}</p>
                  <span className="ccb-source-tag ai">{entry.sourceLabel}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="ccb-medical-disclaimer">
            AI-generated guidance is NOT a veterinary diagnosis. It does not replace
            professional veterinary judgment. Always verify with clinical examination.
          </p>
        </div>
      )}
    </div>
  );
}
