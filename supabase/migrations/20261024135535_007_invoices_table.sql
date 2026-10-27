/*
# Invoices Table with Line Items

## Overview
Adds a dedicated invoices table for professional invoice generation with line items,
supporting draft/issued/paid states. This complements the existing payments table
(which tracks individual payment records) with full invoice documents.

## New Table
1. **invoices** — Professional invoices with line items stored as JSONB
   - id (uuid, primary key)
   - invoice_id (auto-generated VW-INV-XXXXXX)
   - client_id (FK to clients)
   - patient_id (FK to patients, nullable)
   - appointment_id (text, nullable reference)
   - line_items (JSONB array: description, quantity, unitPrice, taxPercent)
   - subtotal (numeric)
   - tax_amount (numeric)
   - discount (numeric, defaults to 0)
   - total (numeric)
   - paid_amount (numeric, defaults to 0)
   - status (text: draft, issued, partially_paid, paid, overdue, cancelled)
   - due_date (date)
   - notes (text)
   - created_by (uuid)
   - created_at, updated_at

## Security
- RLS enabled with anon+authenticated access (consistent with existing tables)
- All CRUD operations allowed (authorization handled at application level)
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE NOT NULL DEFAULT 'VW-INV-' || lpad((nextval('pay_id_seq'))::text, 6, '0'),
  client_id text REFERENCES clients(client_id) ON DELETE CASCADE,
  patient_id text REFERENCES patients(patient_id) ON DELETE SET NULL,
  appointment_id text,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inv_select" ON invoices;
CREATE POLICY "inv_select" ON invoices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "inv_insert" ON invoices;
CREATE POLICY "inv_insert" ON invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inv_update" ON invoices;
CREATE POLICY "inv_update" ON invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inv_delete" ON invoices;
CREATE POLICY "inv_delete" ON invoices FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_inv_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_inv_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_invoice_id ON invoices(invoice_id);
