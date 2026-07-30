// =============================================================================
// REGRESSÃO H2 — apiFootball atribui jogador ao clube ATUAL (último statistics)
// =============================================================================
// Antes do fix, `fetchApiFootballLeague` (apiFootball.ts) agrupava jogadores
// pelo `team.id` de `ap.statistics[0]`. A API-Football retorna `statistics`
// como array — um jogador transferido no meio da temporada tem múltiplas
// entradas (uma por clube). Pegar `[0]` atribuía ao clube ANTERIOR; o último
// entry é o clube mais recente (atual).
//
// Apenas 2ª divisão usa a API-Football (PL/La Liga/etc usam football-data.org),
// mas é um bug real de "jogador no clube errado" dentro de uma mesma liga.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchApiFootballLeague } from '../apiFootball';

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

describe('REGRESSÃO H2 — apiFootball usa o clube atual (último statistics)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_FOOTBALL_PROXY_URL', 'https://proxy.example.dev');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('jogador transferido aparece no clube atual (Team B), não no anterior (Team A)', async () => {
    // Meredith jogou o 1º semestre no Team A (id=1) e se transferiu pro Team B
    // (id=2) no 2º semestre. statistics[0] é o clube anterior; o último é o atual.
    const teamsPayload = [
      { team: { id: 1, name: 'Team A', code: 'TMA', logo: '' }, venue: { name: '', city: '' } },
      { team: { id: 2, name: 'Team B', code: 'TMB', logo: '' }, venue: { name: '', city: '' } },
    ];
    const playersPayload = [
      {
        player: { id: 10, name: 'Meredith', age: 24, nationality: 'X' },
        statistics: [
          { team: { id: 1, name: 'Team A' }, games: { position: 'Midfielder', number: 8 } }, // clube anterior
          { team: { id: 2, name: 'Team B' }, games: { position: 'Midfielder', number: 8 } }, // clube atual
        ],
      },
    ];

    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => {
        if (String(url).includes('/players?')) {
          return { paging: { current: 1, total: 1 }, response: playersPayload };
        }
        return { paging: { current: 1, total: 1 }, response: teamsPayload };
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const teams = await fetchApiFootballLeague('ligue2');

    const teamA = teams.find(t => t.name === 'Team A');
    const teamB = teams.find(t => t.name === 'Team B');

    expect(teamB, 'Team B (clube atual) deve aparecer no resultado').toBeDefined();
    const meredithInB = teamB!.squad.find(p => p.name === 'Meredith');
    expect(meredithInB, 'Meredith deve estar no Team B (clube atual)').toBeDefined();

    const meredithInA = teamA?.squad.find(p => p.name === 'Meredith');
    expect(meredithInA, 'Meredith NÃO deve estar no Team A (clube anterior)').toBeUndefined();
  });
});
