// Supabase client setup.
// This file reads the public URL and anon key from Vite env vars:
// - VITE_SUPABASE_URL
// - VITE_SUPABASE_ANON_KEY
// If you haven't created a Supabase project yet, create one and set those env vars
// in a `.env` file at the project root (Vite will expose `VITE_` prefixed vars to the client):
//
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key
//
// Note: The code below assumes you'll create a table named `doctori` with at least
// columns: id (numeric primary key), nume (text), email (text), telefon (text).

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

// Export a top-level const that is either a SupabaseClient or null. Consumers
// should check for `supabase` before using it (the app will fall back to
// local state when env vars are not provided).
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
