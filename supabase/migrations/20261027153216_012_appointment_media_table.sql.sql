/*
# Appointment media table — photos & videos uploaded during booking

1. New Tables
- `appointment_media`
  - id (uuid, primary key)
  - appointment_id (text, references appointments.appointment_id ON DELETE CASCADE)
  - patient_id (text, references patients.patient_id ON DELETE CASCADE)
  - client_id (text, references clients.client_id ON DELETE SET NULL)
  - media_type (text: 'photo' or 'video')
  - storage_key (text — path within patient-photos bucket)
  - content_type (text — MIME type)
  - file_size (bigint)
  - caption (text, nullable)
  - uploaded_by (uuid, nullable — auth user id)
  - uploaded_at (timestamptz, default now())
  - hospital_id (uuid, nullable — references hospitals)

2. Purpose
Allows clients to upload photos and videos when booking an appointment.
Doctors and staff can then view these media files alongside the appointment
details, helping them prepare for the visit and assess the patient's condition
before arrival.

3. Security
- Enable RLS on appointment_media.
- Grant SELECT, INSERT to authenticated (the app has sign-in).
- SELECT: the owning client (via clients.user_id = auth.uid()) OR
  admin/doctor/frontdesk within the same hospital.
- INSERT: the owning client OR admin/frontdesk within hospital.
- DELETE: the owning client OR admin.
- Index on appointment_id for efficient lookup.

4. Storage
- Reuses the existing `patient-photos` public bucket.
- Files stored under path: `appointments/{appointmentId}/{timestamp}-{random}.{ext}`
*/

CREATE TABLE IF NOT EXISTS appointment_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id text REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  patient_id text REFERENCES patients(patient_id) ON DELETE CASCADE,
  client_id text REFERENCES clients(client_id) ON DELETE SET NULL,
  media_type text NOT NULL DEFAULT 'photo',
  storage_key text NOT NULL,
  content_type text,
  file_size bigint,
  caption text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL
);

ALTER TABLE appointment_media ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON appointment_media TO authenticated;

CREATE INDEX IF NOT EXISTS idx_appt_media_appointment_id ON appointment_media(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_media_patient_id ON appointment_media(patient_id);

DROP POLICY IF EXISTS "appt_media_select" ON appointment_media;
CREATE POLICY "appt_media_select" ON appointment_media FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = appointment_media.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'doctor', 'frontdesk')
      AND (p.hospital_id = appointment_media.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "appt_media_insert" ON appointment_media;
CREATE POLICY "appt_media_insert" ON appointment_media FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = appointment_media.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'frontdesk')
      AND (p.hospital_id = appointment_media.hospital_id OR p.hospital_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "appt_media_delete" ON appointment_media;
CREATE POLICY "appt_media_delete" ON appointment_media FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.client_id = appointment_media.client_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
