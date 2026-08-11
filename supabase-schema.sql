-- AutoTrendX Supabase Database Schema
-- Run this script in your Supabase SQL Editor to create tables for Deriv Users, Bots, Trades, and Balances.

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 1. Create profiles table (Stores Deriv authenticated client accounts & user data)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  deriv_token TEXT,
  account_type TEXT DEFAULT 'Real',
  status TEXT DEFAULT 'Online',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create trading_bots table (Stores global shared & custom user trading bots)
CREATE TABLE IF NOT EXISTS trading_bots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  strategy JSONB NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create trades table (Stores real-time trade logs executed by clients/bots)
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  user_email TEXT,
  bot_id TEXT,
  symbol TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'RISE', 'FALL', 'DIFFERS', 'MATCHES')),
  amount DECIMAL(10,2) NOT NULL,
  entry_price DECIMAL(10,4),
  exit_price DECIMAL(10,4),
  profit_loss DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'open',
  deriv_contract_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create account_balance table (Stores client live account balances)
CREATE TABLE IF NOT EXISTS account_balance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Public view profiles" ON profiles;
CREATE POLICY "Public view profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert profiles" ON profiles;
CREATE POLICY "Public insert profiles" ON profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update profiles" ON profiles;
CREATE POLICY "Public update profiles" ON profiles FOR UPDATE USING (true);

-- Policies for trading_bots
DROP POLICY IF EXISTS "Public view trading_bots" ON trading_bots;
CREATE POLICY "Public view trading_bots" ON trading_bots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert trading_bots" ON trading_bots;
CREATE POLICY "Public insert trading_bots" ON trading_bots FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update trading_bots" ON trading_bots;
CREATE POLICY "Public update trading_bots" ON trading_bots FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete trading_bots" ON trading_bots;
CREATE POLICY "Public delete trading_bots" ON trading_bots FOR DELETE USING (true);

-- Policies for trades
DROP POLICY IF EXISTS "Public view trades" ON trades;
CREATE POLICY "Public view trades" ON trades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert trades" ON trades;
CREATE POLICY "Public insert trades" ON trades FOR INSERT WITH CHECK (true);

-- Policies for account_balance
DROP POLICY IF EXISTS "Public view balance" ON account_balance;
CREATE POLICY "Public view balance" ON account_balance FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert balance" ON account_balance;
CREATE POLICY "Public insert balance" ON account_balance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update balance" ON account_balance;
CREATE POLICY "Public update balance" ON account_balance FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_bots_updated_at ON trading_bots;
CREATE TRIGGER update_trading_bots_updated_at BEFORE UPDATE ON trading_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();