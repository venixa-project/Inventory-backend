-- Migration: 002_create_test_loyalty_rewards
-- Purpose: Verify automated schema migration pipeline

CREATE TABLE IF NOT EXISTS test_loyalty_rewards (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0,
  tier VARCHAR(50) DEFAULT 'Bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

