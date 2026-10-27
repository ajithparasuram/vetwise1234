# VetWise Technical Architecture — System Overview

## Purpose

VetWise is a veterinary technology platform by SJ Vetfolio Pvt Ltd. This document describes the technical architecture of the system as implemented.

## Architecture Layers

### Frontend
- React + TypeScript + Vite
- Role-based portals: Client, Doctor, Admin, Front Desk
- Single-page application with role-based navigation

### API Layer
- `src/lib/api.ts` — AWS API Gateway + Cognito client
- Falls back to demo data when `VITE_API_BASE_URL` is not set
- Auth: OTP and password-based via Cognito

### Data Layer
- `src/lib/db.ts` — Supabase direct queries (patients, clients, locations, media, breeding, audit logs)
- `src/lib/demo-data.ts` — Fallback data for development mode

### Infrastructure
- AWS CDK stack in `/infrastructure`
- Lambda handlers for auth, clients, patients, appointments, clinical records, prescriptions, payments, subscriptions, doctors, notifications, AI, serviceability, contact, settings

## New Technical Systems

This enhancement adds three major technical systems plus supporting architecture:

1. **Veterinary Care Orchestration Engine** — typed model connecting the full care workflow
2. **Animal Clinical Intelligence / Identity Layer** — persistent clinical identity per animal
3. **Secure Offline Clinical Synchronization** — controlled offline mode with conflict resolution

Supporting:
- Event and Audit Architecture
- Explainable Doctor Assignment
- Controlled Clinical State Machine
- Multi-Role Authorization Helpers

## File Locations

| System | Location |
|--------|----------|
| Orchestration types | `src/lib/orchestration.ts` |
| Authorization helpers | `src/lib/authz.ts` |
| Offline sync engine | `src/lib/offline-sync.ts` |
| Care State Machine UI | `src/components/CareStateMachine.tsx` |
| Clinical Context Builder UI | `src/components/ClinicalContextBuilder.tsx` |
| Assignment Engine UI | `src/components/AssignmentEngine.tsx` |
| Audit Timeline UI | `src/components/AuditTimeline.tsx` |
| Offline Sync Panel UI | `src/components/OfflineSyncPanel.tsx` |

## Backend Boundary

All critical features (patient authorization, appointment authorization, doctor approval, clinical records, prescriptions, payments, commission) must ultimately be enforced by the AWS backend. Frontend authorization helpers prevent unnecessary exposure but are NOT the authoritative source of truth.
