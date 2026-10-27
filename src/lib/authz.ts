/**
 * VetWise Authorization Helpers
 *
 * Frontend authorization checks that mirror expected server-side enforcement.
 * These are NOT the authoritative source of truth — the AWS backend must
 * enforce all access control. These helpers prevent unnecessary UI exposure
 * and provide graceful degradation on 401/403 responses.
 *
 * The UI must always handle 401/403 from the backend, even if these
 * helpers return true.
 */

import type { Role } from './api';
import type { AnimalContext, OwnerContext } from './orchestration';

export interface AuthContext {
  role: Role;
  userId: string;
  doctorId?: string;
  clientId?: string;
  isApproved: boolean;
}

export function canViewAnimal(auth: AuthContext, animal: AnimalContext, owner: OwnerContext): boolean {
  if (auth.role === 'admin') return true;
  if (auth.role === 'frontdesk') return true;
  if (auth.role === 'client') return owner.clientId === auth.clientId;
  if (auth.role === 'doctor') return true; // backend enforces doctor-patient authorization
  return false;
}

export function canViewClinicalRecord(auth: AuthContext, animal: AnimalContext, owner: OwnerContext): boolean {
  if (auth.role === 'admin') return true;
  if (auth.role === 'client') return owner.clientId === auth.clientId;
  if (auth.role === 'doctor') return true; // backend enforces
  if (auth.role === 'frontdesk') return false; // front desk cannot view clinical records
  return false;
}

export function canEditClinicalRecord(auth: AuthContext): boolean {
  if (auth.role === 'doctor' && auth.isApproved) return true;
  if (auth.role === 'admin') return true;
  return false;
}

export function canApproveDoctor(auth: AuthContext): boolean {
  return auth.role === 'admin';
}

export function canViewFinancialDetail(auth: AuthContext, owner: OwnerContext): boolean {
  if (auth.role === 'admin') return true;
  if (auth.role === 'client') return owner.clientId === auth.clientId;
  if (auth.role === 'doctor') return false; // doctors see only their net amount, not platform gross/commission
  if (auth.role === 'frontdesk') return false;
  return false;
}

export function canViewPlatformFinancials(auth: AuthContext): boolean {
  return auth.role === 'admin';
}

export function canViewAuditTimeline(auth: AuthContext): boolean {
  return auth.role === 'admin' || auth.role === 'doctor';
}

export function canTransitionState(auth: AuthContext, action: string): boolean {
  const adminActions = ['admin_approve', 'admin_reject', 'start_assignment', 'assign_doctor'];
  const doctorActions = ['doctor_accept', 'doctor_decline', 'doctor_en_route', 'doctor_arrived', 'start_encounter', 'finalize_record', 'issue_prescription', 'schedule_followup', 'complete', 'complete_without_rx', 'followup_complete', 'start_followup_encounter'];
  const clientActions = ['check_serviceability', 'cancel'];
  const frontdeskActions = ['check_serviceability', 'serviceability_passed', 'serviceability_failed', 'start_assignment', 'assign_doctor'];

  if (auth.role === 'admin') return true;
  if (auth.role === 'doctor' && auth.isApproved) return doctorActions.includes(action);
  if (auth.role === 'client') return clientActions.includes(action);
  if (auth.role === 'frontdesk') return frontdeskActions.includes(action);
  return false;
}

export function canCreatePrescription(auth: AuthContext): boolean {
  return (auth.role === 'doctor' && auth.isApproved) || auth.role === 'admin';
}

export function canViewPrescription(auth: AuthContext, owner: OwnerContext): boolean {
  if (auth.role === 'admin') return true;
  if (auth.role === 'client') return owner.clientId === auth.clientId;
  if (auth.role === 'doctor') return true;
  return false;
}

export function canAccessOfflineMode(auth: AuthContext): boolean {
  return auth.role === 'doctor' && auth.isApproved;
}

export function getPermissionDeniedMessage(action: string): string {
  const messages: Record<string, string> = {
    view_animal: 'You are not authorized to view this animal record.',
    view_clinical_record: 'You are not authorized to view clinical records.',
    edit_clinical_record: 'Only approved veterinarians can edit clinical records.',
    approve_doctor: 'Only administrators can approve or reject doctor applications.',
    view_financial: 'You are not authorized to view financial details.',
    transition_state: 'You are not authorized to perform this action.',
    create_prescription: 'Only approved veterinarians can create prescriptions.',
    offline_mode: 'Only approved veterinarians can use offline clinical mode.',
  };
  return messages[action] ?? 'Permission denied.';
}
