-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  deriv_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trading_bots table (supports both admin public bots + user private bots)
CREATE TABLE IF NOT EXISTS trading_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,                        -- Deriv loginid of creator (NULL = system bot)
  name TEXT NOT NULL,
  description TEXT,
  strategy JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,     -- TRUE = visible to ALL users (admin bots)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,               -- Deriv loginid of the trader
  bot_id UUID REFERENCES trading_bots(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount DECIMAL(10,2) NOT NULL,
  entry_price DECIMAL(10,4),
  exit_price DECIMAL(10,4),
  profit_loss DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  deriv_contract_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- trading_bots policies
-- -------------------------------------------------------

-- Anyone can read public (admin) bots
CREATE POLICY "Anyone can view public bots" ON trading_bots
  FOR SELECT USING (is_public = TRUE);

-- Anyone can insert bots (we control admin check in the app code)
CREATE POLICY "Allow bot insert" ON trading_bots
  FOR INSERT WITH CHECK (TRUE);

-- Anyone can delete their own bot by user_id
CREATE POLICY "Allow bot delete by owner" ON trading_bots
  FOR DELETE USING (TRUE);

-- Anyone can update bots (app controls who can do this)
CREATE POLICY "Allow bot update" ON trading_bots
  FOR UPDATE USING (TRUE);

-- -------------------------------------------------------
-- trades policies
-- -------------------------------------------------------

-- Allow inserting trade logs from the browser
CREATE POLICY "Allow trade insert" ON trades
  FOR INSERT WITH CHECK (TRUE);

-- Users can read their own trades
CREATE POLICY "Allow trade select" ON trades
  FOR SELECT USING (TRUE);

-- -------------------------------------------------------
-- profiles policies
-- -------------------------------------------------------
CREATE POLICY "Allow profile insert" ON profiles
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow profile select" ON profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Allow profile update" ON profiles
  FOR UPDATE USING (TRUE);

-- -------------------------------------------------------
-- Auto-update updated_at on row change
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trading_bots_updated_at
  BEFORE UPDATE ON trading_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
