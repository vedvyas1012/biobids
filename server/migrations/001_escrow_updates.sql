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
-- 2. orders — add Escrow.com columns (guarded via information_schema)
--    MySQL 8.0+ does not support ADD COLUMN IF NOT EXISTS (MariaDB syntax).
-- ─────────────────────────────────────────────────────────────────────────────
SET @add_escrow_txn = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='escrow_transaction_id');
SET @sql = IF(@add_escrow_txn=0, 'ALTER TABLE orders ADD COLUMN escrow_transaction_id VARCHAR(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @add_escrow_url = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='escrow_payment_url');
SET @sql = IF(@add_escrow_url=0, 'ALTER TABLE orders ADD COLUMN escrow_payment_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @add_auto_rel = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='auto_release_at');
SET @sql = IF(@add_auto_rel=0, 'ALTER TABLE orders ADD COLUMN auto_release_at DATETIME NULL COMMENT \'7 days after dispatch\'', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @add_del_conf = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='delivery_confirmed_at');
SET @sql = IF(@add_del_conf=0, 'ALTER TABLE orders ADD COLUMN delivery_confirmed_at DATETIME NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

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

-- Remove old Razorpay columns from orders if they still exist
SET @drop_rp_oid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='razorpay_order_id');
SET @sql = IF(@drop_rp_oid=1, 'ALTER TABLE orders DROP COLUMN razorpay_order_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @drop_rp_pid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='razorpay_payment_id');
SET @sql = IF(@drop_rp_pid=1, 'ALTER TABLE orders DROP COLUMN razorpay_payment_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. transactions — add Escrow.com columns (guarded via information_schema)
-- ─────────────────────────────────────────────────────────────────────────────
SET @add_txn_id = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='escrow_transaction_id');
SET @sql = IF(@add_txn_id=0, 'ALTER TABLE transactions ADD COLUMN escrow_transaction_id VARCHAR(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @add_txn_ev = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='escrow_event');
SET @sql = IF(@add_txn_ev=0, 'ALTER TABLE transactions ADD COLUMN escrow_event VARCHAR(100) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Remove old Razorpay columns from transactions if they still exist
SET @drop_t_roid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='razorpay_order_id');
SET @sql = IF(@drop_t_roid=1, 'ALTER TABLE transactions DROP COLUMN razorpay_order_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @drop_t_rpid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='razorpay_payment_id');
SET @sql = IF(@drop_t_rpid=1, 'ALTER TABLE transactions DROP COLUMN razorpay_payment_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @drop_t_rpoid = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='razorpay_payout_id');
SET @sql = IF(@drop_t_rpoid=1, 'ALTER TABLE transactions DROP COLUMN razorpay_payout_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @drop_t_sig = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='transactions' AND COLUMN_NAME='razorpay_signature');
SET @sql = IF(@drop_t_sig=1, 'ALTER TABLE transactions DROP COLUMN razorpay_signature', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. users — add is_active for account suspension (guarded via information_schema)
-- ─────────────────────────────────────────────────────────────────────────────
SET @add_is_active = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='is_active');
SET @sql = IF(@add_is_active=0, 'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT \'0 = suspended\'', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

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
