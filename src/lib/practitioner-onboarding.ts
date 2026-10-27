/**
 * VetWise Practitioner Onboarding — Type System & State Machine
 *
 * Models the full doctor onboarding lifecycle:
 * Registration → Professional Licence Verification → Admin Approval →
 * Automated KYC → Practitioner Agreement → Electronic Signature →
 * Final Activation
 *
 * The system NEVER auto-activates a practitioner. All transitions are
 * server-validated. Frontend state is never sufficient for activation.
 *
 * MOCK FIXTURES below are clearly labelled prototype data.
 */

// ─── Onboarding Status (State Machine) ───────────────────────────

export type OnboardingStatus =
  | 'registered'
  | 'professional_verification_pending'
  | 'professional_verification_rejected'
  | 'additional_documents_required'
  | 'kyc_invited'
  | 'kyc_in_progress'
  | 'kyc_manual_review'
  | 'agreement_pending'
  | 'signature_in_progress'
  | 'activation_pending'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'withdrawn';

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  registered: 'Registered',
  professional_verification_pending: 'Professional Verification Pending',
  professional_verification_rejected: 'Professional Verification Rejected',
  additional_documents_required: 'Additional Documents Required',
  kyc_invited: 'KYC Invited',
  kyc_in_progress: 'KYC In Progress',
  kyc_manual_review: 'KYC Manual Review',
  agreement_pending: 'Agreement Pending',
  signature_in_progress: 'Signature In Progress',
  activation_pending: 'Activation Pending',
  active: 'Active',
  suspended: 'Suspended',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const ONBOARDING_STATUS_COLORS: Record<OnboardingStatus, string> = {
  registered: 'pending',
  professional_verification_pending: 'pending',
  professional_verification_rejected: 'overdue',
  additional_documents_required: 'pending',
  kyc_invited: 'pending',
  kyc_in_progress: 'pending',
  kyc_manual_review: 'overdue',
  agreement_pending: 'pending',
  signature_in_progress: 'pending',
  activation_pending: 'pending',
  active: 'paid',
  suspended: 'overdue',
  rejected: 'overdue',
  withdrawn: 'overdue',
};

export type OnboardingStage =
  | 'registration'
  | 'professional_verification'
  | 'kyc_invitation'
  | 'kyc_verification'
  | 'agreement_signing'
  | 'activation'
  | 'complete';

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  registration: 'Registration',
  professional_verification: 'Professional Verification',
  kyc_invitation: 'KYC Invitation',
  kyc_verification: 'Identity KYC',
  agreement_signing: 'Agreement & Signing',
  activation: 'Final Activation',
  complete: 'Onboarding Complete',
};

export const STATUS_TO_STAGE: Record<OnboardingStatus, OnboardingStage> = {
  registered: 'registration',
  professional_verification_pending: 'professional_verification',
  professional_verification_rejected: 'professional_verification',
  additional_documents_required: 'professional_verification',
  kyc_invited: 'kyc_invitation',
  kyc_in_progress: 'kyc_verification',
  kyc_manual_review: 'kyc_verification',
  agreement_pending: 'agreement_signing',
  signature_in_progress: 'agreement_signing',
  activation_pending: 'activation',
  active: 'complete',
  suspended: 'complete',
  rejected: 'professional_verification',
  withdrawn: 'registration',
};

// ─── Valid State Transitions (server-enforced) ───────────────────

export const VALID_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  registered: ['professional_verification_pending'],
  professional_verification_pending: ['kyc_invited', 'professional_verification_rejected', 'additional_documents_required', 'rejected'],
  professional_verification_rejected: ['professional_verification_pending', 'withdrawn'],
  additional_documents_required: ['professional_verification_pending', 'withdrawn'],
  kyc_invited: ['kyc_in_progress', 'kyc_manual_review', 'expired' as OnboardingStatus, 'withdrawn'],
  kyc_in_progress: ['kyc_manual_review', 'agreement_pending', 'kyc_invited', 'withdrawn'],
  kyc_manual_review: ['agreement_pending', 'kyc_invited', 'rejected', 'withdrawn'],
  agreement_pending: ['signature_in_progress', 'withdrawn'],
  signature_in_progress: ['activation_pending', 'agreement_pending', 'withdrawn'],
  activation_pending: ['active', 'suspended', 'rejected'],
  active: ['suspended'],
  suspended: ['active', 'rejected'],
  rejected: [],
  withdrawn: [],
};

export function canTransition(from: OnboardingStatus, to: OnboardingStatus): boolean {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function getActivationRequirements(): { requirement: string; description: string }[] {
  return [
    { requirement: 'Email & Mobile Verified', description: 'Ownership of email and mobile confirmed via OTP.' },
    { requirement: 'Professional Registration Approved', description: 'Veterinary council registration verified by an authorised VetWise reviewer.' },
    { requirement: 'Identity KYC Passed', description: 'Automated identity verification completed through an approved KYC provider.' },
    { requirement: 'Practitioner Agreement Signed', description: 'Agreement signed through a configured electronic-signature method.' },
    { requirement: 'No Compliance Holds', description: 'No unresolved suspension, compliance hold, or pending investigation.' },
  ];
}

// ─── Practitioner Record ─────────────────────────────────────────

export interface Practitioner {
  practitionerId: string;
  userId: string;
  legalName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  veterinaryCouncil: string;
  registrationNumber: string;
  qualification: string;
  yearOfQualification: string | null;
  professionalStatus: OnboardingStatus;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  duplicateRegistrationWarning: boolean;
  privacyNoticeAcknowledged: boolean;
}

// ─── Document Types ──────────────────────────────────────────────

export type DocumentType =
  | 'registration_certificate'
  | 'degree_certificate'
  | 'id_proof'
  | 'address_proof'
  | 'additional_document'
  | 'council_letter';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  registration_certificate: 'Veterinary Registration Certificate',
  degree_certificate: 'Degree Certificate',
  id_proof: 'Identity Proof',
  address_proof: 'Address Proof',
  additional_document: 'Additional Document',
  council_letter: 'Council Verification Letter',
};

export interface PractitionerDocument {
  documentId: string;
  practitionerId: string;
  documentType: DocumentType;
  fileName: string;
  contentType: string;
  fileSize: number;
  checksum: string;
  uploadedAt: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'additional_requested';
  retentionCategory: 'active' | 'archived' | 'deleted';
  privateStorageKey: string;
  reviewerId: string | null;
  reviewNotes: string | null;
}

// ─── KYC Verification ────────────────────────────────────────────

export type KycStatus =
  | 'not_started'
  | 'session_created'
  | 'in_progress'
  | 'verified'
  | 'failed'
  | 'manual_review_required'
  | 'expired'
  | 'cancelled';

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  not_started: 'Not Started',
  session_created: 'Session Created',
  in_progress: 'In Progress',
  verified: 'Verified',
  failed: 'Failed',
  manual_review_required: 'Manual Review Required',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const KYC_STATUS_COLORS: Record<KycStatus, string> = {
  not_started: 'pending',
  session_created: 'pending',
  in_progress: 'pending',
  verified: 'paid',
  failed: 'overdue',
  manual_review_required: 'overdue',
  expired: 'overdue',
  cancelled: 'overdue',
};

export type KycProvider = 'signzy' | 'surepass' | 'sandbox' | null;

export interface KycVerification {
  verificationId: string;
  practitionerId: string;
  provider: KycProvider;
  providerReference: string | null;
  verificationType: string;
  status: KycStatus;
  resultSummary: string | null;
  maskedIdentifier: string | null;
  createdAt: string;
  completedAt: string | null;
  failureCode: string | null;
  checksPerformed: string[];
}

// ─── Practitioner Agreement ──────────────────────────────────────

export type AgreementStatus =
  | 'not_started'
  | 'presented'
  | 'signing_initiated'
  | 'signed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  not_started: 'Not Started',
  presented: 'Presented',
  signing_initiated: 'Signing Initiated',
  signed: 'Signed',
  failed: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const AGREEMENT_STATUS_COLORS: Record<AgreementStatus, string> = {
  not_started: 'pending',
  presented: 'pending',
  signing_initiated: 'pending',
  signed: 'paid',
  failed: 'overdue',
  expired: 'overdue',
  cancelled: 'overdue',
};

export type SigningProvider = 'leegality' | 'sandbox' | null;

export interface PractitionerAgreement {
  agreementId: string;
  practitionerId: string;
  agreementType: string;
  agreementVersion: string;
  agreementHash: string;
  signingProvider: SigningProvider;
  signingReference: string | null;
  status: AgreementStatus;
  signedDocumentStorageKey: string | null;
  signedAt: string | null;
  effectiveAt: string | null;
  signerLegalName: string;
}

// ─── Onboarding Invitation ───────────────────────────────────────

export interface OnboardingInvitation {
  invitationId: string;
  practitionerId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  emailStatus: 'pending' | 'sent' | 'failed' | 'resent';
  resentCount: number;
}

// ─── Audit Log ───────────────────────────────────────────────────

export type AuditEventType =
  | 'practitioner_registered'
  | 'professional_verification_submitted'
  | 'professional_verification_approved'
  | 'professional_verification_rejected'
  | 'additional_documents_requested'
  | 'kyc_invitation_sent'
  | 'kyc_invitation_resent'
  | 'kyc_session_created'
  | 'kyc_completed'
  | 'kyc_failed'
  | 'kyc_manual_review'
  | 'agreement_presented'
  | 'signing_initiated'
  | 'agreement_signed'
  | 'practitioner_activated'
  | 'practitioner_suspended'
  | 'practitioner_rejected'
  | 'practitioner_withdrawn'
  | 'invitation_revoked'
  | 'invitation_expired';

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  practitioner_registered: 'Practitioner Registered',
  professional_verification_submitted: 'Verification Submitted',
  professional_verification_approved: 'Professional Verification Approved',
  professional_verification_rejected: 'Professional Verification Rejected',
  additional_documents_requested: 'Additional Documents Requested',
  kyc_invitation_sent: 'KYC Invitation Sent',
  kyc_invitation_resent: 'KYC Invitation Resent',
  kyc_session_created: 'KYC Session Created',
  kyc_completed: 'KYC Completed',
  kyc_failed: 'KYC Failed',
  kyc_manual_review: 'KYC Manual Review Required',
  agreement_presented: 'Agreement Presented',
  signing_initiated: 'Signing Initiated',
  agreement_signed: 'Agreement Signed',
  practitioner_activated: 'Practitioner Activated',
  practitioner_suspended: 'Practitioner Suspended',
  practitioner_rejected: 'Practitioner Rejected',
  practitioner_withdrawn: 'Application Withdrawn',
  invitation_revoked: 'Invitation Revoked',
  invitation_expired: 'Invitation Expired',
};

export interface OnboardingAuditLog {
  logId: string;
  actorId: string;
  actorRole: string;
  practitionerId: string;
  eventType: AuditEventType;
  previousStatus: OnboardingStatus | null;
  newStatus: OnboardingStatus;
  reason: string | null;
  correlationId: string;
  createdAt: string;
}

// ─── Reviewer Roles ──────────────────────────────────────────────

export type ReviewerRole = 'admin' | 'kyc_reviewer' | 'compliance_auditor';

export const REVIEWER_ROLE_LABELS: Record<ReviewerRole, string> = {
  admin: 'VetWise Super Administrator',
  kyc_reviewer: 'VetWise KYC Reviewer',
  compliance_auditor: 'Compliance Auditor (Read-only)',
};

export function canApproveProfessionalVerification(role: string): boolean {
  return role === 'admin';
}

export function canReviewKyc(role: string): boolean {
  return role === 'admin' || role === 'kyc_reviewer';
}

export function canViewKycDocuments(role: string): boolean {
  return role === 'admin' || role === 'kyc_reviewer';
}

export function canSuspendPractitioner(role: string): boolean {
  return role === 'admin';
}

export function canViewAuditLog(role: string): boolean {
  return role === 'admin' || role === 'kyc_reviewer' || role === 'compliance_auditor';
}

export function canViewAllPractitioners(role: string): boolean {
  return role === 'admin' || role === 'kyc_reviewer' || role === 'compliance_auditor';
}

// Hospital admins must NOT approve professional verification
export function canHospitalAdminApprove(): boolean {
  return false; // Hospital admins cannot approve professional credentials
}

// ─── Indian States ───────────────────────────────────────────────

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const VETERINARY_COUNCILS = [
  'Maharashtra Veterinary Council',
  'Karnataka Veterinary Council',
  'Delhi Veterinary Council',
  'Rajasthan Veterinary Council',
  'Tamil Nadu Veterinary Council',
  'Kerala Veterinary Council',
  'Gujarat Veterinary Council',
  'Uttar Pradesh Veterinary Council',
  'West Bengal Veterinary Council',
  'Veterinary Council of India',
  'Other State Veterinary Council',
];

// ─── Practitioner Agreement Text ─────────────────────────────────

export const PRACTITIONER_AGREEMENT_TEXT = `VETWISE PRACTITIONER AGREEMENT

Version: 1.0
Effective Date: Upon countersignature by the Practitioner

1. PARTIES

This Agreement is entered into between VetWise Technologies Pvt. Ltd. ("VetWise") and the undersigned veterinary practitioner ("Practitioner").

2. SCOPE OF SERVICES

The Practitioner agrees to provide veterinary services through the VetWise platform, including but not limited to home visits, teleconsultation, clinical examinations, prescriptions, and follow-up care, in accordance with applicable veterinary professional standards.

3. PROFESSIONAL REGISTRATION

The Practitioner warrants that they hold a valid and current registration with the appropriate Veterinary Council of India or relevant State Veterinary Council. The Practitioner shall maintain such registration throughout the term of this Agreement and notify VetWise of any suspension, revocation, or lapse within 7 days.

4. IDENTITY AND KYC

The Practitioner has completed identity verification through an approved KYC provider. The Practitioner consents to periodic re-verification as required by VetWise policy or regulatory requirements.

5. STANDARD OF CARE

The Practitioner shall exercise the degree of care, skill, and diligence that a reasonably competent veterinary practitioner would exercise in the same circumstances. The Practitioner is solely responsible for clinical decisions and professional judgment.

6. DATA PROTECTION AND PRIVACY

The Practitioner agrees to handle all patient data, client data, and clinical records in accordance with the VetWise Privacy Policy and applicable Indian data protection laws. The Practitioner shall not share, sell, or misuse any data accessed through the platform.

7. FEES AND COMMERCIAL TERMS

Platform fees and payment terms are as set forth in the applicable fee schedule provided separately. VetWise may update fees with 30 days notice.

8. ELECTRONIC SIGNATURE

The Practitioner agrees to execute this Agreement through an electronic signature method provided by VetWise's approved signing provider. The Practitioner acknowledges that their electronic signature is legally binding under the Information Technology Act, 2000.

9. TERM AND TERMINATION

This Agreement remains in effect while the Practitioner maintains an active account on the VetWise platform. Either party may terminate this Agreement with 30 days written notice. VetWise may suspend or terminate immediately for breach of professional standards, regulatory violations, or misuse of platform data.

10. CONFIDENTIALITY

The Practitioner shall maintain confidentiality of all proprietary information of VetWise, including platform technology, business processes, and fee structures.

11. INDEMNIFICATION

The Practitioner indemnifies VetWise against claims arising from the Practitioner's professional negligence, regulatory violations, or breach of this Agreement.

12. GOVERNING LAW

This Agreement is governed by the laws of India. Disputes shall be resolved in the courts of Mumbai, Maharashtra.

13. AMENDMENTS

VetWise may amend this Agreement with 30 days notice. Continued use of the platform after the effective date constitutes acceptance of amendments.

By signing below, the Practitioner acknowledges that they have read, understood, and agreed to all terms of this Agreement.`;

// ─── MOCK FIXTURES (Prototype Data) ──────────────────────────────

export const MOCK_PRACTITIONERS: Practitioner[] = [
  {
    practitionerId: 'PRAC-001', userId: 'usr-001',
    legalName: 'Dr. Meera Iyer', email: 'meera.iyer@vetwise.com', phone: '+91 9811122334',
    country: 'India', state: 'Karnataka', veterinaryCouncil: 'Karnataka Veterinary Council',
    registrationNumber: 'KAR-VC-2019-4521', qualification: 'BVSc & AH',
    yearOfQualification: '2018', professionalStatus: 'professional_verification_pending',
    onboardingStatus: 'professional_verification_pending',
    createdAt: '2026-09-25T10:00:00', updatedAt: '2026-09-25T10:00:00',
    activatedAt: null, duplicateRegistrationWarning: false, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-002', userId: 'usr-002',
    legalName: 'Dr. Rohan Gupta', email: 'rohan.gupta@vetwise.com', phone: '+91 9822334455',
    country: 'India', state: 'Rajasthan', veterinaryCouncil: 'Rajasthan Veterinary Council',
    registrationNumber: 'RAJ-VC-2020-8832', qualification: 'MVSc (Surgery)',
    yearOfQualification: '2019', professionalStatus: 'kyc_in_progress',
    onboardingStatus: 'kyc_in_progress',
    createdAt: '2026-09-20T14:00:00', updatedAt: '2026-09-28T16:00:00',
    activatedAt: null, duplicateRegistrationWarning: false, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-003', userId: 'usr-003',
    legalName: 'Dr. Sanjana Reddy', email: 'sanjana.reddy@vetwise.com', phone: '+91 9833445566',
    country: 'India', state: 'Telangana', veterinaryCouncil: 'Telangana Veterinary Council',
    registrationNumber: 'TEL-VC-2017-2201', qualification: 'BVSc & AH',
    yearOfQualification: '2016', professionalStatus: 'active',
    onboardingStatus: 'active',
    createdAt: '2026-08-01T09:00:00', updatedAt: '2026-09-15T12:00:00',
    activatedAt: '2026-09-15T12:00:00', duplicateRegistrationWarning: false, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-004', userId: 'usr-004',
    legalName: 'Dr. Arjun Nair', email: 'arjun.nair@vetwise.com', phone: '+91 9844556677',
    country: 'India', state: 'Kerala', veterinaryCouncil: 'Kerala Veterinary Council',
    registrationNumber: 'KER-VC-2021-5588', qualification: 'BVSc & AH',
    yearOfQualification: '2020', professionalStatus: 'agreement_pending',
    onboardingStatus: 'agreement_pending',
    createdAt: '2026-09-10T11:00:00', updatedAt: '2026-09-28T10:00:00',
    activatedAt: null, duplicateRegistrationWarning: false, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-005', userId: 'usr-005',
    legalName: 'Dr. Pooja Bhatt', email: 'pooja.bhatt@vetwise.com', phone: '+91 9855667788',
    country: 'India', state: 'Maharashtra', veterinaryCouncil: 'Maharashtra Veterinary Council',
    registrationNumber: 'MAH-VC-2018-1234', qualification: 'MVSc (Medicine)',
    yearOfQualification: '2017', professionalStatus: 'additional_documents_required',
    onboardingStatus: 'additional_documents_required',
    createdAt: '2026-09-05T08:00:00', updatedAt: '2026-09-26T15:00:00',
    activatedAt: null, duplicateRegistrationWarning: true, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-006', userId: 'usr-006',
    legalName: 'Dr. Vivek Joshi', email: 'vivek.joshi@vetwise.com', phone: '+91 9866778899',
    country: 'India', state: 'Maharashtra', veterinaryCouncil: 'Maharashtra Veterinary Council',
    registrationNumber: 'MAH-VC-2018-1234', qualification: 'BVSc & AH',
    yearOfQualification: '2017', professionalStatus: 'professional_verification_pending',
    onboardingStatus: 'professional_verification_pending',
    createdAt: '2026-09-22T13:00:00', updatedAt: '2026-09-22T13:00:00',
    activatedAt: null, duplicateRegistrationWarning: true, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-007', userId: 'usr-007',
    legalName: 'Dr. Kavya Sharma', email: 'kavya.sharma@vetwise.com', phone: '+91 9877889900',
    country: 'India', state: 'Delhi', veterinaryCouncil: 'Delhi Veterinary Council',
    registrationNumber: 'DEL-VC-2020-3344', qualification: 'BVSc & AH',
    yearOfQualification: '2019', professionalStatus: 'kyc_manual_review',
    onboardingStatus: 'kyc_manual_review',
    createdAt: '2026-09-18T09:00:00', updatedAt: '2026-09-27T14:00:00',
    activatedAt: null, duplicateRegistrationWarning: false, privacyNoticeAcknowledged: true,
  },
  {
    practitionerId: 'PRAC-008', userId: 'usr-008',
    legalName: 'Dr. Aditya Verma', email: 'aditya.verma@vetwise.com', phone: '+91 9888990011',
    country: 'India', state: 'Uttar Pradesh', veterinaryCouncil: 'Uttar Pradesh Veterinary Council',
    registrationNumber: 'UP-VC-2016-7799', qualification: 'MVSc (Surgery)',
    yearOfQualification: '2015', professionalStatus: 'suspended',
    onboardingStatus: 'suspended',
    createdAt: '2026-07-10T10:00:00', updatedAt: '2026-09-20T16:00:00',
    activatedAt: '2026-08-01T10:00:00', duplicateRegistrationWarning: false, privacyNoticeAcknowledged: true,
  },
];

export const MOCK_DOCUMENTS: Record<string, PractitionerDocument[]> = {
  'PRAC-001': [
    { documentId: 'DOC-001-1', practitionerId: 'PRAC-001', documentType: 'registration_certificate', fileName: 'KAR-VC-2019-4521-certificate.pdf', contentType: 'application/pdf', fileSize: 245678, checksum: 'sha256:a1b2c3', uploadedAt: '2026-09-25T10:05:00', reviewStatus: 'pending', retentionCategory: 'active', privateStorageKey: 'private/prac-001/reg-cert.pdf', reviewerId: null, reviewNotes: null },
    { documentId: 'DOC-001-2', practitionerId: 'PRAC-001', documentType: 'degree_certificate', fileName: 'BVSc-degree.pdf', contentType: 'application/pdf', fileSize: 189234, checksum: 'sha256:d4e5f6', uploadedAt: '2026-09-25T10:06:00', reviewStatus: 'pending', retentionCategory: 'active', privateStorageKey: 'private/prac-001/degree.pdf', reviewerId: null, reviewNotes: null },
  ],
  'PRAC-002': [
    { documentId: 'DOC-002-1', practitionerId: 'PRAC-002', documentType: 'registration_certificate', fileName: 'RAJ-VC-2020-8832-cert.pdf', contentType: 'application/pdf', fileSize: 312456, checksum: 'sha256:g7h8i9', uploadedAt: '2026-09-20T14:05:00', reviewStatus: 'approved', retentionCategory: 'active', privateStorageKey: 'private/prac-002/reg-cert.pdf', reviewerId: 'admin@vetwise.com', reviewNotes: 'Verified against council registry.' },
  ],
  'PRAC-005': [
    { documentId: 'DOC-005-1', practitionerId: 'PRAC-005', documentType: 'registration_certificate', fileName: 'MAH-VC-2018-1234.pdf', contentType: 'application/pdf', fileSize: 278900, checksum: 'sha256:j1k2l3', uploadedAt: '2026-09-05T08:05:00', reviewStatus: 'additional_requested', retentionCategory: 'active', privateStorageKey: 'private/prac-005/reg-cert.pdf', reviewerId: 'admin@vetwise.com', reviewNotes: 'Certificate image unclear. Please re-upload a legible copy.' },
  ],
};

export const MOCK_KYC: Record<string, KycVerification> = {
  'PRAC-002': {
    verificationId: 'KYC-002', practitionerId: 'PRAC-002', provider: 'sandbox',
    providerReference: 'SANDBOX-REF-002', verificationType: 'PAN + Selfie',
    status: 'in_progress', resultSummary: null, maskedIdentifier: 'XXXXX1234A',
    createdAt: '2026-09-28T15:00:00', completedAt: null, failureCode: null,
    checksPerformed: ['pan_validation', 'selfie_comparison', 'name_match'],
  },
  'PRAC-003': {
    verificationId: 'KYC-003', practitionerId: 'PRAC-003', provider: 'sandbox',
    providerReference: 'SANDBOX-REF-003', verificationType: 'PAN + Selfie + Liveness',
    status: 'verified', resultSummary: 'All checks passed. Name matched. Liveness confirmed.',
    maskedIdentifier: 'XXXXX6789B', createdAt: '2026-09-14T10:00:00',
    completedAt: '2026-09-14T10:15:00', failureCode: null,
    checksPerformed: ['pan_validation', 'selfie_comparison', 'name_match', 'liveness_detection'],
  },
  'PRAC-007': {
    verificationId: 'KYC-007', practitionerId: 'PRAC-007', provider: 'sandbox',
    providerReference: 'SANDBOX-REF-007', verificationType: 'PAN + ID Document',
    status: 'manual_review_required', resultSummary: 'Name mismatch between PAN and registration. Selfie liveness inconclusive.',
    maskedIdentifier: 'XXXXX3344C', createdAt: '2026-09-26T12:00:00',
    completedAt: '2026-09-27T14:00:00', failureCode: 'NAME_MISMATCH',
    checksPerformed: ['pan_validation', 'name_match', 'id_document_verification'],
  },
  'PRAC-004': {
    verificationId: 'KYC-004', practitionerId: 'PRAC-004', provider: 'sandbox',
    providerReference: 'SANDBOX-REF-004', verificationType: 'PAN + Selfie',
    status: 'verified', resultSummary: 'All checks passed.',
    maskedIdentifier: 'XXXXX5588D', createdAt: '2026-09-27T09:00:00',
    completedAt: '2026-09-27T09:20:00', failureCode: null,
    checksPerformed: ['pan_validation', 'selfie_comparison', 'name_match'],
  },
};

export const MOCK_AGREEMENTS: Record<string, PractitionerAgreement> = {
  'PRAC-003': {
    agreementId: 'AGR-003', practitionerId: 'PRAC-003', agreementType: 'VetWise Practitioner Agreement',
    agreementVersion: '1.0', agreementHash: 'sha256:abc123def456',
    signingProvider: 'sandbox', signingReference: 'SIGN-REF-003',
    status: 'signed', signedDocumentStorageKey: 'private/prac-003/signed-agreement.pdf',
    signedAt: '2026-09-15T11:50:00', effectiveAt: '2026-09-15T12:00:00',
    signerLegalName: 'Dr. Sanjana Reddy',
  },
  'PRAC-004': {
    agreementId: 'AGR-004', practitionerId: 'PRAC-004', agreementType: 'VetWise Practitioner Agreement',
    agreementVersion: '1.0', agreementHash: 'sha256:abc123def456',
    signingProvider: null, signingReference: null,
    status: 'presented', signedDocumentStorageKey: null,
    signedAt: null, effectiveAt: null,
    signerLegalName: 'Dr. Arjun Nair',
  },
};

export const MOCK_INVITATIONS: Record<string, OnboardingInvitation> = {
  'PRAC-002': {
    invitationId: 'INV-002', practitionerId: 'PRAC-002', tokenHash: 'sha256:token-hash-002',
    expiresAt: '2026-10-05T15:00:00', usedAt: '2026-09-28T15:00:00', revokedAt: null,
    createdAt: '2026-09-26T12:00:00', emailStatus: 'sent', resentCount: 0,
  },
  'PRAC-004': {
    invitationId: 'INV-004', practitionerId: 'PRAC-004', tokenHash: 'sha256:token-hash-004',
    expiresAt: '2026-10-04T09:00:00', usedAt: '2026-09-27T09:00:00', revokedAt: null,
    createdAt: '2026-09-25T10:00:00', emailStatus: 'sent', resentCount: 1,
  },
  'PRAC-007': {
    invitationId: 'INV-007', practitionerId: 'PRAC-007', tokenHash: 'sha256:token-hash-007',
    expiresAt: '2026-10-03T12:00:00', usedAt: '2026-09-26T12:00:00', revokedAt: null,
    createdAt: '2026-09-24T10:00:00', emailStatus: 'sent', resentCount: 0,
  },
};

export const MOCK_AUDIT_LOGS: OnboardingAuditLog[] = [
  { logId: 'LOG-001', actorId: 'meera.iyer@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-001', eventType: 'practitioner_registered', previousStatus: null, newStatus: 'registered', reason: null, correlationId: 'corr-001', createdAt: '2026-09-25T10:00:00' },
  { logId: 'LOG-002', actorId: 'meera.iyer@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-001', eventType: 'professional_verification_submitted', previousStatus: 'registered', newStatus: 'professional_verification_pending', reason: null, correlationId: 'corr-001', createdAt: '2026-09-25T10:06:00' },
  { logId: 'LOG-003', actorId: 'admin@vetwise.com', actorRole: 'admin', practitionerId: 'PRAC-003', eventType: 'professional_verification_approved', previousStatus: 'professional_verification_pending', newStatus: 'kyc_invited', reason: 'Registration verified against Telangana Veterinary Council registry.', correlationId: 'corr-003', createdAt: '2026-09-13T14:00:00' },
  { logId: 'LOG-004', actorId: 'system', actorRole: 'admin', practitionerId: 'PRAC-003', eventType: 'kyc_invitation_sent', previousStatus: 'kyc_invited', newStatus: 'kyc_invited', reason: null, correlationId: 'corr-003', createdAt: '2026-09-13T14:05:00' },
  { logId: 'LOG-005', actorId: 'system', actorRole: 'admin', practitionerId: 'PRAC-003', eventType: 'kyc_completed', previousStatus: 'kyc_in_progress', newStatus: 'agreement_pending', reason: 'All KYC checks passed.', correlationId: 'corr-003', createdAt: '2026-09-14T10:15:00' },
  { logId: 'LOG-006', actorId: 'sanjana.reddy@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-003', eventType: 'agreement_signed', previousStatus: 'signature_in_progress', newStatus: 'activation_pending', reason: null, correlationId: 'corr-003', createdAt: '2026-09-15T11:50:00' },
  { logId: 'LOG-007', actorId: 'system', actorRole: 'admin', practitionerId: 'PRAC-003', eventType: 'practitioner_activated', previousStatus: 'activation_pending', newStatus: 'active', reason: 'All requirements satisfied. Auto-activation triggered.', correlationId: 'corr-003', createdAt: '2026-09-15T12:00:00' },
  { logId: 'LOG-008', actorId: 'admin@vetwise.com', actorRole: 'admin', practitionerId: 'PRAC-005', eventType: 'additional_documents_requested', previousStatus: 'professional_verification_pending', newStatus: 'additional_documents_required', reason: 'Registration certificate image unclear. Duplicate registration number detected — requires clarification.', correlationId: 'corr-005', createdAt: '2026-09-26T15:00:00' },
  { logId: 'LOG-009', actorId: 'admin@vetwise.com', actorRole: 'admin', practitionerId: 'PRAC-007', eventType: 'kyc_manual_review', previousStatus: 'kyc_in_progress', newStatus: 'kyc_manual_review', reason: 'Name mismatch between PAN and veterinary council registration. Liveness check inconclusive.', correlationId: 'corr-007', createdAt: '2026-09-27T14:00:00' },
  { logId: 'LOG-010', actorId: 'admin@vetwise.com', actorRole: 'admin', practitionerId: 'PRAC-008', eventType: 'practitioner_suspended', previousStatus: 'active', newStatus: 'suspended', reason: 'Complaint received regarding prescription practices. Investigation pending.', correlationId: 'corr-008', createdAt: '2026-09-20T16:00:00' },
  { logId: 'LOG-011', actorId: 'rohan.gupta@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-002', eventType: 'professional_verification_submitted', previousStatus: 'registered', newStatus: 'professional_verification_pending', reason: null, correlationId: 'corr-002', createdAt: '2026-09-20T14:05:00' },
  { logId: 'LOG-012', actorId: 'admin@vetwise.com', actorRole: 'admin', practitionerId: 'PRAC-002', eventType: 'professional_verification_approved', previousStatus: 'professional_verification_pending', newStatus: 'kyc_invited', reason: 'Rajasthan Veterinary Council registration verified.', correlationId: 'corr-002', createdAt: '2026-09-26T12:00:00' },
  { logId: 'LOG-013', actorId: 'system', actorRole: 'admin', practitionerId: 'PRAC-002', eventType: 'kyc_session_created', previousStatus: 'kyc_invited', newStatus: 'kyc_in_progress', reason: 'Sandbox KYC session created.', correlationId: 'corr-002', createdAt: '2026-09-28T15:00:00' },
  { logId: 'LOG-014', actorId: 'arjun.nair@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-004', eventType: 'professional_verification_submitted', previousStatus: 'registered', newStatus: 'professional_verification_pending', reason: null, correlationId: 'corr-004', createdAt: '2026-09-10T11:05:00' },
  { logId: 'LOG-015', actorId: 'admin@vetwise.com', actorRole: 'admin', practitionerId: 'PRAC-004', eventType: 'professional_verification_approved', previousStatus: 'professional_verification_pending', newStatus: 'kyc_invited', reason: 'Kerala Veterinary Council registration verified.', correlationId: 'corr-004', createdAt: '2026-09-25T10:00:00' },
  { logId: 'LOG-016', actorId: 'system', actorRole: 'admin', practitionerId: 'PRAC-004', eventType: 'kyc_completed', previousStatus: 'kyc_in_progress', newStatus: 'agreement_pending', reason: 'All KYC checks passed.', correlationId: 'corr-004', createdAt: '2026-09-27T09:20:00' },
  { logId: 'LOG-017', actorId: 'vivek.joshi@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-006', eventType: 'practitioner_registered', previousStatus: null, newStatus: 'registered', reason: null, correlationId: 'corr-006', createdAt: '2026-09-22T13:00:00' },
  { logId: 'LOG-018', actorId: 'vivek.joshi@vetwise.com', actorRole: 'doctor', practitionerId: 'PRAC-006', eventType: 'professional_verification_submitted', previousStatus: 'registered', newStatus: 'professional_verification_pending', reason: null, correlationId: 'corr-006', createdAt: '2026-09-22T13:05:00' },
];
