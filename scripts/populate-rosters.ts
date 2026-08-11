/**
 * Popula o snapshot de elencos das 12 ligas no Supabase (tabela roster_snapshots).
 *
 * Uso: npm run rosters:sync
 * - Busca as 12 ligas AO VIVO nas fontes configuradas (football-data via proxy, SportAPI7, API-Football)
 * - Grava o cache local de cada liga
 * - Grava o snapshot completo no Supabase (fonte de leitura preferida antes da API)
 *
 * Requer .env com VITE_FOOTBALL_PROXY_URL / VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * e a tabela `roster_snapshots` criada no Supabase (ver PLANO_CLOUD_MERCADO.md).
 *
 * PUBLICAR o snapshot exige SUPABASE_SERVICE_ROLE_KEY no .env (sem prefixo VITE_,
 * nunca vai pro bundle do browser): o RLS de produção fecha write pra anon — só a
 * service role publica. Sem ela, o script sincroniza e grava cache local, mas o
 * snapshot global fica sem atualizar (aviso impresso no final).
 */

// Node não tem localStorage — polyfill em memória (basta pro cache de sessão/roster do script).
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

import { syncAllLeagueRosters } from '../src/services/rosterSync';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';

async function main() {
  console.log('🔄 Buscando elencos ao vivo das 12 ligas e gravando no Supabase…\n');

  // loadEnv com prefixo '' lê também vars sem VITE_ (a service role key não pode
  // ter prefixo VITE_ — tudo que é VITE_ vai pro bundle público do browser).
  const env = loadEnv('production', process.cwd(), '');
  let admin: SupabaseClient | undefined;
  if (env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  } else {
    console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY ausente no .env — o snapshot global NÃO será publicado (RLS de produção só aceita service role).\n');
  }

  const result = await syncAllLeagueRosters({ force: true, supabase: admin });

  const bySource: Record<string, number> = {};
  for (const src of Object.values(result.sources)) {
    bySource[src] = (bySource[src] ?? 0) + 1;
  }
  console.log(`✔ Liga(s) processada(s): ${result.leagueCount}`);
  console.log(`✔ Fonte por liga: ${JSON.stringify(bySource)}`);
  console.log(`✔ Ao vivo (API): ${result.liveCount}/${result.leagueCount}`);
  console.log(`✔ Snapshot gravado no Supabase em: ${result.updatedAt ?? 'n/a'}`);

  const failed = Object.entries(result.sources).filter(([, s]) => s === 'static' || s === 'error');
  if (failed.length > 0) {
    console.log(`\n⚠ Liga(s) sem dados ao vivo (estático/erro): ${failed.map(([id]) => id).join(', ')}`);
  } else {
    console.log('\n✅ Todas as 12 ligas sincronizadas ao vivo.');
  }
}

main()
  .catch(err => {
    console.error('❌ Falha ao sincronizar:', err);
    process.exitCode = 1;
  });
