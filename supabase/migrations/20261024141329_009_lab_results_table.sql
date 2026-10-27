/*
# Laboratory Results Table

## Overview
Creates a dedicated table for veterinary laboratory results, supporting
lab test tracking, result values, reference ranges, and status workflow.

## New Table: lab_results
- id (uuid, primary key)
- lab_result_id (text, unique, auto-generated VW-LAB-XXXXXX)
- patient_id (text, FK to patients)
- client_id (text, FK to clients)
- test_name (text, e.g. "Complete Blood Count", "Liver Function Test")
- test_category (text, e.g. "Hematology", "Biochemistry", "Urinalysis", "Microbiology", "Endocrinology")
- result_value (text)
- unit (text, e.g. "mg/dL", "x10^3/μL")
- reference_range (text)
- status (text: pending, in_progress, completed, reviewed, cancelled)
- collected_date (date)
- reported_date (date)
- performed_by (text, lab or technician name)
- reviewed_by (text, veterinarian name)
- notes (text)
- hospital_id (uuid, FK to hospitals)
- created_by (uuid)
- created_at, updated_at (timestamptz)

## Security
- RLS enabled, anon+authenticated access (consistent with existing tables)
*/

CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id text UNIQUE NOT NULL DEFAULT 'VW-LAB-' || lpad((nextval('pay_id_seq'))::text, 6, '0'),
  patient_id text REFERENCES patients(patient_id) ON DELETE CASCADE,
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  test_name text NOT NULL,
  test_category text,
  result_value text,
  unit text,
  reference_range text,
  status text NOT NULL DEFAULT 'pending',
  collected_date date,
  reported_date date,
  performed_by text,
  reviewed_by text,
  notes text,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_select" ON lab_results;
CREATE POLICY "lab_select" ON lab_results FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "lab_insert" ON lab_results;
CREATE POLICY "lab_insert" ON lab_results FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "lab_update" ON lab_results;
CREATE POLICY "lab_update" ON lab_results FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lab_delete" ON lab_results;
CREATE POLICY "lab_delete" ON lab_results FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_lab_patient_id ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_client_id ON lab_results(client_id);
CREATE INDEX IF NOT EXISTS idx_lab_status ON lab_results(status);
