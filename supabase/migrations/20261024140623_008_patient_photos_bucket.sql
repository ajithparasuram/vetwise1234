/*
# Patient Photos Storage Bucket
Creates a public storage bucket for patient photos.
Photos are organized by patient_id/filename in the bucket.
The bucket is public so images can be displayed via direct URLs,
but uploads are authenticated via the anon key.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', true)
ON CONFLICT (id) DO NOTHING;
