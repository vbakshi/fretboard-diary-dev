import { createClient } from '@supabase/supabase-js';
import { createSupabaseDebugFetch } from './supabaseDebugFetch';

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const hasSupabaseEnv = Boolean(url && anonKey);

// Prevent app boot crash when env vars are missing.
export const supabase = hasSupabaseEnv
  ? createClient(url, anonKey, {
      global: {
        fetch: createSupabaseDebugFetch(),
      },
    })
  : null;
