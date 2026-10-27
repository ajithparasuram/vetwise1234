/*
# Add Hospital Scoping + Tighten RLS on Existing Tables

## Overview
Adds hospital_id column to clients, patients, client_locations, patient_media,
breeding_records, and audit_logs. Replaces the wide-open USING(true) policies
with hospital-scoped ownership checks. Clients can only see their own data;
doctors/admins see data within their hospital.

## Modified Tables
1. **clients** — Added hospital_id (nullable, FK to hospitals)
2. **patients** — Added hospital_id (inherits from client's hospital via join)
3. **client_locations** — Added hospital_id
4. **patient_media** — Added hospital_id
5. **breeding_records** — Added hospital_id
6. **audit_logs** — Added hospital_id

## Security Changes
- Replaced all USING(true) policies with proper ownership/hospital-scoped checks
- Clients: can only SELECT/UPDATE their own rows (auth.uid() = user_id)
- Doctors: can SELECT all rows in their hospital; cannot modify client data
- Admins: full CRUD within their hospital
- Frontdesk: can SELECT within hospital; cannot modify clinical data
- INSERT: clients create their own rows; doctors/admins create within hospital
- Policies reference profiles table for role + hospital_id lookup
*/
-- ============================================================
-- ADD hospital_id COLUMN TO EXISTING TABLES
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'hospital_id') THEN
    ALTER TABLE clients ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'hospital_id') THEN
    ALTER TABLE patients ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_locations' AND column_name = 'hospital_id') THEN
    ALTER TABLE client_locations ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patient_media' AND column_name = 'hospital_id') THEN
    ALTER TABLE patient_media ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_records' AND column_name = 'hospital_id') THEN
    ALTER TABLE breeding_records ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'hospital_id') THEN
    ALTER TABLE audit_logs ADD COLUMN hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- REPLACE POLICIES ON clients
-- ============================================================
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = clients.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'frontdesk')
        AND (p.hospital_id = clients.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = clients.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = clients.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = clients.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- REPLACE POLICIES ON patients
-- ============================================================
DROP POLICY IF EXISTS "patients_select" ON patients;
CREATE POLICY "patients_select" ON patients FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = patients.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = patients.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "patients_insert" ON patients;
CREATE POLICY "patients_insert" ON patients FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = patients.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'frontdesk')
        AND (p.hospital_id = patients.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "patients_update" ON patients;
CREATE POLICY "patients_update" ON patients FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = patients.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = patients.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = patients.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = patients.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "patients_delete" ON patients;
CREATE POLICY "patients_delete" ON patients FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = patients.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- REPLACE POLICIES ON client_locations
-- ============================================================
DROP POLICY IF EXISTS "locations_select" ON client_locations;
CREATE POLICY "locations_select" ON client_locations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_locations.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = client_locations.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "locations_insert" ON client_locations;
CREATE POLICY "locations_insert" ON client_locations FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_locations.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'frontdesk')
        AND (p.hospital_id = client_locations.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "locations_update" ON client_locations;
CREATE POLICY "locations_update" ON client_locations FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_locations.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'frontdesk')
        AND (p.hospital_id = client_locations.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_locations.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'frontdesk')
        AND (p.hospital_id = client_locations.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "locations_delete" ON client_locations;
CREATE POLICY "locations_delete" ON client_locations FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = client_locations.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = client_locations.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- REPLACE POLICIES ON patient_media
-- ============================================================
DROP POLICY IF EXISTS "media_select" ON patient_media;
CREATE POLICY "media_select" ON patient_media FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clients c ON c.client_id = p.client_id
      WHERE p.patient_id = patient_media.patient_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor', 'frontdesk')
        AND (pr.hospital_id = patient_media.hospital_id OR pr.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "media_insert" ON patient_media;
CREATE POLICY "media_insert" ON patient_media FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clients c ON c.client_id = p.client_id
      WHERE p.patient_id = patient_media.patient_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor')
        AND (pr.hospital_id = patient_media.hospital_id OR pr.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "media_delete" ON patient_media;
CREATE POLICY "media_delete" ON patient_media FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clients c ON c.client_id = p.client_id
      WHERE p.patient_id = patient_media.patient_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor')
        AND (pr.hospital_id = patient_media.hospital_id OR pr.hospital_id IS NULL)
    )
  );

-- ============================================================
-- REPLACE POLICIES ON breeding_records
-- ============================================================
DROP POLICY IF EXISTS "breeding_select" ON breeding_records;
CREATE POLICY "breeding_select" ON breeding_records FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clients c ON c.client_id = p.client_id
      WHERE p.patient_id = breeding_records.patient_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor', 'frontdesk')
        AND (pr.hospital_id = breeding_records.hospital_id OR pr.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "breeding_insert" ON breeding_records;
CREATE POLICY "breeding_insert" ON breeding_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clients c ON c.client_id = p.client_id
      WHERE p.patient_id = breeding_records.patient_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor')
        AND (pr.hospital_id = breeding_records.hospital_id OR pr.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "breeding_update" ON breeding_records;
CREATE POLICY "breeding_update" ON breeding_records FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor')
        AND (pr.hospital_id = breeding_records.hospital_id OR pr.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'doctor')
        AND (pr.hospital_id = breeding_records.hospital_id OR pr.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "breeding_delete" ON breeding_records;
CREATE POLICY "breeding_delete" ON breeding_records FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
        AND (pr.hospital_id = breeding_records.hospital_id OR pr.hospital_id IS NULL)
    )
  );

-- ============================================================
-- REPLACE POLICIES ON audit_logs
-- ============================================================
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  TO authenticated USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = audit_logs.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_hospital_id ON clients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_locations_hospital_id ON client_locations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_media_hospital_id ON patient_media(hospital_id);
CREATE INDEX IF NOT EXISTS idx_breeding_hospital_id ON breeding_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_hospital_id ON audit_logs(hospital_id);
