import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'fp:supabase_session',
    },
  });
  return client;
}

export async function ensureAuth(): Promise<SupabaseClient> {
  const sb = getSupabaseClient();

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        const { error } = await sb.auth.signInAnonymously();
        if (error) throw error;
      }
    } catch {
      try {
        const { error } = await sb.auth.signInAnonymously();
        if (error) throw error;
      } catch (innerErr) {
        throw new Error(`Auth failed: ${innerErr instanceof Error ? innerErr.message : 'unknown'}`);
      }
    }
    return sb;
  })();

  return initPromise;
}

export function resetAuth(): void {
  client = null;
  initPromise = null;
}
