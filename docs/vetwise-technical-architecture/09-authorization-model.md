# Authorization Model

## Concept

Multi-role authorization with frontend helpers that mirror expected server-side enforcement. The frontend prevents unnecessary exposure; the backend is authoritative.

## Roles

- **CLIENT** — Only authorized owner/animal information
- **DOCTOR** — Only animals and records the doctor is authorized to access
- **FRONT_DESK** — Only permitted operational information
- **ADMIN** — Platform-wide operational and financial visibility

## Authorization Helpers

Defined in `src/lib/authz.ts`:

| Helper | Description |
|--------|-------------|
| `canViewAnimal()` | Client sees own animals; doctor/admin see authorized; front desk see operational |
| `canViewClinicalRecord()` | Client sees own; doctor sees authorized; front desk cannot view |
| `canEditClinicalRecord()` | Only approved doctors and admins |
| `canApproveDoctor()` | Only admins |
| `canViewFinancialDetail()` | Admin sees all; client sees own; doctor sees net only; front desk no |
| `canViewPlatformFinancials()` | Only admins |
| `canViewAuditTimeline()` | Admin and doctor only |
| `canTransitionState()` | Role-based state machine action validation |
| `canCreatePrescription()` | Only approved doctors and admins |
| `canViewPrescription()` | Client sees own; doctor sees authorized; admin sees all |
| `canAccessOfflineMode()` | Only approved doctors |
| `getPermissionDeniedMessage()` | User-friendly denial messages |

## 401/403 Handling

The API client (`src/lib/api.ts`) throws `ApiError` with status codes. The UI must handle:
- 401 — Session expired, redirect to login
- 403 — Permission denied, show denial message

## Doctor Financial Visibility

Doctors see only their net credited amount. Platform gross revenue and commission rates are NOT shown to doctors unless explicitly authorized. Admins see the complete financial picture.

**The frontend never calculates authoritative commission.** It displays server-provided financial results only.

## Frontend vs Backend Enforcement

| Layer | Enforcement |
|-------|-------------|
| Frontend | Prevents unnecessary data exposure, hides unauthorized UI, validates transitions |
| Backend | Authoritative access control, data-level authorization, commission calculation, state machine enforcement |

Frontend enforcement is necessary but NOT sufficient. All critical features must be enforced by the AWS backend.
