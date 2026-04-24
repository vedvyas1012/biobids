-- Migration 001: Escrow.com integration updates
-- Run this on any existing database that was created before the Escrow.com integration.
-- Safe to run multiple times (uses IF NOT EXISTS / IGNORE where possible).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. listings.biomass_type — add mustard_husk, sugarcane_husk, peanut_husk
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE listings
  MODIFY COLUMN biomass_type ENUM(
    'rice_husk', 'sugarcane_bagasse', 'wood_chips', 'cotton_stalks',
    'wheat_straw', 'corn_cobs', 'bamboo',
    'mustard_husk', 'sugarcane_husk', 'peanut_husk',
    'other'
  ) NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. orders — add Escrow.com columns (skip if already present)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS escrow_transaction_id VARCHAR(100)  NULL,
  ADD COLUMN IF NOT EXISTS escrow_payment_url    VARCHAR(500)  NULL,
  ADD COLUMN IF NOT EXISTS auto_release_at       DATETIME      NULL COMMENT '7 days after dispatch',
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at DATETIME      NULL;

-- Index for fast webhook lookup
CREATE INDEX IF NOT EXISTS idx_orders_escrow_transaction_id
  ON orders (escrow_transaction_id);

-- Remove old Razorpay columns if they still exist
ALTER TABLE orders
  DROP COLUMN IF EXISTS razorpay_order_id,
  DROP COLUMN IF EXISTS razorpay_payment_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. transactions — add Escrow.com columns (skip if already present)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS escrow_transaction_id VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS escrow_event          VARCHAR(100) NULL;

-- Remove old Razorpay columns if they still exist
ALTER TABLE transactions
  DROP COLUMN IF EXISTS razorpay_order_id,
  DROP COLUMN IF EXISTS razorpay_payment_id,
  DROP COLUMN IF EXISTS razorpay_signature;

-- Unique constraint to prevent duplicate webhook rows
-- (NULL values in nullable columns do NOT violate uniqueness in MySQL)
ALTER TABLE transactions
  ADD CONSTRAINT uq_transaction_order_escrow_event
    UNIQUE (order_id, escrow_transaction_id, escrow_event);
