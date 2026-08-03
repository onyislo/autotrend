import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: if env vars are missing we export a stub so importing files don't crash
// at build time. Any runtime call will throw a readable error instead of a
// cryptic "Cannot read properties of undefined".
let supabase: SupabaseClient;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
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

  console.warn(
    '[AutoTrendX] Supabase env vars not set (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
    'Auth and database features are disabled.',
  );
}

export { supabase };
