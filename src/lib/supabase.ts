import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: if env vars are missing we export a stub so importing files don't crash
// at build time. Any runtime call will throw a readable error instead of a
// cryptic "Cannot read properties of undefined".
let supabase: SupabaseClient;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[AutoTrendX] ✅ Supabase connected to:', supabaseUrl);
} else {
  // Minimal stub — satisfies TypeScript's structural typing for SupabaseClient.
  // Methods will throw at runtime only if actually called without env vars.
  supabase = {
    auth: {
      getSession:         () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange:  (_event: unknown, _cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp:             () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut:            () => Promise.resolve({ error: null }),
    },
    from: (_table: string) => ({
      select:  (_cols?: string) => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }), single: () => Promise.resolve({ data: null, error: null }), data: [], error: null }) }),
      insert:  (_rows: unknown) => ({ select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      update:  (_row: unknown)  => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      delete:  ()               => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
    }),
  } as unknown as SupabaseClient;

  // ── DIAGNOSTIC: Open browser DevTools → Console to see this ──
  console.error(
    '[AutoTrendX] ❌ SUPABASE NOT CONFIGURED\n' +
    'VITE_SUPABASE_URL    = ' + JSON.stringify(supabaseUrl) + '\n' +
    'VITE_SUPABASE_ANON_KEY = ' + (supabaseKey ? `"${supabaseKey.substring(0,20)}..."` : JSON.stringify(supabaseKey)) + '\n\n' +
    'Fix: On Vercel → Settings → Environment Variables,\n' +
    'add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY,\n' +
    'then REDEPLOY the project.'
  );
}

export interface DerivUserSyncData {
  account_id: string;
  email?: string;
  full_name?: string;
  account_type?: string;
  balance?: number | string;
  currency?: string;
}

export async function syncDerivUserToSupabase(userData: DerivUserSyncData) {
  if (!supabaseUrl || !supabaseKey || !userData?.account_id) return;
  try {
    const accId = userData.account_id;
    const email = userData.email || `${accId.toLowerCase()}@deriv.com`;
    const fullName = userData.full_name || `Deriv Trader (${accId})`;
    const accountType = userData.account_type || (accId.startsWith('VRTC') ? 'Demo' : 'Real');
    const currency = userData.currency || 'USD';
    const numBalance = typeof userData.balance === 'number'
      ? userData.balance
      : parseFloat(String(userData.balance || 0));

    // Upsert user profile into profiles table
    await supabase.from('profiles').upsert(
      [
        {
          id: accId,
          email: email,
          full_name: fullName,
          deriv_token: accId,
          account_type: accountType,
          status: 'Online',
          updated_at: new Date().toISOString()
        }
      ],
      { onConflict: 'email' }
    );

    // Upsert balance into account_balance table
    await supabase.from('account_balance').upsert(
      [
        {
          user_id: accId,
          balance: isNaN(numBalance) ? 0 : numBalance,
          currency: currency,
          last_updated: new Date().toISOString()
        }
      ],
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('[AutoTrendX] User sync error:', err);
  }
}

export { supabase };
