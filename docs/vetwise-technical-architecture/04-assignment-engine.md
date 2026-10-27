# Explainable Doctor Assignment Engine

## Concept

The assignment engine produces an explainable recommendation for which veterinarian should handle an appointment, based on verifiable factors.

## AssignmentDecision Structure

- selectedVeterinarian — the recommended VeterinarianCapability
- decisionStatus — recommended | assigned | no_match | pending
- eligibleCandidates — all veterinarians who passed basic filters
- decisionFactors — list of pass/fail factors with details
- timestamp — when the decision was made
- reason — human-readable explanation

## Decision Factors

1. **Verification Status** — Is the doctor verified?
2. **Species Support** — Does the doctor support the required animal species?
3. **Appointment Type** — Does the doctor support the required appointment type?
4. **Service Area** — Does the doctor cover the client's geographic service area?
5. **Availability** — Is the doctor available at the requested time?

## UI

The AssignmentEngine component (`src/components/AssignmentEngine.tsx`) shows:
- Recommended veterinarian with all decision factors
- Pass/fail status for each factor
- Eligible candidates list
- Assign button (admin/front desk only)

## Important Constraints

- The recommendation does NOT claim medical superiority
- No fake distance/availability values are created
- Assignment requires server-side validation (backend endpoint needed)
- The UI only presents the decision; it does not compute authoritative assignments

## Missing Backend Capabilities

1. **POST /appointments/:id/assign** — Server-side assignment with capability matching
2. **GET /doctors/capabilities** — Fetch veterinarian capabilities with supported species and service areas
3. **GET /doctors/availability** — Fetch real availability slots
