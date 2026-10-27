/*
# Create notifications table

1. New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, the recipient)
  - `role` (text, the recipient's role: client/doctor/admin/frontdesk)
  - `title` (text, notification headline)
  - `message` (text, notification body)
  - `type` (text, category: appointment/prescription/payment/system/approval/breeding)
  - `entity_id` (text, optional reference to related record)
  - `entity_type` (text, optional: appointment/prescription/patient/client)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `notifications`.
- Owner-scoped CRUD: each authenticated user can only access their own notifications.
- `user_id` defaults to `auth.uid()` so inserts work without passing it explicitly.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client',
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  entity_id text,
  entity_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);
