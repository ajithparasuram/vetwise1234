/**
 * VetWise Veterinary Care Orchestration Engine
 *
 * Typed model connecting the full care workflow:
 * Animal → Owner → Clinical context → Location/serviceability →
 * Veterinarian capability → Availability → Appointment request →
 * Administrative authorization → Assignment → Clinical encounter →
 * Clinical record → Prescription → Payment → Follow-up → Completion
 *
 * These types represent connected entities and controlled states,
 * not isolated screens. The UI consumes these to render coherent workflows.
 */

import type { Role } from './api';

// ─── Animal Context ──────────────────────────────────────────────

export interface AnimalContext {
  patientId: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  dateOfBirth: string | null;
  age: string;
  weight: string;
  color: string | null;
  markings: string | null;
  microchipNumber: string | null;
  allergies: string | null;
  existingConditions: string | null;
  medicalHistory: string | null;
  vaccinationInfo: string | null;
  medications: string | null;
  specialRequirements: string | null;
  breedingEligible: boolean;
  status: string;
  registrationDate: string;
  lastVisit: string | null;
}

// ─── Owner Context ───────────────────────────────────────────────

export interface OwnerContext {
  clientId: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  status: string;
}

// ─── Serviceability ──────────────────────────────────────────────

export interface ServiceabilityResult {
  serviceable: boolean;
  serviceAreaName: string | null;
  distanceKm: number | null;
  message: string;
  checkedAt: string;
}

// ─── Veterinarian Capability ─────────────────────────────────────

export interface VeterinarianCapability {
  doctorId: string;
  name: string;
  specialty: string;
  license: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  supportedSpecies: string[];
  supportedAppointmentTypes: string[];
  serviceAreaIds: string[];
}

// ─── Availability ────────────────────────────────────────────────

export interface AvailabilityResult {
  doctorId: string;
  available: boolean;
  nextAvailableSlot: string | null;
  reason: string | null;
}

// ─── Care State Machine ──────────────────────────────────────────

export type CareState =
  | 'REQUESTED'
  | 'SERVICEABILITY_CHECK'
  | 'PENDING_ADMIN_REVIEW'
  | 'AUTHORIZED'
  | 'ASSIGNMENT_PENDING'
  | 'DOCTOR_ASSIGNED'
  | 'DOCTOR_ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'CLINICAL_ENCOUNTER'
  | 'RECORD_FINALIZED'
  | 'PRESCRIPTION_ISSUED'
  | 'FOLLOW_UP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export interface StateTransition {
  from: CareState;
  to: CareState;
  action: string;
  allowedRoles: Role[];
  reason?: string;
}

export const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'REQUESTED', to: 'SERVICEABILITY_CHECK', action: 'check_serviceability', allowedRoles: ['client', 'frontdesk', 'admin'] },
  { from: 'REQUESTED', to: 'CANCELLED', action: 'cancel', allowedRoles: ['client', 'admin'] },
  { from: 'SERVICEABILITY_CHECK', to: 'PENDING_ADMIN_REVIEW', action: 'serviceability_passed', allowedRoles: ['frontdesk', 'admin'] },
  { from: 'SERVICEABILITY_CHECK', to: 'REJECTED', action: 'serviceability_failed', allowedRoles: ['frontdesk', 'admin'] },
  { from: 'SERVICEABILITY_CHECK', to: 'CANCELLED', action: 'cancel', allowedRoles: ['client', 'admin'] },
  { from: 'PENDING_ADMIN_REVIEW', to: 'AUTHORIZED', action: 'admin_approve', allowedRoles: ['admin'] },
  { from: 'PENDING_ADMIN_REVIEW', to: 'REJECTED', action: 'admin_reject', allowedRoles: ['admin'] },
  { from: 'AUTHORIZED', to: 'ASSIGNMENT_PENDING', action: 'start_assignment', allowedRoles: ['admin', 'frontdesk'] },
  { from: 'ASSIGNMENT_PENDING', to: 'DOCTOR_ASSIGNED', action: 'assign_doctor', allowedRoles: ['admin', 'frontdesk'] },
  { from: 'DOCTOR_ASSIGNED', to: 'DOCTOR_ACCEPTED', action: 'doctor_accept', allowedRoles: ['doctor'] },
  { from: 'DOCTOR_ASSIGNED', to: 'ASSIGNMENT_PENDING', action: 'doctor_decline', allowedRoles: ['doctor'] },
  { from: 'DOCTOR_ASSIGNED', to: 'CANCELLED', action: 'cancel', allowedRoles: ['admin'] },
  { from: 'DOCTOR_ACCEPTED', to: 'EN_ROUTE', action: 'doctor_en_route', allowedRoles: ['doctor'] },
  { from: 'DOCTOR_ACCEPTED', to: 'CANCELLED', action: 'cancel', allowedRoles: ['admin', 'client'] },
  { from: 'EN_ROUTE', to: 'ARRIVED', action: 'doctor_arrived', allowedRoles: ['doctor'] },
  { from: 'EN_ROUTE', to: 'CANCELLED', action: 'cancel', allowedRoles: ['admin'] },
  { from: 'ARRIVED', to: 'CLINICAL_ENCOUNTER', action: 'start_encounter', allowedRoles: ['doctor'] },
  { from: 'CLINICAL_ENCOUNTER', to: 'RECORD_FINALIZED', action: 'finalize_record', allowedRoles: ['doctor'] },
  { from: 'RECORD_FINALIZED', to: 'PRESCRIPTION_ISSUED', action: 'issue_prescription', allowedRoles: ['doctor'] },
  { from: 'RECORD_FINALIZED', to: 'FOLLOW_UP', action: 'schedule_followup', allowedRoles: ['doctor'] },
  { from: 'RECORD_FINALIZED', to: 'COMPLETED', action: 'complete_without_rx', allowedRoles: ['doctor'] },
  { from: 'PRESCRIPTION_ISSUED', to: 'FOLLOW_UP', action: 'schedule_followup', allowedRoles: ['doctor'] },
  { from: 'PRESCRIPTION_ISSUED', to: 'COMPLETED', action: 'complete', allowedRoles: ['doctor'] },
  { from: 'FOLLOW_UP', to: 'COMPLETED', action: 'followup_complete', allowedRoles: ['doctor'] },
  { from: 'FOLLOW_UP', to: 'CLINICAL_ENCOUNTER', action: 'start_followup_encounter', allowedRoles: ['doctor'] },
];

export function canTransition(from: CareState, to: CareState, action: string, role: Role): boolean {
  const t = VALID_TRANSITIONS.find(
    (t) => t.from === from && t.to === to && t.action === action,
  );
  if (!t) return false;
  return t.allowedRoles.includes(role);
}

export function getValidNextStates(current: CareState, role: Role): StateTransition[] {
  return VALID_TRANSITIONS.filter(
    (t) => t.from === current && t.allowedRoles.includes(role),
  );
}

export const CARE_STATE_LABELS: Record<CareState, string> = {
  REQUESTED: 'Requested',
  SERVICEABILITY_CHECK: 'Serviceability Check',
  PENDING_ADMIN_REVIEW: 'Pending Admin Review',
  AUTHORIZED: 'Authorized',
  ASSIGNMENT_PENDING: 'Assignment Pending',
  DOCTOR_ASSIGNED: 'Doctor Assigned',
  DOCTOR_ACCEPTED: 'Doctor Accepted',
  EN_ROUTE: 'En Route',
  ARRIVED: 'Arrived',
  CLINICAL_ENCOUNTER: 'Clinical Encounter',
  RECORD_FINALIZED: 'Record Finalized',
  PRESCRIPTION_ISSUED: 'Prescription Issued',
  FOLLOW_UP: 'Follow-up',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

export const CARE_STATE_COLORS: Record<CareState, string> = {
  REQUESTED: 'pending',
  SERVICEABILITY_CHECK: 'pending',
  PENDING_ADMIN_REVIEW: 'pending',
  AUTHORIZED: 'confirmed',
  ASSIGNMENT_PENDING: 'pending',
  DOCTOR_ASSIGNED: 'confirmed',
  DOCTOR_ACCEPTED: 'confirmed',
  EN_ROUTE: 'confirmed',
  ARRIVED: 'confirmed',
  CLINICAL_ENCOUNTER: 'confirmed',
  RECORD_FINALIZED: 'confirmed',
  PRESCRIPTION_ISSUED: 'confirmed',
  FOLLOW_UP: 'pending',
  COMPLETED: 'paid',
  CANCELLED: 'overdue',
  REJECTED: 'overdue',
};

// ─── Appointment State ───────────────────────────────────────────

export type UrgencyLevel = 'routine' | 'urgent' | 'critical';

export interface AppointmentState {
  appointmentId: string;
  patientId: string;
  clientId: string;
  currentState: CareState;
  reason: string;
  appointmentType: string;
  species: string;
  urgency: UrgencyLevel;
  preferredDate: string | null;
  preferredTime: string | null;
  location: string | null;
  assignedDoctorId: string | null;
  serviceabilityResult: ServiceabilityResult | null;
  createdAt: string;
  updatedAt: string;
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  critical: 'Critical',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  routine: 'confirmed',
  urgent: 'pending',
  critical: 'overdue',
};

export function isCritical(appointment: AppointmentState): boolean {
  return appointment.urgency === 'critical';
}

export function isStalled(appointment: AppointmentState): boolean {
  const stalledStates: CareState[] = ['ASSIGNMENT_PENDING', 'PENDING_ADMIN_REVIEW', 'SERVICEABILITY_CHECK'];
  if (!stalledStates.includes(appointment.currentState)) return false;
  const updated = new Date(appointment.updatedAt).getTime();
  if (Number.isNaN(updated)) return false;
  return Date.now() - updated > 1000 * 60 * 60;
}

// ─── Assignment Decision ─────────────────────────────────────────

export interface AssignmentDecisionFactor {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AssignmentDecision {
  appointmentId: string;
  selectedVeterinarian: VeterinarianCapability | null;
  decisionStatus: 'recommended' | 'assigned' | 'no_match' | 'pending';
  eligibleCandidates: VeterinarianCapability[];
  decisionFactors: AssignmentDecisionFactor[];
  timestamp: string;
  reason: string;
}

// ─── Clinical Encounter ──────────────────────────────────────────

export interface ClinicalEncounter {
  encounterId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  startedAt: string;
  endedAt: string | null;
  vitals: {
    weight?: string;
    temperature?: string;
    heartRate?: string;
    respiratoryRate?: string;
  } | null;
  presentingComplaint: string | null;
  clinicalNotes: string | null;
}

// ─── Clinical Context ────────────────────────────────────────────

export interface ClinicalContextEntry {
  type: 'visit' | 'record' | 'prescription' | 'vaccination' | 'weight' | 'condition' | 'event';
  date: string;
  title: string;
  detail: string;
  source: 'recorded' | 'ai_guidance';
  sourceLabel: string;
}

export interface ClinicalContext {
  patientId: string;
  animal: AnimalContext;
  owner: OwnerContext;
  currentAppointment: AppointmentState | null;
  entries: ClinicalContextEntry[];
  knownConditions: string[];
  recentWeight: string | null;
  lastVaccination: string | null;
  assembledAt: string;
}

// ─── Follow-up Action ────────────────────────────────────────────

export interface FollowUpAction {
  followUpId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  reason: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  createdAt: string;
}

// ─── Audit Event ─────────────────────────────────────────────────

export interface AuditEvent {
  eventId: string;
  eventType: string;
  entityId: string;
  entityType: 'appointment' | 'patient' | 'clinical_record' | 'prescription' | 'payment' | 'doctor' | 'client';
  actorId: string;
  actorRole: Role;
  timestamp: string;
  previousState: CareState | null;
  resultingState: CareState | null;
  metadata: Record<string, unknown> | null;
  correlationId: string | null;
  source: 'server' | 'offline_queue';
}
