import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncLeagueRoster, clearRosterCache } from '../rosterSync';
import type { LeagueDefinition } from '../../data/leagues/types';
import type { Team } from '../../engine/types';

function makePlayer(id: string, name: string, position: Team['squad'][number]['position'], number: number, ovr = 75): Team['squad'][number] {
  return {
    id, name, number, position, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr },
  };
}

function makeTeam(id: string, name: string, abbreviation: string): Team {
  return {
    id, name, abbreviation, color: '#111', secondaryColor: '#222', logoUrl: '',
    squad: [
      makePlayer(`${id}-gk1`, 'Old Keeper', 'GK', 1),
      makePlayer(`${id}-def1`, 'Old Defender', 'DEF', 2),
      makePlayer(`${id}-mid1`, 'Old Midfielder', 'MID', 8),
      makePlayer(`${id}-fwd1`, 'Departed Striker', 'FWD', 9),
    ],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeLeague(): LeagueDefinition {
  return {
    id: 'pl', name: 'Premier League', country: 'Inglaterra', flag: '', color: '#000', logo: '',
    totalRounds: 38, cupName: 'FA Cup', cupLogo: '',
    europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cpuProfile: { pressingMod: 1, defensiveLineMod: 1, tempoMod: 1, passingFocusMod: 1 },
    relegationSpots: 3,
    teams: [makeTeam('t1', 'Test United', 'TST')],
  };
}

// O ambiente de teste roda em Node puro (sem --localstorage-file), que não expõe
// `localStorage` global — o browser real sempre tem. Um stub em memória é suficiente
// pra testar a lógica de cache sem precisar de jsdom só pra isso.
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

describe('syncLeagueRoster', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
    vi.unstubAllEnvs();
    // Baseline explícito: testes não podem depender de haver (ou não) um .env real com
    // chave/proxy configurados na máquina de quem roda `npm test`.
    vi.stubEnv('VITE_FOOTBALL_API_KEY', '');
    vi.stubEnv('VITE_FOOTBALL_PROXY_URL', '');
    clearRosterCache();
  });
  afterEach(() => {
    clearRosterCache();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem chave de API configurada, retorna a liga estática inalterada', async () => {
    const league = makeLeague();
    const result = await syncLeagueRoster(league);
    expect(result.source).toBe('static');
    expect(result.league).toBe(league);
    expect(result.error).toBeTruthy();
  });

  it('com proxy configurado, chama o proxy em vez da API direta (sem X-Auth-Token)', async () => {
    vi.stubEnv('VITE_FOOTBALL_PROXY_URL', 'https://footplan-proxy.example.workers.dev');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 0, teams: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const league = makeLeague();
    const result = await syncLeagueRoster(league);

    expect(result.source).toBe('live');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://footplan-proxy.example.workers.dev/api/football/competitions/PL/teams');
    expect(init).toBeUndefined(); // sem headers de auth — o proxy cuida disso
  });

  it('com chave configurada e resposta válida, mescla o elenco corretamente', async () => {
    vi.stubEnv('VITE_FOOTBALL_API_KEY', 'test-key-123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        teams: [{
          id: 999,
          name: 'Test United',
          shortName: 'Test Utd',
          tla: 'TST',
          crest: '',
          squad: [
            { id: 1, name: 'Old Keeper', position: 'Goalkeeper', dateOfBirth: null, nationality: null, shirtNumber: 1 },
            { id: 2, name: 'Old Defender', position: 'Defence', dateOfBirth: null, nationality: null, shirtNumber: 4 },
            { id: 3, name: 'Old Midfielder', position: 'Midfield', dateOfBirth: null, nationality: null, shirtNumber: 8 },
            { id: 4, name: 'New Signing', position: 'Offence', dateOfBirth: null, nationality: null, shirtNumber: 27 },
            // "Departed Striker" propositalmente ausente — simula saída do elenco
          ],
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const league = makeLeague();
    const result = await syncLeagueRoster(league);

    expect(result.source).toBe('live');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/competitions/PL/teams');
    expect((init.headers as Record<string, string>)['X-Auth-Token']).toBe('test-key-123');

    const mergedTeam = result.league.teams[0];
    const names = mergedTeam.squad.map(p => p.name);
    expect(names).toContain('Old Keeper');
    expect(names).toContain('Old Defender');
    expect(names).toContain('New Signing');
    expect(names).not.toContain('Departed Striker'); // saiu do elenco ao vivo — não aparece mais

    // Jogador já conhecido mantém os atributos calibrados originais (não foi regenerado)
    const keeper = mergedTeam.squad.find(p => p.name === 'Old Keeper')!;
    expect(keeper.attributes.speed).toBe(75);

    // Jogador novo ganha atributos sintéticos válidos (1-99), não os defaults zerados
    const newSigning = mergedTeam.squad.find(p => p.name === 'New Signing')!;
    expect(newSigning.position).toBe('FWD');
    expect(newSigning.attributes.speed).toBeGreaterThan(0);
    expect(newSigning.attributes.speed).toBeLessThanOrEqual(99);

    const stats = result.stats[0];
    expect(stats.matched).toBe(3);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
  });

  it('usa o cache numa segunda chamada em vez de bater na API de novo', async () => {
    vi.stubEnv('VITE_FOOTBALL_API_KEY', 'test-key-123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        teams: [{ id: 999, name: 'Test United', shortName: 'Test Utd', tla: 'TST', crest: '', squad: [
          { id: 1, name: 'Old Keeper', position: 'Goalkeeper', dateOfBirth: null, nationality: null, shirtNumber: 1 },
        ] }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const league = makeLeague();
    await syncLeagueRoster(league);
    const second = await syncLeagueRoster(league);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.source).toBe('cache');
  });

  it('em erro de rede, cai de volta pra liga estática sem quebrar', async () => {
    vi.stubEnv('VITE_FOOTBALL_API_KEY', 'test-key-123');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const league = makeLeague();
    const result = await syncLeagueRoster(league);

    expect(result.source).toBe('error');
    expect(result.league).toBe(league);
    expect(result.error).toContain('network down');
  });

  it('em resposta 429 (rate limit), cai de volta pra liga estática com mensagem clara', async () => {
    vi.stubEnv('VITE_FOOTBALL_API_KEY', 'test-key-123');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const league = makeLeague();
    const result = await syncLeagueRoster(league);

    expect(result.source).toBe('error');
    expect(result.error).toMatch(/limite/i);
  });

  it('não confunde "Barcelona" com "RCD Espanyol de Barcelona" nem "Mallorca" com "Málaga CF" (regressão)', async () => {
    vi.stubEnv('VITE_FOOTBALL_API_KEY', 'test-key-123');
    const league: LeagueDefinition = {
      ...makeLeague(),
      teams: [
        makeTeam('barcelona', 'Barcelona', 'FCB'),
        makeTeam('espanyol', 'Espanyol', 'ESP'),
        makeTeam('mallorca', 'Mallorca', 'MAL'),
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 3,
        teams: [
          // "Barcelona" (cidade) aparece no nome completo do Espanyol — falso positivo
          // de substring já confirmado contra dados reais da API antes do fix.
          { id: 1, name: 'RCD Espanyol de Barcelona', shortName: 'Espanyol', tla: 'ESP', crest: '', squad: [] },
          { id: 2, name: 'FC Barcelona', shortName: 'Barça', tla: 'FCB', crest: '', squad: [] },
          // "Málaga" tem sigla TLA "MAL" igual à abreviação estática do Mallorca — colisão
          // de sigla também já confirmada contra dados reais.
          { id: 3, name: 'Málaga CF', shortName: 'Málaga', tla: 'MAL', crest: '', squad: [] },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await syncLeagueRoster(league);
    const teamNames = new Set(result.stats.map(s => s.teamName));

    // Barcelona e Espanyol casaram cada um com o time remoto certo (mescla rodou pros dois,
    // então ambos aparecem em stats) — não deve haver colisão nem troca dos dois.
    expect(teamNames.has('Barcelona')).toBe(true);
    expect(teamNames.has('Espanyol')).toBe(true);

    // Mallorca não tem correspondência real (Málaga é um clube diferente) — deve permanecer
    // com o elenco estático original, sem entrar em stats (nenhuma mescla ocorreu).
    expect(teamNames.has('Mallorca')).toBe(false);
    const mallorcaTeam = result.league.teams.find(t => t.id === 'mallorca')!;
    expect(mallorcaTeam.squad.map(p => p.name)).toContain('Old Keeper');
  });
});
