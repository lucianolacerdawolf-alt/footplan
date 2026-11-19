import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  serializeMatchState, deserializeMatchState,
  saveLiveMatch, loadLiveMatch, clearLiveMatch, LIVE_MATCH_KEY,
  saveLiveMatchMeta, loadLiveMatchMeta, clearLiveMatchMeta, LIVE_MATCH_META_KEY,
  type LiveMatchSnapshot,
} from '../liveMatchPersistence';
import { createMatchState } from '@/engine/matchEngine';
import { makeTeam } from '@/components/__tests__/testFixtures';

// Retomar a partida depois de recarregar a página (F5): se isto quebrar, o jogador
// perde a partida em andamento — ou, pior, o resultado cai no jogo errado do save.

const home = makeTeam('h', 'Casa', 'CAS');
const away = makeTeam('a', 'Fora', 'FOR');

function snapshot(over: Partial<LiveMatchSnapshot> = {}): LiveMatchSnapshot {
  const empty = { firstHalfPause: 0, halftime: 0, secondHalfPause: 0 };
  return {
    version: 3, savedAt: 1, matchContext: 'league', isKnockout: false,
    initialHome: home, initialAway: away, home, away,
    subsHome: 0, subsAway: 0, subWindowsHome: empty, subWindowsAway: empty,
    injuredIds: [], speed: 1, phase: 'simulating', isFirstHalf: true, nextCycle: 10,
    clockSeconds: 600, homeScore: 1, awayScore: 0, replayEvents: [], fatigueMap: {},
    expelledIds: [], pausesRemaining: 2, engineState: null,
    matchRoundIdx: 3, matchFixtureIdx: 4, isCareer: true,
    ...over,
  };
}

// Mesma convenção de storage.test.ts: storage em memória (o localStorage do Node é instável).
function memoryStorage(): Storage {
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

beforeEach(() => { vi.stubGlobal('localStorage', memoryStorage()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('estado do motor (Map/Set ↔ JSON)', () => {
  it('ida e volta preserva fadiga, cartões, lesionados e placar', () => {
    const state = createMatchState(home, away);
    state.homeScore = 2;
    state.awayScore = 1;
    state.cards.set('h-def', 'yellow');
    state.injured.add('a-mid');
    state.fatigueHome.set('h-fwd', 42);
    state.events.push({ minute: 30, type: 'goal', description: 'Gol', teamId: 'h' } as never);

    // Passa por JSON como no localStorage de verdade.
    const back = deserializeMatchState(JSON.parse(JSON.stringify(serializeMatchState(state))));

    expect(back.homeScore).toBe(2);
    expect(back.awayScore).toBe(1);
    expect(back.cards).toBeInstanceOf(Map);
    expect(back.cards.get('h-def')).toBe('yellow');
    expect(back.injured).toBeInstanceOf(Set);
    expect(back.injured.has('a-mid')).toBe(true);
    expect(back.fatigueHome.get('h-fwd')).toBe(42);
    expect(back.events).toHaveLength(1);
    expect(back.gkFormHome).toBe(state.gkFormHome);
    expect(back.isDerby).toBe(state.isDerby);
  });
});

describe('snapshot da partida ao vivo', () => {
  it('salva e carrega com o contexto do jogo (rodada/jogo da carreira)', () => {
    saveLiveMatch(snapshot());
    const loaded = loadLiveMatch();
    expect(loaded).not.toBeNull();
    expect(loaded!.matchRoundIdx).toBe(3);
    expect(loaded!.matchFixtureIdx).toBe(4);
    expect(loaded!.isCareer).toBe(true);
    clearLiveMatch();
    expect(loadLiveMatch()).toBeNull();
  });

  it('partida já encerrada não é retomada', () => {
    saveLiveMatch(snapshot({ phase: 'done' }));
    expect(loadLiveMatch()).toBeNull();
  });

  it('aceita a versão 2 (saves antigos) e recusa versões desconhecidas', () => {
    localStorage.setItem(LIVE_MATCH_KEY, JSON.stringify({ ...snapshot(), version: 2 }));
    expect(loadLiveMatch()).not.toBeNull();
    localStorage.setItem(LIVE_MATCH_KEY, JSON.stringify({ ...snapshot(), version: 1 }));
    expect(loadLiveMatch()).toBeNull();
  });

  it('JSON corrompido não derruba o app', () => {
    localStorage.setItem(LIVE_MATCH_KEY, '{nao é json');
    expect(loadLiveMatch()).toBeNull();
  });
});

describe('meta da partida (qual jogo do save recebe o resultado)', () => {
  it('guarda copa x continental pra o resultado cair no campo certo', () => {
    saveLiveMatchMeta({ matchContext: 'bracket', bracketStage: 'quarterfinals', bracketIdx: 2, bracketKind: 'continental', isCareer: true });
    expect(loadLiveMatchMeta()).toEqual({ matchContext: 'bracket', bracketStage: 'quarterfinals', bracketIdx: 2, bracketKind: 'continental', isCareer: true });
    clearLiveMatchMeta();
    expect(loadLiveMatchMeta()).toBeNull();
  });

  it('meta corrompida devolve null', () => {
    localStorage.setItem(LIVE_MATCH_META_KEY, '###');
    expect(loadLiveMatchMeta()).toBeNull();
  });
});
