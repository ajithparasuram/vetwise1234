/*
# Invoices — Refund Support

## Overview
Adds refund tracking to the existing invoices table so admins can record
partial or full refunds against an invoice. A new `refunded` status is
introduced for invoices that have been fully refunded.

## Changes to existing tables
1. `invoices`
   - `refund_amount` (numeric, defaults to 0) — amount refunded so far
   - `refunded_at` (timestamptz, nullable) — when the most recent refund was recorded
   - `refund_reason` (text, nullable) — admin note for the refund

## Security
- No new tables; existing invoices RLS policies already grant full CRUD to
  `anon, authenticated` (this is the existing single-tenant model used by
  the VetWise demo). No policy changes required.
- The new columns inherit the existing UPDATE grant automatically.

## Important notes
1. This migration is additive only — no data is lost.
2. The frontend will surface a "Refund" action on invoices with
   `paid_amount > refund_amount`; recording a refund increments
   `refund_amount` and, when it reaches `paid_amount`, sets `status` to
   `refunded` and stamps `refunded_at`.
*/

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text;
