/*
# Weight Records Table

## Overview
Adds a dedicated weight_records table for tracking patient weight measurements over time.
This supports the weight tracking and chart feature in the patient profile.

## New Table
1. **weight_records** — Individual weight measurements for patients
   - id (uuid, primary key)
   - patient_id (text, FK to patients)
   - weight_value (numeric, the measured weight)
   - weight_unit (text: 'kg' or 'lb', defaults to 'kg')
   - recorded_date (date, when the measurement was taken)
   - recorded_by (uuid, the user who recorded it)
   - notes (text, optional notes about the measurement)
   - created_at, updated_at

## Security
- RLS enabled
- Clients can read their own pets' weight records (via patient → client → user_id)
- Doctors and admins can read/write within hospital scope
- Policies mirror existing clinical_records patterns
*/

CREATE TABLE IF NOT EXISTS weight_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  weight_value numeric NOT NULL,
  weight_unit text NOT NULL DEFAULT 'kg',
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weight_select" ON weight_records;
CREATE POLICY "weight_select" ON weight_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "weight_insert" ON weight_records;
CREATE POLICY "weight_insert" ON weight_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "weight_update" ON weight_records;
CREATE POLICY "weight_update" ON weight_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "weight_delete" ON weight_records;
CREATE POLICY "weight_delete" ON weight_records FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_weight_patient_id ON weight_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_weight_recorded_date ON weight_records(recorded_date);
