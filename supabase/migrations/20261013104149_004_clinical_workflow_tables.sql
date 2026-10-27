/*
# Clinical Workflow Tables: Appointments, Records, Prescriptions, Payments, Subscriptions

## Overview
Adds the remaining clinical and billing tables that mirror the existing demo data
structures in the VetWise app. All tables carry hospital_id for multi-tenant isolation.

## New Tables
1. **appointments** — Visit bookings with patient/client/doctor references
   - appointment_id (auto-generated VW-APPT-XXXXXX)
   - patient_id, client_id (FK to existing tables)
   - doctor_id (FK to doctors, nullable until assigned)
   - appointment_type, reason, preferred_date, preferred_time
   - visit_location, status
   - created_by, hospital_id

2. **clinical_records** — Consultation notes and visit records
   - record_id (auto-generated VW-CR-XXXXXX)
   - patient_id, client_id, doctor_id
   - visit_date, reason, diagnosis, treatment, notes, follow_up
   - hospital_id

3. **prescriptions** — Digital prescriptions with medication list
   - rx_id (auto-generated VW-RX-XXXXXX)
   - patient_id, client_id, doctor_id
   - medications (JSONB array)
   - status (active, completed, pending)
   - hospital_id

4. **payments** — Payment records for services and subscriptions
   - payment_id (auto-generated VW-PAY-XXXXXX)
   - client_id, appointment_id (nullable)
   - service, amount, currency, method
   - status (paid, upcoming, live, failed)
   - paid_at, due_date
   - hospital_id

5. **subscription_plans** — Available subscription tiers
   - name, price, period, benefits (JSONB), is_active

6. **subscriptions** — Active client subscriptions
   - client_id, plan_id
   - status (active, pending, cancelled, expired)
   - start_date, end_date
   - hospital_id

## Security
- RLS on all tables
- Clients: read own data (via client_id → clients.user_id = auth.uid())
- Doctors: read/write within hospital
- Admins: full CRUD within hospital
- Frontdesk: read appointments within hospital
- All policies use profiles for role + hospital_id lookup
*/
-- ============================================================
-- SUBSCRIPTION_PLANS (no hospital_id — shared catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  price text NOT NULL,
  period text NOT NULL DEFAULT '/year',
  benefits jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select" ON subscription_plans;
CREATE POLICY "plans_select" ON subscription_plans FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "plans_insert" ON subscription_plans;
CREATE POLICY "plans_insert" ON subscription_plans FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "plans_update" ON subscription_plans;
CREATE POLICY "plans_update" ON subscription_plans FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "plans_delete" ON subscription_plans;
CREATE POLICY "plans_delete" ON subscription_plans FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id text UNIQUE NOT NULL,
  patient_id text REFERENCES patients(patient_id) ON DELETE CASCADE,
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_type text NOT NULL DEFAULT 'Home Visit',
  reason text,
  preferred_date date,
  preferred_time text,
  visit_location text,
  status text NOT NULL DEFAULT 'Pending',
  created_by uuid,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appts_select" ON appointments;
CREATE POLICY "appts_select" ON appointments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = appointments.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = appointments.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "appts_insert" ON appointments;
CREATE POLICY "appts_insert" ON appointments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = appointments.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'frontdesk')
        AND (p.hospital_id = appointments.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "appts_update" ON appointments;
CREATE POLICY "appts_update" ON appointments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = appointments.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = appointments.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = appointments.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = appointments.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "appts_delete" ON appointments;
CREATE POLICY "appts_delete" ON appointments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = appointments.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = appointments.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- CLINICAL_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text UNIQUE NOT NULL,
  patient_id text REFERENCES patients(patient_id) ON DELETE CASCADE,
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  diagnosis text,
  treatment text,
  notes text,
  follow_up text,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cr_select" ON clinical_records;
CREATE POLICY "cr_select" ON clinical_records FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = clinical_records.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = clinical_records.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "cr_insert" ON clinical_records;
CREATE POLICY "cr_insert" ON clinical_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = clinical_records.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "cr_update" ON clinical_records;
CREATE POLICY "cr_update" ON clinical_records FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = clinical_records.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = clinical_records.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "cr_delete" ON clinical_records;
CREATE POLICY "cr_delete" ON clinical_records FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = clinical_records.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_id text UNIQUE NOT NULL,
  patient_id text REFERENCES patients(patient_id) ON DELETE CASCADE,
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  medications jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'active',
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rx_select" ON prescriptions;
CREATE POLICY "rx_select" ON prescriptions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = prescriptions.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'frontdesk')
        AND (p.hospital_id = prescriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "rx_insert" ON prescriptions;
CREATE POLICY "rx_insert" ON prescriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = prescriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "rx_update" ON prescriptions;
CREATE POLICY "rx_update" ON prescriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = prescriptions.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = prescriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "rx_delete" ON prescriptions;
CREATE POLICY "rx_delete" ON prescriptions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = prescriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text UNIQUE NOT NULL,
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  appointment_id text REFERENCES appointments(appointment_id) ON DELETE SET NULL,
  service text NOT NULL,
  amount text NOT NULL,
  currency text DEFAULT 'INR',
  method text,
  status text NOT NULL DEFAULT 'upcoming',
  paid_at timestamptz,
  due_date date,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pay_select" ON payments;
CREATE POLICY "pay_select" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = payments.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor')
        AND (p.hospital_id = payments.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "pay_insert" ON payments;
CREATE POLICY "pay_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin')
        AND (p.hospital_id = payments.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "pay_update" ON payments;
CREATE POLICY "pay_update" ON payments FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = payments.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = payments.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "pay_delete" ON payments;
CREATE POLICY "pay_delete" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = payments.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  plan_name text,
  price text,
  status text NOT NULL DEFAULT 'Active',
  start_date date,
  end_date date,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_select" ON subscriptions;
CREATE POLICY "subs_select" ON subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c WHERE c.client_id = subscriptions.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin')
        AND (p.hospital_id = subscriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "subs_insert" ON subscriptions;
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin')
        AND (p.hospital_id = subscriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "subs_update" ON subscriptions;
CREATE POLICY "subs_update" ON subscriptions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = subscriptions.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = subscriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "subs_delete" ON subscriptions;
CREATE POLICY "subs_delete" ON subscriptions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = subscriptions.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- ID GENERATION SEQUENCES & FUNCTIONS
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS appt_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS cr_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS rx_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS pay_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_appt_id()
RETURNS text AS $$
DECLARE next_val bigint;
BEGIN
  next_val := nextval('appt_id_seq');
  RETURN 'VW-APPT-' || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_cr_id()
RETURNS text AS $$
DECLARE next_val bigint;
BEGIN
  next_val := nextval('cr_id_seq');
  RETURN 'VW-CR-' || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_rx_id()
RETURNS text AS $$
DECLARE next_val bigint;
BEGIN
  next_val := nextval('rx_id_seq');
  RETURN 'VW-RX-' || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_pay_id()
RETURNS text AS $$
DECLARE next_val bigint;
BEGIN
  next_val := nextval('pay_id_seq');
  RETURN 'VW-PAY-' || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_appt_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.appointment_id IS NULL OR NEW.appointment_id = '' THEN
    NEW.appointment_id := generate_appt_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_appt_id ON appointments;
CREATE TRIGGER trg_set_appt_id
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_appt_id();

CREATE OR REPLACE FUNCTION set_cr_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.record_id IS NULL OR NEW.record_id = '' THEN
    NEW.record_id := generate_cr_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_cr_id ON clinical_records;
CREATE TRIGGER trg_set_cr_id
  BEFORE INSERT ON clinical_records
  FOR EACH ROW EXECUTE FUNCTION set_cr_id();

CREATE OR REPLACE FUNCTION set_rx_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.rx_id IS NULL OR NEW.rx_id = '' THEN
    NEW.rx_id := generate_rx_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_rx_id ON prescriptions;
CREATE TRIGGER trg_set_rx_id
  BEFORE INSERT ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION set_rx_id();

CREATE OR REPLACE FUNCTION set_pay_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.payment_id IS NULL OR NEW.payment_id = '' THEN
    NEW.payment_id := generate_pay_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_pay_id ON payments;
CREATE TRIGGER trg_set_pay_id
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_pay_id();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appts_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appts_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appts_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appts_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appts_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cr_patient_id ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_cr_client_id ON clinical_records(client_id);
CREATE INDEX IF NOT EXISTS idx_cr_hospital_id ON clinical_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_client_id ON prescriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_rx_hospital_id ON prescriptions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pay_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_pay_hospital_id ON payments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_subs_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subs_hospital_id ON subscriptions(hospital_id);
