/**
 * Animal Identity Resolution — Type System & Mock Fixtures
 *
 * These types model the identity-resolution workflow for detecting
 * potentially duplicated animal profiles, examining evidence and
 * provenance, and resolving uncertain identity matches safely.
 *
 * The system NEVER automatically merges animal identities solely
 * because names, owner details, phone numbers, breed or other
 * attributes match. All resolutions require human review.
 *
 * MOCK FIXTURES: The data below is clearly labelled prototype data.
 * No live patient records are used. No mock data is seeded into
 * production APIs or databases.
 */

// ─── Identity Status ─────────────────────────────────────────────

export type IdentityStatus =
  | 'confirmed_identity'
  | 'possible_duplicate'
  | 'conflicting_evidence'
  | 'unverified_history'
  | 'pending_review'
  | 'approved_merge'
  | 'reversed_merge'
  | 'confirmed_different';

export type ReviewPriority = 'high' | 'medium' | 'low';

export type MatchConfidenceLevel = 'strong' | 'moderate' | 'weak' | 'unknown';

// ─── Animal Profile Summary ──────────────────────────────────────

export interface AnimalProfileSummary {
  profileId: string;
  animalName: string;
  species: string;
  breed: string | null;
  sex: string | null;
  ageOrDob: string | null;
  ownerName: string;
  ownerPhone: string;
  facilityName: string;
  sourceSystem: string;
  registrationDate: string;
  lastUpdated: string;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  microchipNumber: string | null;
}

// ─── Identity Candidate (Potential Match Pair) ───────────────────

export interface IdentityCandidate {
  candidateId: string;
  profileA: AnimalProfileSummary;
  profileB: AnimalProfileSummary;
  matchStatus: IdentityStatus;
  reviewPriority: ReviewPriority;
  matchConfidence: MatchConfidenceLevel;
  matchConfidenceNote: string;
  hasConflicts: boolean;
  evidenceAvailable: boolean;
  reviewStatus: 'unreviewed' | 'under_review' | 'resolved' | 'escalated';
  reviewerId: string | null;
  lastUpdated: string;
  flaggedAt: string;
}

// ─── Evidence Items ──────────────────────────────────────────────

export type EvidenceCategory =
  | 'stable_identifier'
  | 'name_aliases'
  | 'species_breed'
  | 'sex_attributes'
  | 'date_of_birth'
  | 'owner_association'
  | 'source_facility'
  | 'clinical_history_overlap'
  | 'contradictory_identity'
  | 'record_provenance';

export type FieldAgreement = 'agree' | 'conflict' | 'missing_a' | 'missing_b' | 'missing_both';

export interface EvidenceItem {
  evidenceId: string;
  category: EvidenceCategory;
  fieldName: string;
  fieldLabel: string;
  valueA: string | null;
  valueB: string | null;
  agreement: FieldAgreement;
  sourceA: string;
  sourceB: string;
  verificationStatusA: 'verified' | 'unverified' | 'pending';
  verificationStatusB: 'verified' | 'unverified' | 'pending';
  timestampA: string | null;
  timestampB: string | null;
  significance: string;
}

// ─── Clinical History Event (for reconciliation) ─────────────────

export type ClinicalEventType =
  | 'appointment'
  | 'examination'
  | 'prescription'
  | 'diagnosis'
  | 'vaccination'
  | 'clinical_document'
  | 'weight_record'
  | 'lab_result';

export type EventRelationType =
  | 'unique_event'
  | 'possible_duplicate'
  | 'corrected_version'
  | 'conflicting_event'
  | 'uncertain_attribution';

export interface ClinicalHistoryEvent {
  eventId: string;
  eventType: ClinicalEventType;
  eventDate: string;
  recordedTimestamp: string;
  sourceFacility: string;
  sourceRecordRef: string;
  authorOrClinician: string | null;
  profileId: string;
  title: string;
  description: string;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  revisionId: string | null;
  relationType: EventRelationType;
  relatedEventId: string | null;
}

// ─── Resolution Decision ─────────────────────────────────────────

export type ResolutionDecisionType =
  | 'confirm_same_animal'
  | 'confirm_different_animals'
  | 'insufficient_evidence'
  | 'escalate_conflict'
  | 'correct_identity_attribution'
  | 'merge_approved';

export interface ResolutionDecision {
  resolutionId: string;
  candidateId: string;
  decisionType: ResolutionDecisionType;
  reviewerId: string;
  reviewerRole: string;
  timestamp: string;
  reason: string;
  evidenceReviewed: string[];
  affectedProfiles: string[];
  backendOperationId: string | null;
  status: 'pending_backend' | 'backend_confirmed' | 'backend_failed' | 'prototype';
  notes: string | null;
}

// ─── Merge Proposal ──────────────────────────────────────────────

export interface MergeFieldProposal {
  fieldName: string;
  fieldLabel: string;
  valueA: string | null;
  valueB: string | null;
  proposedCanonicalValue: string;
  source: 'A' | 'B' | 'manual';
  hasConflict: boolean;
}

export interface MergeProposal {
  candidateId: string;
  canonicalProfileId: string;
  mergedProfileId: string;
  fieldProposals: MergeFieldProposal[];
  affectedEventCount: number;
  unresolvedItems: string[];
  requiresBackendSupport: boolean;
}

// ─── Relationship Node (for provenance tracing) ──────────────────

export interface RelationshipNode {
  nodeId: string;
  nodeType: 'animal_profile' | 'owner' | 'clinical_event' | 'source_facility' | 'source_record' | 'revision' | 'reconciliation_decision';
  label: string;
  sublabel: string | null;
  status: string | null;
}

export interface RelationshipEdge {
  fromNodeId: string;
  toNodeId: string;
  label: string;
}

// ─── Authorization ───────────────────────────────────────────────

export function canAccessIdentityResolution(role: string): boolean {
  return role === 'admin' || role === 'doctor';
}

export function canReviewIdentityCases(role: string, isApproved: boolean): boolean {
  if (role === 'admin') return true;
  if (role === 'doctor' && isApproved) return true;
  return false;
}

export function canApproveMerges(role: string): boolean {
  return role === 'admin';
}

export function canEscalateCases(role: string): boolean {
  return role === 'admin' || role === 'doctor';
}

// ─── MOCK FIXTURES (Prototype Data) ──────────────────────────────
// Clearly labelled prototype fixtures for testing the UI.
// These are NOT real patient records.

export const MOCK_CANDIDATES: IdentityCandidate[] = [
  {
    candidateId: 'CAND-001',
    profileA: {
      profileId: 'VW-CL-000003-P01', animalName: 'Sheru', species: 'Dog', breed: 'German Shepherd',
      sex: 'Male', ageOrDob: '2022-03-15', ownerName: 'Rajesh Kumar', ownerPhone: '+91 98765 43210',
      facilityName: 'VetWise Mumbai', sourceSystem: 'VetWise Portal', registrationDate: '2023-08-12',
      lastUpdated: '2026-09-20', verificationStatus: 'verified', microchipNumber: '985112003456789',
    },
    profileB: {
      profileId: 'VW-CL-000007-P02', animalName: 'Sheru Singh', species: 'Dog', breed: 'German Shepherd',
      sex: 'Male', ageOrDob: '2022-03-15', ownerName: 'Rajesh Kumar', ownerPhone: '+91 98765 43210',
      facilityName: 'VetWise Pune', sourceSystem: 'Imported Record', registrationDate: '2024-01-10',
      lastUpdated: '2026-09-22', verificationStatus: 'unverified', microchipNumber: '985112003456789',
    },
    matchStatus: 'possible_duplicate',
    reviewPriority: 'high',
    matchConfidence: 'strong',
    matchConfidenceNote: 'Prototype estimate — same microchip identifier and matching owner. Different names and source facilities require human review.',
    hasConflicts: false,
    evidenceAvailable: true,
    reviewStatus: 'unreviewed',
    reviewerId: null,
    lastUpdated: '2026-09-22',
    flaggedAt: '2026-09-22T10:00:00',
  },
  {
    candidateId: 'CAND-002',
    profileA: {
      profileId: 'VW-CL-000001-P02', animalName: 'Luna', species: 'Cat', breed: 'Persian',
      sex: 'Female', ageOrDob: '2023-06-01', ownerName: 'Priya Sharma', ownerPhone: '+91 98765 43210',
      facilityName: 'VetWise Mumbai', sourceSystem: 'VetWise Portal', registrationDate: '2023-09-15',
      lastUpdated: '2026-09-15', verificationStatus: 'verified', microchipNumber: '985112009876543',
    },
    profileB: {
      profileId: 'VW-CL-000005-P01', animalName: 'Luna', species: 'Cat', breed: 'Persian',
      sex: 'Female', ageOrDob: '2023-06-01', ownerName: 'Priya Sharma', ownerPhone: '+91 99876 54321',
      facilityName: 'VetWise Delhi', sourceSystem: 'Imported Record', registrationDate: '2024-03-20',
      lastUpdated: '2026-09-18', verificationStatus: 'unverified', microchipNumber: '985112007654321',
    },
    matchStatus: 'conflicting_evidence',
    reviewPriority: 'high',
    matchConfidence: 'moderate',
    matchConfidenceNote: 'Prototype estimate — same name, species, breed, and owner name, but different microchip numbers and phone numbers. Conflict requires human review.',
    hasConflicts: true,
    evidenceAvailable: true,
    reviewStatus: 'unreviewed',
    reviewerId: null,
    lastUpdated: '2026-09-18',
    flaggedAt: '2026-09-18T14:30:00',
  },
  {
    candidateId: 'CAND-003',
    profileA: {
      profileId: 'VW-CL-000002-P01', animalName: 'Max', species: 'Dog', breed: 'Labrador Retriever',
      sex: 'Male', ageOrDob: '2021-11-20', ownerName: 'Amit Patel', ownerPhone: '+91 90123 45678',
      facilityName: 'VetWise Mumbai', sourceSystem: 'VetWise Portal', registrationDate: '2022-05-10',
      lastUpdated: '2026-08-30', verificationStatus: 'verified', microchipNumber: '985112001111222',
    },
    profileB: {
      profileId: 'VW-CL-000009-P03', animalName: 'Max', species: 'Dog', breed: 'Golden Retriever',
      sex: 'Male', ageOrDob: '2021-11-20', ownerName: 'Amit Patel', ownerPhone: '+91 90123 45678',
      facilityName: 'VetWise Mumbai', sourceSystem: 'VetWise Portal', registrationDate: '2025-02-14',
      lastUpdated: '2026-09-01', verificationStatus: 'pending', microchipNumber: null,
    },
    matchStatus: 'conflicting_evidence',
    reviewPriority: 'medium',
    matchConfidence: 'weak',
    matchConfidenceNote: 'Prototype estimate — same name, owner, DOB, and species, but different breeds. Missing microchip on profile B. Could be two dogs owned by the same person.',
    hasConflicts: true,
    evidenceAvailable: true,
    reviewStatus: 'unreviewed',
    reviewerId: null,
    lastUpdated: '2026-09-01',
    flaggedAt: '2026-09-01T09:15:00',
  },
  {
    candidateId: 'CAND-004',
    profileA: {
      profileId: 'VW-CL-000004-P01', animalName: 'Bella', species: 'Cow', breed: 'Gir',
      sex: 'Female', ageOrDob: '2020-04-10', ownerName: 'Suresh Gowda', ownerPhone: '+91 80876 54321',
      facilityName: 'VetWise Rural Centre', sourceSystem: 'Field Registration', registrationDate: '2021-01-15',
      lastUpdated: '2026-07-20', verificationStatus: 'unverified', microchipNumber: null,
    },
    profileB: {
      profileId: 'VW-CL-000011-P01', animalName: 'Belli', species: 'Cow', breed: 'Gir',
      sex: 'Female', ageOrDob: null, ownerName: 'Suresh Gowda', ownerPhone: '+91 80876 54321',
      facilityName: 'VetWise Rural Centre', sourceSystem: 'Field Registration', registrationDate: '2024-06-05',
      lastUpdated: '2026-08-10', verificationStatus: 'unverified', microchipNumber: null,
    },
    matchStatus: 'pending_review',
    reviewPriority: 'low',
    matchConfidence: 'unknown',
    matchConfidenceNote: 'Prototype estimate — incomplete identity evidence. No microchip on either record. Similar names and same owner. Insufficient evidence to determine if same animal.',
    hasConflicts: false,
    evidenceAvailable: false,
    reviewStatus: 'unreviewed',
    reviewerId: null,
    lastUpdated: '2026-08-10',
    flaggedAt: '2026-08-10T11:00:00',
  },
  {
    candidateId: 'CAND-005',
    profileA: {
      profileId: 'VW-CL-000006-P01', animalName: 'Rocky', species: 'Dog', breed: 'Rottweiler',
      sex: 'Male', ageOrDob: '2019-09-25', ownerName: 'Deepak Singh', ownerPhone: '+91 99100 99000',
      facilityName: 'VetWise Delhi', sourceSystem: 'VetWise Portal', registrationDate: '2020-03-01',
      lastUpdated: '2026-06-15', verificationStatus: 'verified', microchipNumber: '985112005556666',
    },
    profileB: {
      profileId: 'VW-CL-000012-P02', animalName: 'Rocky', species: 'Dog', breed: 'Rottweiler',
      sex: 'Male', ageOrDob: '2019-09-25', ownerName: 'Deepak Singh', ownerPhone: '+91 99100 99000',
      facilityName: 'VetWise Jaipur', sourceSystem: 'Imported Record', registrationDate: '2025-11-20',
      lastUpdated: '2026-09-25', verificationStatus: 'verified', microchipNumber: '985112005556666',
    },
    matchStatus: 'approved_merge',
    reviewPriority: 'low',
    matchConfidence: 'strong',
    matchConfidenceNote: 'Previously resolved — matching microchip, owner, species, breed, DOB. Merge approved on 2026-09-25. New contradictory evidence may warrant reopening.',
    hasConflicts: false,
    evidenceAvailable: true,
    reviewStatus: 'resolved',
    reviewerId: 'admin@vetwise.com',
    lastUpdated: '2026-09-25',
    flaggedAt: '2026-09-25T08:00:00',
  },
  {
    candidateId: 'CAND-006',
    profileA: {
      profileId: 'VW-CL-000008-P01', animalName: 'Tiger', species: 'Cat', breed: 'Mixed Breed',
      sex: 'Male', ageOrDob: '2022-01-10', ownerName: 'Meera Nair', ownerPhone: '+91 90909 80808',
      facilityName: 'VetWise Mumbai', sourceSystem: 'VetWise Portal', registrationDate: '2023-04-18',
      lastUpdated: '2026-09-28', verificationStatus: 'verified', microchipNumber: null,
    },
    profileB: {
      profileId: 'VW-CL-000010-P01', animalName: 'Tiger', species: 'Cat', breed: 'Mixed Breed',
      sex: 'Female', ageOrDob: '2022-01-10', ownerName: 'Meera Nair', ownerPhone: '+91 90909 80808',
      facilityName: 'VetWise Mumbai', sourceSystem: 'VetWise Portal', registrationDate: '2025-07-22',
      lastUpdated: '2026-09-28', verificationStatus: 'verified', microchipNumber: null,
    },
    matchStatus: 'conflicting_evidence',
    reviewPriority: 'high',
    matchConfidence: 'moderate',
    matchConfidenceNote: 'Prototype estimate — same name, breed, DOB, owner. Conflicting sex (Male vs Female). No microchip on either record. Likely different cats owned by the same person, but requires verification.',
    hasConflicts: true,
    evidenceAvailable: true,
    reviewStatus: 'escalated',
    reviewerId: 'dr.anita@vetwise.com',
    lastUpdated: '2026-09-28',
    flaggedAt: '2026-09-28T15:45:00',
  },
];

// ─── Evidence Fixtures ───────────────────────────────────────────

export const MOCK_EVIDENCE: Record<string, EvidenceItem[]> = {
  'CAND-001': [
    { evidenceId: 'EV-001-1', category: 'stable_identifier', fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: '985112003456789', valueB: '985112003456789', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-08-12', timestampB: '2024-01-10', significance: 'Stable identifier — strongest evidence if verified on both sides.' },
    { evidenceId: 'EV-001-2', category: 'name_aliases', fieldName: 'animalName', fieldLabel: 'Animal Name', valueA: 'Sheru', valueB: 'Sheru Singh', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-08-12', timestampB: '2024-01-10', significance: 'Names differ but could be aliases. Name alone does not confirm or deny identity.' },
    { evidenceId: 'EV-001-3', category: 'species_breed', fieldName: 'breed', fieldLabel: 'Breed', valueA: 'German Shepherd', valueB: 'German Shepherd', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-08-12', timestampB: '2024-01-10', significance: 'Matching breed supports but does not confirm identity.' },
    { evidenceId: 'EV-001-4', category: 'owner_association', fieldName: 'ownerName', fieldLabel: 'Owner Name', valueA: 'Rajesh Kumar', valueB: 'Rajesh Kumar', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-08-12', timestampB: '2024-01-10', significance: 'Matching owner supports but does NOT independently establish that two records belong to the same animal.' },
    { evidenceId: 'EV-001-5', category: 'source_facility', fieldName: 'facilityName', fieldLabel: 'Source Facility', valueA: 'VetWise Mumbai', valueB: 'VetWise Pune', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-08-12', timestampB: '2024-01-10', significance: 'Different source facilities may indicate the same animal was registered at two locations, or two different animals.' },
    { evidenceId: 'EV-001-6', category: 'record_provenance', fieldName: 'verificationStatus', fieldLabel: 'Verification Status', valueA: 'Verified', valueB: 'Unverified', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-08-12', timestampB: '2024-01-10', significance: 'Profile B is from an unverified source. Microchip match should be verified independently.' },
  ],
  'CAND-002': [
    { evidenceId: 'EV-002-1', category: 'stable_identifier', fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: '985112009876543', valueB: '985112007654321', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-09-15', timestampB: '2024-03-20', significance: 'Different microchip numbers strongly suggest two different animals. However, microchip data on profile B is unverified.' },
    { evidenceId: 'EV-002-2', category: 'name_aliases', fieldName: 'animalName', fieldLabel: 'Animal Name', valueA: 'Luna', valueB: 'Luna', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-09-15', timestampB: '2024-03-20', significance: 'Same name is weak evidence — many cats share the name Luna.' },
    { evidenceId: 'EV-002-3', category: 'owner_association', fieldName: 'ownerPhone', fieldLabel: 'Owner Phone', valueA: '+91 98765 43210', valueB: '+91 99876 54321', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-09-15', timestampB: '2024-03-20', significance: 'Different phone numbers may indicate different owners with the same name, or a phone number change.' },
    { evidenceId: 'EV-002-4', category: 'species_breed', fieldName: 'breed', fieldLabel: 'Breed', valueA: 'Persian', valueB: 'Persian', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-09-15', timestampB: '2024-03-20', significance: 'Matching breed is weak evidence for identity.' },
    { evidenceId: 'EV-002-5', category: 'contradictory_identity', fieldName: 'microchipNumber', fieldLabel: 'Microchip Conflict', valueA: '985112009876543', valueB: '985112007654321', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'unverified', timestampA: '2023-09-15', timestampB: '2024-03-20', significance: 'Contradictory stable identifiers — this is the key conflict. Different microchips usually mean different animals.' },
  ],
  'CAND-003': [
    { evidenceId: 'EV-003-1', category: 'stable_identifier', fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: '985112001111222', valueB: null, agreement: 'missing_b', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'pending', timestampA: '2022-05-10', timestampB: '2025-02-14', significance: 'Profile B has no microchip. Missing evidence must not be treated as a match.' },
    { evidenceId: 'EV-003-2', category: 'species_breed', fieldName: 'breed', fieldLabel: 'Breed', valueA: 'Labrador Retriever', valueB: 'Golden Retriever', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'pending', timestampA: '2022-05-10', timestampB: '2025-02-14', significance: 'Different breeds — this is a significant conflict. Same owner could have two different dogs named Max.' },
    { evidenceId: 'EV-003-3', category: 'owner_association', fieldName: 'ownerName', fieldLabel: 'Owner Name', valueA: 'Amit Patel', valueB: 'Amit Patel', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'pending', timestampA: '2022-05-10', timestampB: '2025-02-14', significance: 'Same owner. An owner can have multiple animals with the same name.' },
    { evidenceId: 'EV-003-4', category: 'date_of_birth', fieldName: 'ageOrDob', fieldLabel: 'Date of Birth', valueA: '2021-11-20', valueB: '2021-11-20', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'pending', timestampA: '2022-05-10', timestampB: '2025-02-14', significance: 'Same DOB is supporting evidence but not conclusive — two dogs could share a birthday.' },
  ],
  'CAND-004': [
    { evidenceId: 'EV-004-1', category: 'stable_identifier', fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: null, valueB: null, agreement: 'missing_both', sourceA: 'Field Registration', sourceB: 'Field Registration', verificationStatusA: 'unverified', verificationStatusB: 'unverified', timestampA: '2021-01-15', timestampB: '2024-06-05', significance: 'No stable identifier on either record. Identity cannot be confirmed without additional verification.' },
    { evidenceId: 'EV-004-2', category: 'name_aliases', fieldName: 'animalName', fieldLabel: 'Animal Name', valueA: 'Bella', valueB: 'Belli', agreement: 'conflict', sourceA: 'Field Registration', sourceB: 'Field Registration', verificationStatusA: 'unverified', verificationStatusB: 'unverified', timestampA: '2021-01-15', timestampB: '2024-06-05', significance: 'Similar but not identical names. Could be aliases or two different animals.' },
    { evidenceId: 'EV-004-3', category: 'date_of_birth', fieldName: 'ageOrDob', fieldLabel: 'Date of Birth', valueA: '2020-04-10', valueB: null, agreement: 'missing_b', sourceA: 'Field Registration', sourceB: 'Field Registration', verificationStatusA: 'unverified', verificationStatusB: 'unverified', timestampA: '2021-01-15', timestampB: '2024-06-05', significance: 'DOB missing from profile B. Cannot compare.' },
  ],
  'CAND-005': [
    { evidenceId: 'EV-005-1', category: 'stable_identifier', fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: '985112005556666', valueB: '985112005556666', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'verified', timestampA: '2020-03-01', timestampB: '2025-11-20', significance: 'Matching verified microchip — strongest evidence. Merge was previously approved.' },
    { evidenceId: 'EV-005-2', category: 'owner_association', fieldName: 'ownerName', fieldLabel: 'Owner Name', valueA: 'Deepak Singh', valueB: 'Deepak Singh', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'Imported Record', verificationStatusA: 'verified', verificationStatusB: 'verified', timestampA: '2020-03-01', timestampB: '2025-11-20', significance: 'Matching verified owner.' },
  ],
  'CAND-006': [
    { evidenceId: 'EV-006-1', category: 'stable_identifier', fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: null, valueB: null, agreement: 'missing_both', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'verified', timestampA: '2023-04-18', timestampB: '2025-07-22', significance: 'No microchip on either record. Cannot use stable identifier for comparison.' },
    { evidenceId: 'EV-006-2', category: 'sex_attributes', fieldName: 'sex', fieldLabel: 'Sex', valueA: 'Male', valueB: 'Female', agreement: 'conflict', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'verified', timestampA: '2023-04-18', timestampB: '2025-07-22', significance: 'Conflicting sex on verified records — strong indicator these are two different animals.' },
    { evidenceId: 'EV-006-3', category: 'name_aliases', fieldName: 'animalName', fieldLabel: 'Animal Name', valueA: 'Tiger', valueB: 'Tiger', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'verified', timestampA: '2023-04-18', timestampB: '2025-07-22', significance: 'Same name is weak evidence. Common cat name.' },
    { evidenceId: 'EV-006-4', category: 'owner_association', fieldName: 'ownerName', fieldLabel: 'Owner Name', valueA: 'Meera Nair', valueB: 'Meera Nair', agreement: 'agree', sourceA: 'VetWise Portal', sourceB: 'VetWise Portal', verificationStatusA: 'verified', verificationStatusB: 'verified', timestampA: '2023-04-18', timestampB: '2025-07-22', significance: 'Same owner. An owner can have multiple animals with the same name.' },
  ],
};

// ─── Clinical History Fixtures ───────────────────────────────────

export const MOCK_CLINICAL_EVENTS: Record<string, ClinicalHistoryEvent[]> = {
  'CAND-001': [
    { eventId: 'CE-001-1', eventType: 'vaccination', eventDate: '2026-03-15', recordedTimestamp: '2026-03-15T11:00:00', sourceFacility: 'VetWise Mumbai', sourceRecordRef: 'REC-MUM-001', authorOrClinician: 'Dr. Anita Rao', profileId: 'VW-CL-000003-P01', title: 'Rabies Vaccination', description: 'Rabies vaccine administered, valid 1 year', verificationStatus: 'verified', revisionId: null, relationType: 'unique_event', relatedEventId: null },
    { eventId: 'CE-001-2', eventType: 'vaccination', eventDate: '2026-03-15', recordedTimestamp: '2026-03-15T11:30:00', sourceFacility: 'VetWise Pune', sourceRecordRef: 'REC-PUN-045', authorOrClinician: 'Dr. Rajesh Menon', profileId: 'VW-CL-000007-P02', title: 'Rabies Vaccination', description: 'Rabies vaccine administered', verificationStatus: 'unverified', revisionId: null, relationType: 'possible_duplicate', relatedEventId: 'CE-001-1' },
    { eventId: 'CE-001-3', eventType: 'examination', eventDate: '2026-06-20', recordedTimestamp: '2026-06-20T14:00:00', sourceFacility: 'VetWise Mumbai', sourceRecordRef: 'REC-MUM-002', authorOrClinician: 'Dr. Anita Rao', profileId: 'VW-CL-000003-P01', title: 'Routine Health Check', description: 'General health examination. Weight: 32kg. Good condition.', verificationStatus: 'verified', revisionId: null, relationType: 'unique_event', relatedEventId: null },
    { eventId: 'CE-001-4', eventType: 'weight_record', eventDate: '2026-06-20', recordedTimestamp: '2026-06-20T14:15:00', sourceFacility: 'VetWise Mumbai', sourceRecordRef: 'REC-MUM-003', authorOrClinician: 'Dr. Anita Rao', profileId: 'VW-CL-000003-P01', title: 'Weight Record', description: '32 kg', verificationStatus: 'verified', revisionId: 'rev-1', relationType: 'unique_event', relatedEventId: null },
  ],
  'CAND-002': [
    { eventId: 'CE-002-1', eventType: 'vaccination', eventDate: '2026-01-10', recordedTimestamp: '2026-01-10T10:00:00', sourceFacility: 'VetWise Mumbai', sourceRecordRef: 'REC-MUM-010', authorOrClinician: 'Dr. Anita Rao', profileId: 'VW-CL-000001-P02', title: 'FVRCP Vaccination', description: 'FVRCP combination vaccine administered', verificationStatus: 'verified', revisionId: null, relationType: 'unique_event', relatedEventId: null },
    { eventId: 'CE-002-2', eventType: 'prescription', eventDate: '2026-05-15', recordedTimestamp: '2026-05-15T16:00:00', sourceFacility: 'VetWise Delhi', sourceRecordRef: 'REC-DEL-022', authorOrClinician: 'Dr. Pooja Gupta', profileId: 'VW-CL-000005-P01', title: 'Amoxicillin 50mg', description: '1 tablet BID for 7 days — respiratory infection', verificationStatus: 'unverified', revisionId: null, relationType: 'unique_event', relatedEventId: null },
    { eventId: 'CE-002-3', eventType: 'diagnosis', eventDate: '2026-05-15', recordedTimestamp: '2026-05-15T15:30:00', sourceFacility: 'VetWise Delhi', sourceRecordRef: 'REC-DEL-021', authorOrClinician: 'Dr. Pooja Gupta', profileId: 'VW-CL-000005-P01', title: 'Upper Respiratory Infection', description: 'Mild URI — prescribed amoxicillin', verificationStatus: 'unverified', revisionId: null, relationType: 'uncertain_attribution', relatedEventId: null },
  ],
  'CAND-005': [
    { eventId: 'CE-005-1', eventType: 'vaccination', eventDate: '2026-02-10', recordedTimestamp: '2026-02-10T09:00:00', sourceFacility: 'VetWise Delhi', sourceRecordRef: 'REC-DEL-001', authorOrClinician: 'Dr. Vikram Sethi', profileId: 'VW-CL-000006-P01', title: 'DHPP Vaccination', description: 'DHPP booster administered', verificationStatus: 'verified', revisionId: null, relationType: 'unique_event', relatedEventId: null },
    { eventId: 'CE-005-2', eventType: 'vaccination', eventDate: '2026-02-10', recordedTimestamp: '2026-02-10T09:15:00', sourceFacility: 'VetWise Jaipur', sourceRecordRef: 'REC-JAI-008', authorOrClinician: 'Dr. Sanjay Jain', profileId: 'VW-CL-000012-P02', title: 'DHPP Vaccination', description: 'DHPP booster administered', verificationStatus: 'verified', revisionId: null, relationType: 'possible_duplicate', relatedEventId: 'CE-005-1' },
  ],
  'CAND-006': [
    { eventId: 'CE-006-1', eventType: 'examination', eventDate: '2026-04-05', recordedTimestamp: '2026-04-05T13:00:00', sourceFacility: 'VetWise Mumbai', sourceRecordRef: 'REC-MUM-030', authorOrClinician: 'Dr. Anita Rao', profileId: 'VW-CL-000008-P01', title: 'Neuter Surgery Follow-up', description: 'Post-neuter check. Healing well. Male cat.', verificationStatus: 'verified', revisionId: null, relationType: 'conflicting_event', relatedEventId: 'CE-006-2' },
    { eventId: 'CE-006-2', eventType: 'examination', eventDate: '2026-08-15', recordedTimestamp: '2026-08-15T13:00:00', sourceFacility: 'VetWise Mumbai', sourceRecordRef: 'REC-MUM-045', authorOrClinician: 'Dr. Anita Rao', profileId: 'VW-CL-000010-P01', title: 'Spay Surgery Follow-up', description: 'Post-spay check. Healing well. Female cat.', verificationStatus: 'verified', revisionId: null, relationType: 'conflicting_event', relatedEventId: 'CE-006-1' },
  ],
};

// ─── Resolution History Fixtures ─────────────────────────────────

export const MOCK_RESOLUTIONS: ResolutionDecision[] = [
  {
    resolutionId: 'RES-001', candidateId: 'CAND-005', decisionType: 'merge_approved',
    reviewerId: 'admin@vetwise.com', reviewerRole: 'admin', timestamp: '2026-09-25T10:00:00',
    reason: 'Matching verified microchip, owner, species, breed, and DOB. Both profiles verified. Merge approved after evidence review.',
    evidenceReviewed: ['EV-005-1', 'EV-005-2'], affectedProfiles: ['VW-CL-000006-P01', 'VW-CL-000012-P02'],
    backendOperationId: 'OPS-MERGE-001', status: 'backend_confirmed',
    notes: 'Canonical profile: VW-CL-000006-P01. Merged profile: VW-CL-000012-P02.',
  },
  {
    resolutionId: 'RES-002', candidateId: 'CAND-006', decisionType: 'escalate_conflict',
    reviewerId: 'dr.anita@vetwise.com', reviewerRole: 'doctor', timestamp: '2026-09-28T16:00:00',
    reason: 'Conflicting sex on verified records (Male vs Female). Escalated to senior reviewer. Likely two different cats with the same name owned by the same person.',
    evidenceReviewed: ['EV-006-1', 'EV-006-2', 'EV-006-3', 'EV-006-4'], affectedProfiles: ['VW-CL-000008-P01', 'VW-CL-000010-P01'],
    backendOperationId: null, status: 'prototype',
    notes: 'Awaiting senior reviewer decision.',
  },
];

// ─── Merge Proposal Fixture ──────────────────────────────────────

export const MOCK_MERGE_PROPOSALS: Record<string, MergeProposal> = {
  'CAND-005': {
    candidateId: 'CAND-005',
    canonicalProfileId: 'VW-CL-000006-P01',
    mergedProfileId: 'VW-CL-000012-P02',
    fieldProposals: [
      { fieldName: 'microchipNumber', fieldLabel: 'Microchip Number', valueA: '985112005556666', valueB: '985112005556666', proposedCanonicalValue: '985112005556666', source: 'A', hasConflict: false },
      { fieldName: 'animalName', fieldLabel: 'Animal Name', valueA: 'Rocky', valueB: 'Rocky', proposedCanonicalValue: 'Rocky', source: 'A', hasConflict: false },
      { fieldName: 'breed', fieldLabel: 'Breed', valueA: 'Rottweiler', valueB: 'Rottweiler', proposedCanonicalValue: 'Rottweiler', source: 'A', hasConflict: false },
      { fieldName: 'ownerName', fieldLabel: 'Owner Name', valueA: 'Deepak Singh', valueB: 'Deepak Singh', proposedCanonicalValue: 'Deepak Singh', source: 'A', hasConflict: false },
      { fieldName: 'facilityName', fieldLabel: 'Source Facility', valueA: 'VetWise Delhi', valueB: 'VetWise Jaipur', proposedCanonicalValue: 'VetWise Delhi', source: 'A', hasConflict: false },
    ],
    affectedEventCount: 2,
    unresolvedItems: [],
    requiresBackendSupport: true,
  },
};

// ─── Labels ──────────────────────────────────────────────────────

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  confirmed_identity: 'Confirmed Identity',
  possible_duplicate: 'Possible Duplicate',
  conflicting_evidence: 'Conflicting Evidence',
  unverified_history: 'Unverified History',
  pending_review: 'Pending Review',
  approved_merge: 'Approved Merge',
  reversed_merge: 'Reversed Merge',
  confirmed_different: 'Confirmed Different',
};

export const IDENTITY_STATUS_COLORS: Record<IdentityStatus, string> = {
  confirmed_identity: 'confirmed',
  possible_duplicate: 'pending',
  conflicting_evidence: 'overdue',
  unverified_history: 'pending',
  pending_review: 'pending',
  approved_merge: 'paid',
  reversed_merge: 'overdue',
  confirmed_different: 'confirmed',
};

export const REVIEW_PRIORITY_LABELS: Record<ReviewPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const MATCH_CONFIDENCE_LABELS: Record<MatchConfidenceLevel, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
  unknown: 'Unknown',
};

export const EVIDENCE_CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  stable_identifier: 'Stable Identifier',
  name_aliases: 'Name & Aliases',
  species_breed: 'Species & Breed',
  sex_attributes: 'Sex & Attributes',
  date_of_birth: 'Date of Birth',
  owner_association: 'Owner Association',
  source_facility: 'Source Facility',
  clinical_history_overlap: 'Clinical History Overlap',
  contradictory_identity: 'Contradictory Identity',
  record_provenance: 'Record Provenance',
};

export const EVENT_TYPE_LABELS: Record<ClinicalEventType, string> = {
  appointment: 'Appointment',
  examination: 'Examination',
  prescription: 'Prescription',
  diagnosis: 'Diagnosis',
  vaccination: 'Vaccination',
  clinical_document: 'Clinical Document',
  weight_record: 'Weight Record',
  lab_result: 'Lab Result',
};

export const EVENT_RELATION_LABELS: Record<EventRelationType, string> = {
  unique_event: 'Unique Event',
  possible_duplicate: 'Possible Duplicate',
  corrected_version: 'Corrected Version',
  conflicting_event: 'Conflicting Event',
  uncertain_attribution: 'Uncertain Attribution',
};

export const DECISION_TYPE_LABELS: Record<ResolutionDecisionType, string> = {
  confirm_same_animal: 'Confirm Same Animal',
  confirm_different_animals: 'Confirm Different Animals',
  insufficient_evidence: 'Insufficient Evidence',
  escalate_conflict: 'Escalate Conflict',
  correct_identity_attribution: 'Correct Identity Attribution',
  merge_approved: 'Merge Approved',
};
