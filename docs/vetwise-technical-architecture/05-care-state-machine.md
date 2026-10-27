# Controlled Care State Machine

## Concept

Appointment handling is upgraded from simple status labels into an explicit state machine with controlled transitions.

## States

```
REQUESTED → SERVICEABILITY_CHECK → PENDING_ADMIN_REVIEW → AUTHORIZED →
ASSIGNMENT_PENDING → DOCTOR_ASSIGNED → DOCTOR_ACCEPTED → EN_ROUTE →
ARRIVED → CLINICAL_ENCOUNTER → RECORD_FINALIZED → PRESCRIPTION_ISSUED →
FOLLOW_UP → COMPLETED

Terminal states: COMPLETED, CANCELLED, REJECTED
```

## Transition Rules

Each transition specifies:
- previous state
- next state
- triggering action
- allowed roles
- optional reason

The `canTransition()` function validates transitions programmatically, not just by hiding buttons.

## Role-Based Transitions

- **Client**: check_serviceability, cancel
- **Front Desk**: check_serviceability, serviceability_passed/failed, start_assignment, assign_doctor
- **Doctor**: doctor_accept/decline, en_route, arrived, start_encounter, finalize_record, issue_prescription, schedule_followup, complete
- **Admin**: all transitions

## Invalid Transition Prevention

The `getValidNextStates()` function returns only transitions valid for the current state AND the user's role. The UI renders only these as actionable buttons. Invalid transitions are impossible in the UI.

## UI

The CareStateMachine component (`src/components/CareStateMachine.tsx`) shows:
- Visual progress bar of all states (past/current/future)
- Current state badge
- Available actions for the user's role
- Terminal state indicator
- Assigned doctor information

## Missing Backend Capabilities

1. **POST /appointments/:id/transition** — Server-side state transition validation
2. **GET /appointments/:id/state-history** — Full transition history with timestamps and actors

Backend enforcement is required because frontend checks can be bypassed.
