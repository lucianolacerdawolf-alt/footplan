/**
 * Exporta o snapshot global de elencos (Supabase) para public/rosters-snapshot.json —
 * a reserva offline do app (ver rosterCloud.loadBundledSnapshot). O rosters:sync já
 * grava esse arquivo; este comando serve pra gerar sem bater nas APIs de futebol.
 * Uso: npm run rosters:bundle   (precisa de VITE_SUPABASE_URL/ANON_KEY no .env)
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { writeRosterBundle } from './lib/rosterBundle';

async function main() {
  const env = loadEnv('production', process.cwd(), '');
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error('Faltando VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY no .env');
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from('roster_snapshots').select('rosters, updated_at').eq('id', 'global').single();
  if (error) throw new Error(error.message);
  writeRosterBundle(data.rosters, data.updated_at);
  console.log(`✅ public/rosters-snapshot.json: ${Object.keys(data.rosters).length} ligas, atualizado em ${data.updated_at}`);
}

main().catch(e => { console.error('❌', e instanceof Error ? e.message : e); process.exitCode = 1; });
