import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] Missing env vars — database features will be disabled.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// Deriv OAuth functions
export const signInWithDeriv = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github', // We'll use GitHub as template, then configure Deriv
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      scopes: 'read,trade'
    }
  })
  return { data, error }
}

// For direct Deriv token login
export const signInWithDerivToken = async (token: string) => {
  // This will validate the token with Deriv API first
  try {
    const response = await fetch('https://api.deriv.com/oauth2/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `deriv_${token.slice(0, 8)}@deriv.local`,
        password: token
      })
      return { data, error }
    }
  } catch (err) {
    return { data: null, error: err }
  }
}

// Database types
export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface TradingBot {
  id: string
  user_id: string
  name: string
  description: string | null
  strategy: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  user_id: string
  bot_id: string | null
  symbol: string
  type: 'buy' | 'sell'
  amount: number
  entry_price: number
  exit_price: number | null
  profit_loss: number | null
  status: 'open' | 'closed' | 'cancelled'
  created_at: string
  updated_at: string
}