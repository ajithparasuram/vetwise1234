# Inventive Contribution Record

## Purpose

This document records factual technical contributions for later review by a qualified Indian patent professional. It does NOT declare anyone an inventor, does NOT claim novelty, and does NOT make legal conclusions.

## Contribution Records

### 1. Veterinary Care Orchestration Engine

| Field | Value |
|-------|-------|
| Feature | Typed orchestration model connecting animal → owner → clinical context → serviceability → veterinarian capability → availability → appointment → authorization → assignment → encounter → record → prescription → payment → follow-up → completion |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | Care workflow was represented as isolated screens with no connected state model; no typed relationship between animal identity, clinical context, and care states |
| Technical mechanism | Typed TypeScript interfaces (AnimalContext, OwnerContext, ServiceabilityResult, VeterinarianCapability, AvailabilityResult, AppointmentState, AssignmentDecision, ClinicalEncounter, FollowUpAction, AuditEvent) with explicit state transitions |
| Existing system dependency | Existing AWS API Gateway + Lambda backend, existing appointment/clinical record/prescription handlers |
| Evidence/source | `src/lib/orchestration.ts` |
| Status | Frontend implemented; backend endpoints for state transitions and clinical context assembly are missing |

### 2. Controlled Care State Machine

| Field | Value |
|-------|-------|
| Feature | Explicit state machine with 16 states and role-based controlled transitions |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | Appointment status was simple string labels with no transition validation; invalid state changes were possible |
| Technical mechanism | VALID_TRANSITIONS array with from/to/action/allowedRoles; canTransition() and getValidNextStates() functions prevent invalid transitions programmatically |
| Existing system dependency | Existing appointment handler in AWS Lambda |
| Evidence/source | `src/lib/orchestration.ts`, `src/components/CareStateMachine.tsx` |
| Status | Frontend implemented; backend state machine enforcement is required |

### 3. Animal Clinical Identity Layer

| Field | Value |
|-------|-------|
| Feature | Persistent clinical identity per animal with full medical history, vaccination records, weight tracking, and known conditions |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | Animals were treated as basic pet records without clinical history relationships; veterinarians had to navigate multiple screens to understand an animal |
| Technical mechanism | AnimalContext interface with clinical fields; ClinicalContext assembly combining visits, records, prescriptions, vaccinations, weight, conditions |
| Existing system dependency | Existing patients table, clinical_records table, prescriptions table in PostgreSQL |
| Evidence/source | `src/lib/orchestration.ts`, `src/components/ClinicalContextBuilder.tsx` |
| Status | Frontend implemented; backend clinical context assembly endpoint is missing |

### 4. Secure Offline Clinical Synchronization

| Field | Value |
|-------|-------|
| Feature | Controlled offline clinical data entry with local queue, sync status tracking, and conflict detection |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | Veterinarians in areas with poor connectivity could not record clinical data; no mechanism existed to queue records and sync when connectivity returned |
| Technical mechanism | Browser localStorage-based queue with 6 sync states (saved_locally, pending_sync, syncing, synced, conflict, sync_failed); conflict detection on field-level comparison; resolution workflow with use_local/use_server/merge options |
| Existing system dependency | None (new capability) |
| Evidence/source | `src/lib/offline-sync.ts`, `src/components/OfflineSyncPanel.tsx` |
| Status | Frontend implemented; backend batch sync endpoint is missing. Encryption limitation documented — localStorage is unencrypted; native secure storage needed for production |

### 5. Explainable Doctor Assignment

| Field | Value |
|-------|-------|
| Feature | Assignment decision with explainable factors (verification, species support, appointment type, service area, availability) |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | Doctor assignment was opaque with no explanation of why a specific veterinarian was selected |
| Technical mechanism | AssignmentDecision interface with decision factors (pass/fail per factor), eligible candidates list, and human-readable reason; explicitly does NOT claim medical superiority |
| Existing system dependency | Existing doctors handler, serviceability handler in AWS Lambda |
| Evidence/source | `src/lib/orchestration.ts`, `src/components/AssignmentEngine.tsx` |
| Status | Frontend implemented; backend assignment engine with capability matching is required |

### 6. Event and Audit Architecture

| Field | Value |
|-------|-------|
| Feature | Typed audit events with actor, role, state transition, metadata, and correlation ID |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | No structured audit trail existed for care workflow events; actions were not traceable to actors and state transitions |
| Technical mechanism | AuditEvent interface with previousState/resultingState, correlationId linking related events, source field distinguishing server vs offline_queue events |
| Existing system dependency | Existing audit_logs table in PostgreSQL |
| Evidence/source | `src/lib/orchestration.ts`, `src/components/AuditTimeline.tsx` |
| Status | Frontend implemented; backend audit event recording on every transition is required |

### 7. Multi-Role Authorization Helpers

| Field | Value |
|-------|-------|
| Feature | Frontend authorization helpers mirroring expected server-side enforcement |
| Business requirement source | SJ Vetfolio product requirements |
| Technical design contributor | VetWise engineering |
| Implementation contributor | VetWise engineering |
| Date | October 2026 |
| Technical problem solved | Authorization was implemented by hiding UI elements without programmatic checks; no reusable helpers existed |
| Technical mechanism | AuthContext interface with role/userId/isApproved; 12 helper functions (canViewAnimal, canViewClinicalRecord, canEditClinicalRecord, canApproveDoctor, canViewFinancialDetail, etc.); getPermissionDeniedMessage for user-friendly denial |
| Existing system dependency | Existing Cognito auth, existing role model (client/doctor/frontdesk/admin) |
| Evidence/source | `src/lib/authz.ts` |
| Status | Frontend implemented; backend enforcement is the authoritative source and must be maintained separately |

## IP Ownership Statement

This document records technical contributions only. It does NOT assign IP ownership. IP ownership of VetWise and all related technology remains with SJ Vetfolio Pvt Ltd as determined by applicable employment agreements and contracts. The decision regarding inventorship for any patent application shall be made by a qualified Indian patent professional based on legal criteria, not by this document.

## Status for Patent Professional Review

These technical mechanisms are candidates for professional patentability/prior-art review. No determination of patentability has been made.
