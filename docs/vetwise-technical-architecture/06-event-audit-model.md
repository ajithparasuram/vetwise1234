# Event and Audit Architecture

## Concept

Every meaningful action in the care workflow produces a typed AuditEvent that is recorded for authorized users to review.

## AuditEvent Structure

- eventId — unique identifier
- eventType — e.g., AppointmentRequested, DoctorAssigned, ClinicalRecordFinalized
- entityId — the entity being acted upon
- entityType — appointment, patient, clinical_record, prescription, payment, doctor, client
- actorId — who performed the action
- actorRole — client, doctor, admin, frontdesk
- timestamp — when the event occurred
- previousState — care state before the event
- resultingState — care state after the event
- metadata — additional context (reason, doctor name, etc.)
- correlationId — links related events in a workflow
- source — 'server' or 'offline_queue'

## Event Types

- AppointmentRequested
- ServiceabilityChecked
- AdminApprovalGranted
- DoctorAssigned
- DoctorAccepted
- VisitStarted
- ClinicalRecordCreated
- ClinicalRecordFinalized
- PrescriptionIssued
- PaymentVerified
- CommissionCalculated
- FollowUpCreated
- AppointmentCompleted

## UI

The AuditTimeline component (`src/components/AuditTimeline.tsx`) renders:
- Chronological event list with icons per event type
- Actor name and role
- State transition (previous → resulting)
- Metadata details
- Offline source tag for events queued offline

## Authorization

Audit timeline is visible to admin and doctor roles only. The `canViewAuditTimeline()` helper enforces this in the frontend. Backend must enforce this restriction server-side.

## Missing Backend Capabilities

1. **GET /appointments/:id/audit** — Fetch audit events for an appointment
2. **GET /audit/events** — Fetch audit events with filters (entity type, date range, actor)
3. Backend must record audit events on every state transition
