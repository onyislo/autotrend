-- ============================================================
-- AutoTrendX Supabase Database Schema
-- Run this ENTIRE script in your Supabase SQL Editor.
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. PROFILES table (Deriv OAuth users synced on login)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  deriv_token  TEXT,
  account_type TEXT DEFAULT 'Real',
  status       TEXT DEFAULT 'Online',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 2. TRADING_BOTS table (Admin-created bots shown to all users)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trading_bots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  name        TEXT NOT NULL,
  description TEXT,
  strategy    JSONB NOT NULL DEFAULT '{}',
  is_public   BOOLEAN DEFAULT TRUE,
  is_active   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 3. TRADES table (Real-time trade logs)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trades (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            TEXT,
  user_email         TEXT,
  bot_id             TEXT,
  symbol             TEXT NOT NULL,
  contract_type      TEXT NOT NULL,
  type               TEXT NOT NULL,
  amount             DECIMAL(10,2) NOT NULL,
  entry_price        DECIMAL(10,4),
  exit_price         DECIMAL(10,4),
  profit_loss        DECIMAL(10,2),
  status             TEXT NOT NULL DEFAULT 'open',
  deriv_contract_id  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 4. ACCOUNT_BALANCE table (Live balances synced from Deriv)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_balance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT UNIQUE NOT NULL,
  balance      DECIMAL(10,2) DEFAULT 0,
  currency     TEXT DEFAULT 'USD',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Enable Row Level Security
-- ──────────────────────────────────────────────────────────
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────
-- POLICIES: Allow anon key (public) full access
-- This app uses Deriv OAuth, NOT Supabase Auth,
-- so auth.uid() is always NULL. Policies must use USING (true).
-- ──────────────────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "anon select profiles"  ON profiles;
DROP POLICY IF EXISTS "anon insert profiles"  ON profiles;
DROP POLICY IF EXISTS "anon update profiles"  ON profiles;
CREATE POLICY "anon select profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "anon insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update profiles" ON profiles FOR UPDATE USING (true);

-- trading_bots
DROP POLICY IF EXISTS "anon select trading_bots" ON trading_bots;
DROP POLICY IF EXISTS "anon insert trading_bots" ON trading_bots;
DROP POLICY IF EXISTS "anon update trading_bots" ON trading_bots;
DROP POLICY IF EXISTS "anon delete trading_bots" ON trading_bots;
CREATE POLICY "anon select trading_bots" ON trading_bots FOR SELECT USING (true);
CREATE POLICY "anon insert trading_bots" ON trading_bots FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update trading_bots" ON trading_bots FOR UPDATE USING (true);
CREATE POLICY "anon delete trading_bots" ON trading_bots FOR DELETE USING (true);

-- trades
DROP POLICY IF EXISTS "anon select trades" ON trades;
DROP POLICY IF EXISTS "anon insert trades" ON trades;
CREATE POLICY "anon select trades" ON trades FOR SELECT USING (true);
CREATE POLICY "anon insert trades" ON trades FOR INSERT WITH CHECK (true);

-- account_balance
DROP POLICY IF EXISTS "anon select balance" ON account_balance;
DROP POLICY IF EXISTS "anon insert balance" ON account_balance;
DROP POLICY IF EXISTS "anon update balance" ON account_balance;
CREATE POLICY "anon select balance" ON account_balance FOR SELECT USING (true);
CREATE POLICY "anon insert balance" ON account_balance FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update balance" ON account_balance FOR UPDATE USING (true);

-- ──────────────────────────────────────────────────────────
-- Grant explicit permissions to anon and authenticated roles
-- ──────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON trading_bots    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE         ON profiles         TO anon, authenticated;
GRANT SELECT, INSERT                 ON trades           TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE         ON account_balance  TO anon, authenticated;

-- ──────────────────────────────────────────────────────────
-- Auto-update updated_at on row changes
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at     ON profiles;
DROP TRIGGER IF EXISTS trg_trading_bots_updated_at ON trading_bots;
DROP TRIGGER IF EXISTS trg_trades_updated_at       ON trades;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_trading_bots_updated_at
  BEFORE UPDATE ON trading_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();