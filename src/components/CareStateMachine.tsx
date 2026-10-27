/**
 * CareStateMachine — visual state machine for appointment/care workflow.
 * Shows current state, valid transitions, and allows authorized users to
 * trigger transitions. Prevents invalid transitions in the UI.
 */

import { useState } from 'react';
import { Check, ChevronRight, Clock, X, Activity, ShieldCheck, Stethoscope } from 'lucide-react';
import {
  type CareState, type AppointmentState,
  CARE_STATE_LABELS, CARE_STATE_COLORS, getValidNextStates,
} from '@/lib/orchestration';
import type { Role } from '@/lib/api';

interface CareStateMachineProps {
  appointment: AppointmentState;
  role: Role;
  onTransition: (from: CareState, to: CareState, action: string) => void;
}

const STATE_ORDER: CareState[] = [
  'REQUESTED', 'SERVICEABILITY_CHECK', 'PENDING_ADMIN_REVIEW', 'AUTHORIZED',
  'ASSIGNMENT_PENDING', 'DOCTOR_ASSIGNED', 'DOCTOR_ACCEPTED', 'EN_ROUTE',
  'ARRIVED', 'CLINICAL_ENCOUNTER', 'RECORD_FINALIZED', 'PRESCRIPTION_ISSUED',
  'FOLLOW_UP', 'COMPLETED',
];

const TERMINAL_STATES: CareState[] = ['COMPLETED', 'CANCELLED', 'REJECTED'];

const ACTION_LABELS: Record<string, string> = {
  check_serviceability: 'Check Serviceability',
  cancel: 'Cancel',
  serviceability_passed: 'Mark Serviceable',
  serviceability_failed: 'Mark Unserviceable',
  admin_approve: 'Approve',
  admin_reject: 'Reject',
  start_assignment: 'Start Assignment',
  assign_doctor: 'Assign Doctor',
  doctor_accept: 'Accept',
  doctor_decline: 'Decline',
  doctor_en_route: 'Mark En Route',
  doctor_arrived: 'Mark Arrived',
  start_encounter: 'Start Encounter',
  finalize_record: 'Finalize Record',
  issue_prescription: 'Issue Prescription',
  schedule_followup: 'Schedule Follow-up',
  complete: 'Complete',
  complete_without_rx: 'Complete (No Rx)',
  followup_complete: 'Complete Follow-up',
  start_followup_encounter: 'Start Follow-up Encounter',
};

export function CareStateMachine({ appointment, role, onTransition }: CareStateMachineProps) {
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);

  const currentIdx = STATE_ORDER.indexOf(appointment.currentState);
  const nextTransitions = getValidNextStates(appointment.currentState, role);
  const isTerminal = TERMINAL_STATES.includes(appointment.currentState);

  return (
    <div className="care-state-machine">
      <div className="care-sm-header">
        <h3><Activity size={16} /> Care State Machine</h3>
        <span className={`status ${CARE_STATE_COLORS[appointment.currentState]}`}>
          {CARE_STATE_LABELS[appointment.currentState].toUpperCase()}
        </span>
      </div>

      <div className="care-sm-progress">
        {STATE_ORDER.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          return (
            <div
              key={s}
              className={`care-sm-step ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}
            >
              <div className="care-sm-dot">
                {isPast ? <Check size={10} /> : isCurrent ? <Clock size={10} /> : <span className="care-sm-num">{i + 1}</span>}
              </div>
              <span className="care-sm-label">{CARE_STATE_LABELS[s]}</span>
              {i < STATE_ORDER.length - 1 && <div className="care-sm-connector" />}
            </div>
          );
        })}
      </div>

      {!isTerminal && nextTransitions.length > 0 && (
        <div className="care-sm-actions">
          <p className="care-sm-actions-title">Available actions for your role:</p>
          {nextTransitions.map((t) => (
            <button
              key={`${t.to}-${t.action}`}
              className="care-sm-action-btn"
              onClick={() => {
                setSelectedTransition(t.action);
                onTransition(appointment.currentState, t.to, t.action);
              }}
            >
              <ChevronRight size={14} />
              <span>{ACTION_LABELS[t.action] ?? t.action}</span>
              <em className={`status ${CARE_STATE_COLORS[t.to]}`}>{CARE_STATE_LABELS[t.to]}</em>
            </button>
          ))}
        </div>
      )}

      {isTerminal && (
        <div className="care-sm-terminal">
          {appointment.currentState === 'COMPLETED' && <Check size={18} />}
          {(appointment.currentState === 'CANCELLED' || appointment.currentState === 'REJECTED') && <X size={18} />}
          <span>This care workflow has reached: {CARE_STATE_LABELS[appointment.currentState]}</span>
        </div>
      )}

      {!isTerminal && nextTransitions.length === 0 && (
        <div className="care-sm-no-actions">
          <ShieldCheck size={16} />
          <span>No actions available for your role at this state. Waiting for another role to act.</span>
        </div>
      )}

      {appointment.assignedDoctorId && (
        <div className="care-sm-assigned">
          <Stethoscope size={14} />
          <span>Assigned: <strong>{appointment.assignedDoctorId}</strong></span>
        </div>
      )}
    </div>
  );
}
