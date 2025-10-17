import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Generic typed results
export type SaveResult<T> = { success: true; data: T } | { success: false; error: string };
export type FetchResult<T> = { success: true; data: T[] } | { success: false; error: string };

// Save a row to a table. Returns the inserted row on success.
export async function saveData<T = any>(table: string, payload: T): Promise<SaveResult<T>> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env' };
  }

  try {
    const { data, error } = await supabase.from(table).insert([payload]).select().single();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as T };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Fetch all rows from a table.
export async function fetchData<T = any>(table: string): Promise<FetchResult<T>> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env' };
  }

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as T[] };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Real-time subscription helper. Returns an object with unsubscribe() to stop listening.
export function subscribeToTable<T = any>(table: string, callback: (payload: { eventType: string; new?: T; old?: T }) => void) {
  if (!supabase) {
    return { unsubscribe: async () => {} };
  }

  // supabase-js v2 realtime subscription via channel
  const channel = (supabase as SupabaseClient).channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
      try {
        callback({ eventType: payload.eventType, new: payload.new as T, old: payload.old as T });
      } catch (e) {
        // swallow callback errors
        // callers should handle their own errors
        // console.error('subscribeToTable callback error', e);
      }
    })
    .subscribe();

  return {
    channel,
    unsubscribe: async () => {
      try {
        if (channel && typeof channel.unsubscribe === 'function') {
          await channel.unsubscribe();
        } else if (supabase && typeof (supabase as any).removeChannel === 'function') {
          // fallback API
          (supabase as any).removeChannel(channel);
        }
      } catch (e) {
        // ignore
      }
    }
  };
}

export default {
  saveData,
  fetchData,
  subscribeToTable,
};
