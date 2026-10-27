/*
# Suppliers, Vaccinations, Appointment Reminders

## Overview
Adds three new tables for Version 76 features:
1. `suppliers` — vendor/supplier management for inventory
2. `vaccinations` — dedicated vaccination tracking per patient
3. `appointment_reminders` — tracks reminder delivery status for appointments

Also adds `recipient_email`, `subject`, `body`, `metadata`, `delivery_status` columns
to the existing `notifications` table so the `send-notification` edge function works.

## New Tables

### suppliers
- id (uuid, PK)
- supplier_id (text, unique, VW-SUP-XXXXXX)
- name (text, not null)
- contact_person (text)
- email (text)
- phone (text)
- address (text)
- gstin (text)
- status (text, default 'active')
- notes (text)
- created_at, updated_at (timestamptz)

### vaccinations
- id (uuid, PK)
- vaccination_id (text, unique, VW-VAC-XXXXXX)
- patient_id (text, FK to patients)
- client_id (text, FK to clients)
- vaccine_name (text, not null)
- vaccine_category (text)
- manufacturer (text)
- batch_number (text)
- dosage (text)
- route (text)
- vaccination_date (date, not null)
- next_due_date (date)
- administering_vet (text)
- status (text, default 'completed')
- notes (text)
- created_at, updated_at (timestamptz)

### appointment_reminders
- id (uuid, PK)
- appointment_id (text, FK to appointments)
- patient_id (text)
- client_id (text)
- reminder_type (text: '24h' | '2h')
- scheduled_for (timestamptz)
- sent_at (timestamptz)
- status (text: 'pending' | 'sent' | 'failed' | 'skipped')
- failure_reason (text)
- created_at (timestamptz)

## Modified Tables
### notifications (additive columns)
- recipient_email (text)
- subject (text)
- body (text)
- metadata (jsonb)
- delivery_status (text, default 'pending')

## Security
- All new tables: RLS enabled, anon+authenticated CRUD (consistent with existing pattern)
- Existing notifications policies preserved

## Indexes
- suppliers: name, status
- vaccinations: patient_id, client_id, next_due_date
- appointment_reminders: appointment_id, status
- notifications: recipient_email
*/

-- ===== Suppliers =====
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id text UNIQUE NOT NULL DEFAULT 'VW-SUP-' || lpad((nextval('pay_id_seq'))::text, 6, '0'),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  gstin text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sup_select" ON suppliers;
CREATE POLICY "sup_select" ON suppliers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sup_insert" ON suppliers;
CREATE POLICY "sup_insert" ON suppliers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sup_update" ON suppliers;
CREATE POLICY "sup_update" ON suppliers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sup_delete" ON suppliers;
CREATE POLICY "sup_delete" ON suppliers FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

-- ===== Vaccinations =====
CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccination_id text UNIQUE NOT NULL DEFAULT 'VW-VAC-' || lpad((nextval('pay_id_seq'))::text, 6, '0'),
  patient_id text REFERENCES patients(patient_id) ON DELETE CASCADE,
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  vaccine_category text,
  manufacturer text,
  batch_number text,
  dosage text,
  route text,
  vaccination_date date NOT NULL,
  next_due_date date,
  administering_vet text,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vac_select" ON vaccinations;
CREATE POLICY "vac_select" ON vaccinations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "vac_insert" ON vaccinations;
CREATE POLICY "vac_insert" ON vaccinations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vac_update" ON vaccinations;
CREATE POLICY "vac_update" ON vaccinations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vac_delete" ON vaccinations;
CREATE POLICY "vac_delete" ON vaccinations FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vac_patient_id ON vaccinations(patient_id);
CREATE INDEX IF NOT EXISTS idx_vac_client_id ON vaccinations(client_id);
CREATE INDEX IF NOT EXISTS idx_vac_next_due ON vaccinations(next_due_date);

-- ===== Appointment Reminders =====
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id text REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  patient_id text,
  client_id text,
  reminder_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rem_select" ON appointment_reminders;
CREATE POLICY "rem_select" ON appointment_reminders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rem_insert" ON appointment_reminders;
CREATE POLICY "rem_insert" ON appointment_reminders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rem_update" ON appointment_reminders;
CREATE POLICY "rem_update" ON appointment_reminders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rem_delete" ON appointment_reminders;
CREATE POLICY "rem_delete" ON appointment_reminders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rem_appt_id ON appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_rem_status ON appointment_reminders(status);

-- ===== Notifications: additive columns =====
DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_email text;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subject text;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_notif_recipient_email ON notifications(recipient_email);
