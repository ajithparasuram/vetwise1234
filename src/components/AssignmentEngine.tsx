/**
 * AssignmentEngine — explainable doctor assignment UI.
 *
 * Shows the recommended veterinarian with decision factors (verification,
 * capability, species support, availability, serviceability). Lists
 * eligible candidates. Does not claim medical superiority.
 */

import { Check, X, Stethoscope, ShieldCheck, MapPin, Clock, Star } from 'lucide-react';
import type { AssignmentDecision } from '@/lib/orchestration';

interface AssignmentEngineProps {
  decision: AssignmentDecision | null;
  onAssign: (doctorId: string) => void;
  role: 'admin' | 'frontdesk' | 'doctor';
}

export function AssignmentEngine({ decision, onAssign, role }: AssignmentEngineProps) {
  const canAssign = role === 'admin' || role === 'frontdesk';

  if (!decision) {
    return (
      <div className="assignment-engine">
        <div className="ae-header">
          <h3><Stethoscope size={16} /> Doctor Assignment</h3>
        </div>
        <div className="empty-state"><Stethoscope size={32} /><p>No assignment decision available. Select a patient and appointment to generate a recommendation.</p></div>
        <p className="ae-disclaimer">
          Assignment recommendation is based on verification status, capability, species
          support, and serviceability. It does not constitute a medical superiority claim.
        </p>
      </div>
    );
  }

  return (
    <div className="assignment-engine">
      <div className="ae-header">
        <h3><Stethoscope size={16} /> Doctor Assignment</h3>
        <span className={`status ${decision.decisionStatus === 'recommended' ? 'confirmed' : decision.decisionStatus === 'no_match' ? 'overdue' : 'pending'}`}>
          {decision.decisionStatus.toUpperCase().replace(/_/g, ' ')}
        </span>
      </div>

      {decision.decisionStatus === 'no_match' && (
        <div className="ae-no-match">
          <X size={18} />
          <p>No veterinarians matched the required criteria. {decision.reason}</p>
        </div>
      )}

      {decision.selectedVeterinarian && (
        <div className="ae-recommended">
          <div className="ae-recommended-head">
            <div className="ae-doctor-icon"><Stethoscope size={20} /></div>
            <div>
              <strong>{decision.selectedVeterinarian.name}</strong>
              <small>{decision.selectedVeterinarian.specialty}</small>
              <small>License: {decision.selectedVeterinarian.license}</small>
            </div>
          </div>

          <div className="ae-factors">
            <p className="ae-factors-title">Decision Factors:</p>
            {decision.decisionFactors.map((factor, i) => (
              <div key={i} className={`ae-factor ${factor.passed ? 'pass' : 'fail'}`}>
                {factor.passed ? <Check size={14} /> : <X size={14} />}
                <div>
                  <strong>{factor.label}</strong>
                  <small>{factor.detail}</small>
                </div>
              </div>
            ))}
          </div>

          {canAssign && decision.decisionStatus === 'recommended' && (
            <button className="primary ae-assign-btn" onClick={() => onAssign(decision.selectedVeterinarian!.doctorId)}>
              <ShieldCheck size={15} /> Assign {decision.selectedVeterinarian.name}
            </button>
          )}
        </div>
      )}

      {decision.eligibleCandidates.length > 0 && (
        <div className="ae-candidates">
          <p className="ae-candidates-title">
            <Star size={14} /> Eligible Candidates ({decision.eligibleCandidates.length})
          </p>
          <div className="ae-candidate-list">
            {decision.eligibleCandidates.map((doc) => (
              <div key={doc.doctorId} className="ae-candidate-card">
                <div className="ae-candidate-info">
                  <strong>{doc.name}</strong>
                  <small>{doc.specialty}</small>
                  <div className="ae-candidate-meta">
                    <span><ShieldCheck size={11} /> {doc.verificationStatus}</span>
                    <span><MapPin size={11} /> {doc.serviceAreaIds.length} areas</span>
                    <span><Clock size={11} /> {doc.supportedSpecies.length} species</span>
                  </div>
                </div>
                {canAssign && decision.selectedVeterinarian?.doctorId !== doc.doctorId && (
                  <button className="secondary" onClick={() => onAssign(doc.doctorId)}>Assign</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="ae-disclaimer">
        Assignment recommendation is based on verification status, capability, species
        support, and serviceability. It does not constitute a medical superiority claim.
      </p>
    </div>
  );
}
