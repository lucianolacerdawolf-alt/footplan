/**
 * Copia o snapshot global de elencos (roster_snapshots, linha 'global') entre projetos
 * Supabase, sem bater nas APIs de futebol (não gasta cota).
 *
 * Dois passos (assim dá pra exportar ANTES de trocar o .env pro projeto novo):
 *
 *   1) Exportar do projeto atual do .env (VITE_SUPABASE_URL/ANON_KEY — leitura é pública):
 *        npm run rosters:copy -- --export roster-snapshot.json
 *
 *   2) Depois de apontar o .env pro projeto novo e rodar scripts/sql/setup-supabase.sql nele,
 *      importar com a service role do projeto novo (SUPABASE_SERVICE_ROLE_KEY, sem VITE_):
 *        npm run rosters:copy -- --import roster-snapshot.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

interface SnapshotFile {
  rosters: Record<string, unknown[]>;
  updated_at: string;
}

function need(env: Record<string, string>, keys: string[]) {
  const missing = keys.filter(k => !env[k]);
  if (missing.length) throw new Error(`Faltando no .env: ${missing.join(', ')}`);
}

async function exportSnapshot(env: Record<string, string>, file: string) {
  need(env, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('roster_snapshots')
    .select('rosters, updated_at')
    .eq('id', 'global')
    .maybeSingle();
  if (error) throw new Error(`Leitura falhou: ${error.message}`);
  if (!data) throw new Error('O projeto não tem a linha global de roster_snapshots.');
  writeFileSync(file, JSON.stringify(data));
  const leagues = Object.keys((data as SnapshotFile).rosters);
  console.log(`📥 Exportado: ${leagues.length} liga(s), atualizado em ${data.updated_at} → ${file}`);
}

async function importSnapshot(env: Record<string, string>, file: string) {
  need(env, ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const snap = JSON.parse(readFileSync(file, 'utf8')) as SnapshotFile;
  const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await sb
    .from('roster_snapshots')
    .upsert({ id: 'global', rosters: snap.rosters, updated_at: snap.updated_at }, { onConflict: 'id' });
  if (error) throw new Error(`Gravação falhou: ${error.message}`);
  console.log(`✅ Importado no projeto do .env: ${Object.keys(snap.rosters).join(', ')}`);
}

async function main() {
  const env = loadEnv('production', process.cwd(), '');
  const [mode, file] = process.argv.slice(2);
  if (mode === '--export' && file) return exportSnapshot(env, file);
  if (mode === '--import' && file) return importSnapshot(env, file);
  throw new Error('Uso: npm run rosters:copy -- --export <arquivo.json>  |  --import <arquivo.json>');
}

main().catch(err => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
