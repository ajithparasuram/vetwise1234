/*
# Auth Profiles, Hospitals, and Doctor Records

## Overview
Adds foundational auth tables: hospitals (multi-tenant isolation),
profiles (auth.users → role/hospital), and doctors (license verification).

## New Tables
1. **hospitals** — Organization records for multi-tenant data isolation
2. **profiles** — Application profiles linked to auth.users with role + approval_status
3. **doctors** — Doctor-specific data: license, specialty, verification status

## Security
- RLS on all tables
- profiles: users read/update own; admins read all in their hospital
- hospitals: authenticated can read; admins can write
- doctors: admins CRUD in hospital; doctors read own; clients read approved
- Auto-creates profile on signup via trigger on auth.users
*/

-- ============================================================
-- TABLES (created first so cross-table policy references work)
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  city text,
  state text,
  country text DEFAULT 'India',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'client',
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  approval_status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  specialty text,
  license_number text NOT NULL,
  license_state text,
  years_experience integer,
  clinic_name text,
  verification_status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid REFERENCES profiles(id),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS + POLICIES
-- ============================================================
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- hospitals policies
DROP POLICY IF EXISTS "hospitals_select" ON hospitals;
CREATE POLICY "hospitals_select" ON hospitals FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hospitals_insert" ON hospitals;
CREATE POLICY "hospitals_insert" ON hospitals FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "hospitals_update" ON hospitals;
CREATE POLICY "hospitals_update" ON hospitals FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "hospitals_delete" ON hospitals;
CREATE POLICY "hospitals_delete" ON hospitals FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND (p.hospital_id = profiles.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- doctors policies
DROP POLICY IF EXISTS "doctors_select" ON doctors;
CREATE POLICY "doctors_select" ON doctors FOR SELECT
  TO authenticated USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = doctors.hospital_id OR p.hospital_id IS NULL)
    )
    OR (
      doctors.verification_status = 'approved'
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('client', 'frontdesk')
      )
    )
  );

DROP POLICY IF EXISTS "doctors_insert" ON doctors;
CREATE POLICY "doctors_insert" ON doctors FOR INSERT
  TO authenticated WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "doctors_update" ON doctors;
CREATE POLICY "doctors_update" ON doctors FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = doctors.hospital_id OR p.hospital_id IS NULL)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = doctors.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "doctors_delete" ON doctors;
CREATE POLICY "doctors_delete" ON doctors FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND (p.hospital_id = doctors.hospital_id OR p.hospital_id IS NULL)
    )
  );

-- ============================================================
-- TRIGGER: Auto-create profile on auth.user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'client') = 'doctor' THEN 'pending'
      ELSE 'approved'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_id ON profiles(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_verification_status ON doctors(verification_status);
CREATE INDEX IF NOT EXISTS idx_doctors_profile_id ON doctors(profile_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name);
