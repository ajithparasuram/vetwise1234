# Veterinary Care Orchestration Engine

## Concept

The orchestration engine represents the full veterinary care workflow as connected entities and controlled states, rather than isolated screens.

## Workflow

```
Animal → Owner → Clinical context → Location/serviceability →
Veterinarian capability → Availability → Appointment request →
Administrative authorization → Assignment → Clinical encounter →
Clinical record → Prescription → Payment → Follow-up → Completion
```

## Typed Model

Defined in `src/lib/orchestration.ts`:

- **AnimalContext** — persistent animal identity with clinical history
- **OwnerContext** — client/owner information
- **ServiceabilityResult** — geographic service area check result
- **VeterinarianCapability** — doctor verification, species support, service areas
- **AvailabilityResult** — doctor availability at requested time
- **AppointmentState** — current care state for an appointment
- **AssignmentDecision** — explainable doctor assignment with decision factors
- **ClinicalEncounter** — encounter session with vitals and notes
- **ClinicalContext** — assembled context for a patient (visits, records, prescriptions, vaccinations, weight, conditions)
- **ClinicalContextEntry** — individual timeline entry, distinguishes recorded data from AI guidance
- **FollowUpAction** — scheduled follow-up with status
- **AuditEvent** — event with actor, role, state transition, metadata, correlation ID

## API Integration

The orchestration model is designed to work with the existing AWS API:
- `api.getAppointments()` — fetches appointments
- `api.checkServiceability()` — checks geographic serviceability
- `api.getDoctors()` / `api.getPendingDoctors()` — veterinarian data
- `api.getClinicalRecords()` — clinical history
- `api.getPrescriptions()` — prescription history

## Missing Backend Capabilities

The following capabilities require new backend endpoints:

1. **GET /appointments/:id/state** — Fetch current care state with full transition history
2. **POST /appointments/:id/transition** — Submit a state transition with action, role, and reason
3. **GET /appointments/:id/assignment** — Fetch assignment decision with factors
4. **POST /appointments/:id/assign** — Assign a doctor with server-side validation
5. **GET /patients/:id/clinical-context** — Fetch assembled clinical context
6. **GET /appointments/:id/audit** — Fetch audit event timeline
