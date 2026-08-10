/**
 * Sincroniza AO VIVO só as ligas passadas como argumento (padrão: as 4 segundas
 * divisões via API-Football) e mescla no snapshot existente do Supabase — SEM tocar
 * nas outras ligas (evita regredir as 1ªs divisões se uma fonte falhar no meio).
 *
 * Uso:
 *   npx vite-node scripts/sync-leagues.ts                       # dry-run das 4 segundas divisões
 *   npx vite-node scripts/sync-leagues.ts --write               # busca + grava no Supabase
 *   npx vite-node scripts/sync-leagues.ts laliga2 serieB --write
 *
 * Guardas: só mescla ligas que voltaram `source: 'live'`; nunca sobrescreve uma liga
 * com dados estáticos; só grava se ≥1 liga veio ao vivo e houver snapshot base pra mesclar.
 *
 * Requer .env com VITE_FOOTBALL_PROXY_URL / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 *
 * ── COTAS DAS APIS (estado em 2026-08-10) ──────────────────────────────────────
 * - API-Football (RapidAPI, plano gratuito): 100 req/dia. ESGOTADA — voltou 429
 *   (e 403 no laliga2) em 2026-08-10; enquanto estiver esgotada, laliga2, bundesliga2,
 *   serieB e ligaPortugal2 ficam com os dados do snapshot anterior do Supabase.
 * - SportAPI7 (RapidAPI, mesma conta): também esgotada (429) no mesmo dia — afeta
 *   ligue2 (e o fallback de championship).
 * - football-data.org (via proxy): limite é 10 req/min por janela, NÃO é diário — nunca
 *   "esgota" no sentido diário. Mas o tier gratuito só cobre a 1ª divisão de cada país
 *   (championship é a exceção). Por isso championship veio ao vivo e as outras 2ªs não.
 * - Reset das cotas RapidAPI: diário. Depois do reset, rodar
 *   `npx vite-node scripts/sync-leagues.ts --write` de novo pra atualizar as 5 restantes.
 * - O snapshot no Supabase é o fallback oficial: o app lê dele antes de bater na API,
 *   então o jogo continua com elencos razoavelmente recentes mesmo com cota zerada.
 * ────────────────────────────────────────────────────────────────────────────────
 */

// Node não tem localStorage — polyfill em memória (igual populate-rosters.ts).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
}

import type { Team } from '../src/engine/types';
import { getLeague } from '../src/data/leagues';
import { syncLeagueRoster } from '../src/services/rosterSync';
import { loadRosterSnapshot, saveRosterSnapshot } from '../src/services/rosterCloud';

const DEFAULT_LEAGUES = ['laliga2', 'bundesliga2', 'serieB', 'ligaPortugal2'];

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const ids = args.filter(a => !a.startsWith('--'));
  const leagueIds = ids.length > 0 ? ids : DEFAULT_LEAGUES;

  console.log(`🔄 Sincronizando ${leagueIds.length} liga(s) ao vivo: ${leagueIds.join(', ')}${write ? ' (--write)' : ' (dry-run)'}\n`);

  const snapshot = await loadRosterSnapshot();
  if (!snapshot) {
    console.log('⚠ Nenhum snapshot base encontrado no Supabase — sem base pra mesclar com segurança. Abortando.');
    process.exitCode = 1;
    return;
  }
  console.log(`Snapshot base: ${Object.keys(snapshot.rosters).length} liga(s), atualizado em ${snapshot.updatedAt}\n`);

  const merged: Record<string, Team[]> = { ...snapshot.rosters };
  const results: Array<{ id: string; source: string; teams: number; players: number; error?: string }> = [];

  for (const id of leagueIds) {
    const league = getLeague(id);
    if (!league) { results.push({ id, source: 'inexistente', teams: 0, players: 0 }); continue; }
    try {
      const res = await syncLeagueRoster(league, { force: true });
      const teams = res.league.teams;
      const players = teams.reduce((s, t) => s + t.squad.length, 0);
      results.push({ id, source: res.source, teams: teams.length, players, error: res.error });
      if (res.source === 'live') merged[id] = teams;
    } catch (err) {
      results.push({ id, source: 'exception', teams: 0, players: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log('Resultado por liga:');
  for (const r of results) {
    const ok = r.source === 'live';
    console.log(`  ${ok ? '✅' : '⚠️ '} ${r.id.padEnd(14)} fonte=${r.source.padEnd(9)} times=${r.teams} jogadores=${r.players}${r.error ? ` — ${r.error}` : ''}`);
  }

  const live = results.filter(r => r.source === 'live');
  if (!write) {
    console.log(`\n(dry-run — nada gravado. ${live.length}/${leagueIds.length} ao vivo. Rode com --write pra atualizar o Supabase.)`);
    return;
  }
  if (live.length === 0) {
    console.log('\n❌ Nenhuma liga veio ao vivo — nada gravado no Supabase.');
    process.exitCode = 1;
    return;
  }
  await saveRosterSnapshot(merged);
  console.log(`\n✅ Supabase atualizado — ligas mescladas ao vivo: ${live.map(r => r.id).join(', ')}`);
  const notLive = results.filter(r => r.source !== 'live');
  if (notLive.length > 0) console.log(`⚠ Mantidas do snapshot anterior (não vieram ao vivo): ${notLive.map(r => r.id).join(', ')}`);
}

main().catch(err => {
  console.error('❌ Falha:', err);
  process.exitCode = 1;
});
