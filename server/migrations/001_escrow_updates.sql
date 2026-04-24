-- Migration 001: Escrow.com integration updates
-- Run this on any existing database that was created before the Escrow.com integration.
-- Safe to run multiple times (uses IF NOT EXISTS / IGNORE where possible).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. listings.biomass_type — add mustard_husk, sugarcane_husk, peanut_husk
--    Guarded: only runs if the column hasn't been updated yet.
--    (MySQL 8.0 does not support IF NOT EXISTS on MODIFY COLUMN)
-- ─────────────────────────────────────────────────────────────────────────────
SET @col_def = (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'listings'
    AND COLUMN_NAME  = 'biomass_type'
);
SET @needs_enum_update = IF(@col_def NOT LIKE '%mustard_husk%', 1, 0);
SET @sql_enum = IF(@needs_enum_update = 1,
  "ALTER TABLE listings MODIFY COLUMN biomass_type ENUM('rice_husk','sugarcane_bagasse','wood_chips','cotton_stalks','wheat_straw','corn_cobs','bamboo','mustard_husk','sugarcane_husk','peanut_husk','other') NOT NULL",
  'SELECT 1 /* biomass_type enum already up-to-date */'
);
PREPARE stmt_enum FROM @sql_enum;
EXECUTE stmt_enum;
DEALLOCATE PREPARE stmt_enum;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. orders — add Escrow.com columns (skip if already present)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS escrow_transaction_id VARCHAR(100)  NULL,
  ADD COLUMN IF NOT EXISTS escrow_payment_url    VARCHAR(500)  NULL,
  ADD COLUMN IF NOT EXISTS auto_release_at       DATETIME      NULL COMMENT '7 days after dispatch',
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at DATETIME      NULL;

-- Index for fast webhook lookup.
-- MySQL 8.0 does not support CREATE INDEX IF NOT EXISTS — guard via information_schema.
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'orders'
    AND INDEX_NAME   = 'idx_orders_escrow_transaction_id'
);
SET @sql_idx = IF(@idx_exists = 0,
  'CREATE INDEX idx_orders_escrow_transaction_id ON orders (escrow_transaction_id)',
  'SELECT 1 /* index already exists */'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

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
-- Guarded: only adds the constraint if it doesn't already exist.
SET @con_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA     = DATABASE()
    AND TABLE_NAME       = 'transactions'
    AND CONSTRAINT_NAME  = 'uq_transaction_order_escrow_event'
);
SET @sql_con = IF(@con_exists = 0,
  'ALTER TABLE transactions ADD CONSTRAINT uq_transaction_order_escrow_event UNIQUE (order_id, escrow_transaction_id, escrow_event)',
  'SELECT 1 /* constraint already exists */'
);
PREPARE stmt_con FROM @sql_con;
EXECUTE stmt_con;
DEALLOCATE PREPARE stmt_con;
