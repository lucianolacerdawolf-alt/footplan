import type { Team } from '../engine/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureAuth } from './supabaseClient';

// =============================================================================
// SNAPSHOT DE ELENCOS — cache permanente no Supabase
// =============================================================================
// Guarda o elenco sincronizado das 12 ligas numa ÚNICA linha global (id = 'global')
// na tabela `roster_snapshots`. Elencos são dados públicos (mesmos pra todo mundo),
// então não faz sentido uma linha por usuário — o app lê o snapshot compartilhado em
// vez de bater na API a cada sessão. A API só é chamada quando o usuário pede
// explicitamente ("Atualizar Elencos via API"), pra não estourar o limite dos tiers.
//
// PUBLICAR o snapshot é operação de admin (script `npm run rosters:sync` com a
// service role key): com a URL pública do site, write anônimo no snapshot deixaria
// qualquer usuário sobrescrever o elenco global de todos. Por isso o RLS é
// read-aberto + write só pra service role (que bypassa RLS).
//
// Schema (rodar no Supabase SQL editor — ver scripts/sql/harden-rls-roster-snapshots.sql
// pra endurecer uma instalação que já tinha write aberto):
//
//   CREATE TABLE roster_snapshots (
//     id TEXT PRIMARY KEY,
//     rosters JSONB NOT NULL,          -- Record<leagueId, Team[]>
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );
//   INSERT INTO roster_snapshots (id, rosters) VALUES ('global', '{}');
//   ALTER TABLE roster_snapshots ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "read global snapshot"
//     ON roster_snapshots FOR SELECT USING (true);
//   -- sem política de INSERT/UPDATE/DELETE: anon/authenticated não escrevem;
//   -- a service role (rosters:sync) bypassa RLS e publica o snapshot.

export interface RosterSnapshot {
  rosters: Record<string, Team[]>;
  updatedAt: string;
}

const GLOBAL_ID = 'global';

export function hasRosterCloud(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Carrega o snapshot global persistido das 12 ligas (ou null se não existir/offline).
 *  Distinção importante: "sem Supabase configurado" retorna null SEM log (comportamento
 *  esperado); erro real (rede, auth, consulta) também retorna null — o app segue offline-first —
 *  mas LOGADO via console.warn, pra falhas de cloud não ficarem silenciosas pra sempre. */
export async function loadRosterSnapshot(): Promise<RosterSnapshot | null> {
  if (!hasRosterCloud()) return null;
  try {
    const sb = await ensureAuth();
    const { data, error } = await sb
      .from('roster_snapshots')
      .select('rosters, updated_at')
      .eq('id', GLOBAL_ID)
      .maybeSingle();
    if (error) {
      console.warn('[rosterCloud] falha ao ler snapshot global:', error.message);
      return null;
    }
    if (!data || typeof data !== 'object' || !('rosters' in data)) return null;
    const row = data as { rosters: Record<string, Team[]>; updated_at: string };
    if (!row.rosters || Object.keys(row.rosters).length === 0) return null;
    return { rosters: row.rosters, updatedAt: row.updated_at };
  } catch (err) {
    console.warn('[rosterCloud] falha ao carregar snapshot global:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Grava (upsert) o snapshot global completo das 12 ligas. Lança em erro — o chamador
 *  decide o fallback. Exige um client com privilégio de escrita (service role, usado
 *  pelo script `rosters:sync`): o RLS de produção fecha write pra anon/authenticated,
 *  então chamar sem client admin falha com 403 — comportamento esperado no browser. */
export async function saveRosterSnapshot(rosters: Record<string, Team[]>, sb?: SupabaseClient): Promise<void> {
  if (!hasRosterCloud()) return;
  const client = sb ?? await ensureAuth();
  const { error } = await client
    .from('roster_snapshots')
    .upsert({
      id: GLOBAL_ID,
      rosters,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw error;
}
