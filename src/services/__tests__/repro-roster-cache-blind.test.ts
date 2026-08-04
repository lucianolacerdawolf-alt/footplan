// =============================================================================
// REGRESSÃO H1 — Cache de roster contaminado é REJEITADO por readCache
// =============================================================================
// Antes do fix, `readCache` (rosterSync.ts) só validava TTL + que `teams` era
// array não-vazio — nunca conferia se os `team.id` pertenciam à liga, nem a
// versão do schema. Em cache hit, `syncLeagueRoster` retornava o cache sem
// re-rodar `assignRemoteTeams`. Logo, se `fp:rosterCache:pl` fosse gravado
// com um array contaminado (debug manual, build intermediário, corrida), o
// Aston Villa podia aparecer com jogadores do Brest e isso persistia 7 dias
// sem chance de auto-correção — o mecanismo por trás do bug "Bizot no Villa".
//
// Sintoma real: numa prévia Arsenal × Aston Villa, Marco Bizot (goleiro do
// Brest/Ligue 1) aparecia pelo Aston Villa. Não há caminho no sync limpo que
// faça isso — só via cache contaminado aceito cego.
//
// Fix: `readCache` agora valida `version` e que `staticIds` do cache batem
// com os ids dos times estáticos da liga. Cache divergente → descartado.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncLeagueRoster, clearRosterCache } from '../rosterSync';
import { premierLeague } from '@/data/leagues/premierLeague';

function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
}

describe('REGRESSÃO H1 — cache contaminado é rejeitado', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_FOOTBALL_API_KEY', '');
    vi.stubEnv('VITE_FOOTBALL_PROXY_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    clearRosterCache();
  });
  afterEach(() => {
    clearRosterCache();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('cache sem campo version (schema antigo) é descartado', async () => {
    const cacheAntigo = { fetchedAt: Date.now(), teams: premierLeague.teams };
    localStorage.setItem('fp:rosterCache:pl', JSON.stringify(cacheAntigo));

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncLeagueRoster(premierLeague);
    // Sem chave/proxy configurados → cai pra 'static' (não usa o cache velho).
    expect(result.source).toBe('static');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cache com staticIds divergentes (elenco de outra liga) é descartado', async () => {
    // Contaminação: Aston Villa com Marco Bizot (Brest) no elenco, e staticIds
    // que NÃO batem com a Premier League.
    const contaminatedTeams = premierLeague.teams.map(t =>
      t.id === 'aston-villa'
        ? {
            ...t,
            squad: [
              {
                id: 'sb29-1',
                name: 'Marco Bizot',
                number: 1,
                position: 'GK' as const,
                currentFatigue: 0,
                attributes: { speed: 34, stamina: 68, passing: 50, finishing: 8, tackling: 12, dribbling: 14, vision: 54, positioning: 78 },
              },
            ],
          }
        : t,
    );
    localStorage.setItem(
      'fp:rosterCache:pl',
      JSON.stringify({ fetchedAt: Date.now(), teams: contaminatedTeams, version: 2, staticIds: ['sb29'] }),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncLeagueRoster(premierLeague);
    expect(result.source).toBe('static');
    const villaSquad = result.league.teams.find(t => t.id === 'aston-villa')!.squad;
    const bizot = villaSquad.find(p => p.name === 'Marco Bizot');
    expect(bizot, 'Bizot não deve aparecer no Aston Villa — cache contaminado foi rejeitado').toBeUndefined();
  });

  it('cache válido (version + staticIds corretos) é aceito normalmente', async () => {
    const validCache = {
      fetchedAt: Date.now(),
      teams: premierLeague.teams,
      version: 2,
      staticIds: premierLeague.teams.map(t => t.id),
    };
    localStorage.setItem('fp:rosterCache:pl', JSON.stringify(validCache));

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncLeagueRoster(premierLeague);
    expect(result.source).toBe('cache');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
