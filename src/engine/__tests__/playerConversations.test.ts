import { describe, it, expect } from 'vitest';
import {
  maybeGenerateConversation,
  respondToConversation,
  CONVERSATION_RESPONSES,
} from '../playerConversations';
import {
  getPlayerConversations, getTransferList, getContractSeasonsLeft,
  type CareerState, type PlayerConversation,
} from '../career';
import { createCareerSeason } from '../career';
import type { Player, Team } from '../types';
import type { LeagueDefinition } from '@/data/leagues/types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, ovr: number): Player {
  const attr = (v: number) => Math.max(1, Math.min(99, v));
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0, age: 25,
    attributes: {
      speed: attr(ovr), stamina: attr(ovr), passing: attr(ovr), finishing: attr(ovr),
      tackling: attr(ovr), dribbling: attr(ovr), vision: attr(ovr), positioning: attr(ovr),
    },
  };
}

function makeTeam(id: string, ovr: number, extraSquad: Player[] = []): Team {
  const squad = [
    makePlayer(`${id}-gk1`, 'GK', 1, ovr), makePlayer(`${id}-gk2`, 'GK', 21, ovr),
    makePlayer(`${id}-def1`, 'DEF', 2, ovr), makePlayer(`${id}-def2`, 'DEF', 3, ovr),
    makePlayer(`${id}-def3`, 'DEF', 4, ovr), makePlayer(`${id}-def4`, 'DEF', 5, ovr),
    makePlayer(`${id}-mid1`, 'MID', 6, ovr), makePlayer(`${id}-mid2`, 'MID', 7, ovr),
    makePlayer(`${id}-mid3`, 'MID', 8, ovr), makePlayer(`${id}-mid4`, 'MID', 23, ovr),
    makePlayer(`${id}-fwd1`, 'FWD', 9, ovr), makePlayer(`${id}-fwd2`, 'FWD', 10, ovr),
    makePlayer(`${id}-fwd3`, 'FWD', 11, ovr), makePlayer(`${id}-fwd4`, 'FWD', 25, ovr),
    ...extraSquad,
  ];
  return {
    id, name: `T-${id}`, abbreviation: id.toUpperCase(), color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeLeagueTeams(leagueId: string, count: number, ovr: number): Team[] {
  return Array.from({ length: count }, (_, i) => makeTeam(`${leagueId}-t${i}`, ovr));
}

function makeLeagueDef(id: string, teams: Team[]): LeagueDefinition {
  return {
    id, name: `League-${id}`, country: 'X', flag: '', color: '#000', logo: '',
    totalRounds: (teams.length - 1) * 2, teams, cupName: `Cup-${id}`, cupLogo: '',
    europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cpuProfile: { pressingMod: 1, defensiveLineMod: 1, tempoMod: 1, passingFocusMod: 1 },
    relegationSpots: 3,
  };
}

function makeCareerState(overrides: Partial<CareerState> = {}): CareerState {
  const userTeam = makeTeam('user', 70);
  const teams = [userTeam, ...makeLeagueTeams('pl', 19, 70)];
  const leagueDef = makeLeagueDef('pl', teams);
  const { league, cup } = createCareerSeason(userTeam, teams, leagueDef, seededRng(3));
  return {
    version: 1,
    leagueId: 'pl',
    manager: { name: 'Manager', reputation: 30 },
    currentSeasonYear: 1,
    season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: 45_000_000, userGoalScorers: {} },
    rosters: { pl: teams },
    history: [],
    finances: { budget: 30_000_000, wageBill: 1_000_000, weeklyIncome: 400_000 },
    inbox: [],
    ...overrides,
  };
}

function benchHighOvrPlayer(): Player {
  // OVR 88 num elenco de 70 — muito acima do XI → sinal de 'bench'.
  return makePlayer('user-star', 'FWD', 99, 88);
}

describe('maybeGenerateConversation', () => {
  it('gera conversa de "form" após derrota pesada (margem ≥2)', () => {
    const state = makeCareerState();
    const conv = maybeGenerateConversation(state, {
      seasonYear: 1, round: 3,
      lastResult: { userScore: 0, oppScore: 3, opponentId: 'pl-t0' },
    }, seededRng(7));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('form');
    expect(conv!.round).toBe(3);
    expect(conv!.seasonYear).toBe(1);
    expect(conv!.responded).toBe(false);
    expect(conv!.playerId).toBeTruthy();
  });

  it('gera conversa de "form" após dérbi perdido mesmo sem margem grande', () => {
    // user = arsenal (rival registrado com man-utd) — getDerbyName dispara.
    const userArsenal = makeTeam('arsenal', 70);
    const teams = [userArsenal, ...makeLeagueTeams('pl', 19, 70)];
    const leagueDef = makeLeagueDef('pl', teams);
    const { league, cup } = createCareerSeason(userArsenal, teams, leagueDef, seededRng(3));
    const state: CareerState = {
      version: 1,
      leagueId: 'pl',
      manager: { name: 'Manager', reputation: 30 },
      currentSeasonYear: 1,
      season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: 45_000_000, userGoalScorers: {} },
      rosters: { pl: teams },
      history: [],
      finances: { budget: 30_000_000, wageBill: 1_000_000, weeklyIncome: 400_000 },
      inbox: [],
    };
    const conv = maybeGenerateConversation(state, {
      seasonYear: 1, round: 4,
      // margem -1 (dérbi) — é dérbi (Arsenal × United), então deve gerar 'form'.
      lastResult: { userScore: 1, oppScore: 2, opponentId: 'man-utd' },
    }, seededRng(5));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('form');
  });

  it('gera conversa de "praise" após vitória por ≥2', () => {
    const state = makeCareerState();
    const conv = maybeGenerateConversation(state, {
      seasonYear: 1, round: 5,
      lastResult: { userScore: 3, oppScore: 0, opponentId: 'pl-t0' },
    }, seededRng(9));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('praise');
  });

  it('gera conversa de "bench" com titular alto-OVR no banco', () => {
    const star = benchHighOvrPlayer();
    const state = makeCareerState({
      rosters: { pl: [{ ...makeTeam('user', 70), squad: [...makeTeam('user', 70).squad, star] }] },
    });
    const conv = maybeGenerateConversation(state, { seasonYear: 1, round: 2 }, seededRng(2));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('bench');
    expect(conv!.playerId).toBe(star.id);
  });

  it('gera conversa de "transfer-listed" para jogador na lista de venda', () => {
    const state = makeCareerState({ transferListPlayerIds: ['user-fwd1'] });
    const conv = maybeGenerateConversation(state, { seasonYear: 1, round: 2 }, seededRng(2));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('transfer-listed');
    expect(conv!.playerId).toBe('user-fwd1');
  });

  it('gera conversa de "contract" para contrato ≤1 temporada', () => {
    const expiring = { ...makePlayer('user-mid1', 'MID', 8, 70), contractSeasonsLeft: 1 };
    const state = makeCareerState({
      rosters: { pl: [{ ...makeTeam('user', 70), squad: makeTeam('user', 70).squad.map(p => p.id === 'user-mid1' ? expiring : p) }] },
    });
    const conv = maybeGenerateConversation(state, { seasonYear: 1, round: 2 }, seededRng(2));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('contract');
    expect(conv!.playerId).toBe('user-mid1');
  });

  it('não gera se já existe conversa não-respondida na mesma rodada (≤1/rodada)', () => {
    const existing: PlayerConversation = {
      id: 'c1', playerId: 'user-fwd1', playerName: 'X', topic: 'bench',
      message: 'm', seasonYear: 1, round: 2, responded: false,
    };
    const state = makeCareerState({ playerConversations: [existing] });
    const conv = maybeGenerateConversation(state, { seasonYear: 1, round: 2 }, seededRng(2));
    expect(conv).toBeNull();
  });

  it('pode gerar na rodada seguinte mesmo com conversa respondida na anterior', () => {
    const done: PlayerConversation = {
      id: 'c1', playerId: 'user-fwd1', playerName: 'X', topic: 'bench',
      message: 'm', seasonYear: 1, round: 1, responded: true,
    };
    const star = benchHighOvrPlayer();
    const state = makeCareerState({
      playerConversations: [done],
      rosters: { pl: [{ ...makeTeam('user', 70), squad: [...makeTeam('user', 70).squad, star] }] },
    });
    const conv = maybeGenerateConversation(state, { seasonYear: 1, round: 2 }, seededRng(2));
    expect(conv).not.toBeNull();
    expect(conv!.topic).toBe('bench');
  });

  it('sem sinais estruturais e sem resultado, pode retornar null', () => {
    const state = makeCareerState();
    // rng alta (>= 0.45) e sem resultado → sem sinal estrutural em elenco uniforme.
    const conv = maybeGenerateConversation(state, { seasonYear: 1, round: 6 }, () => 0.9);
    expect(conv).toBeNull();
  });

  it('save sem o campo playerConversations não quebra (getter backfill)', () => {
    const state = makeCareerState({ playerConversations: undefined });
    expect(getPlayerConversations(state)).toEqual([]);
    expect(getTransferList(state)).toEqual([]);
    expect(getContractSeasonsLeft(makePlayer('p', 'MID', 1, 70))).toBe(2);
  });
});

describe('respondToConversation', () => {
  const baseConv = (topic: PlayerConversation['topic']): PlayerConversation => ({
    id: 'c1', playerId: 'p', playerName: 'Jogador', topic,
    message: 'm', seasonYear: 1, round: 1, responded: false,
  });

  it('todo tópico oferece 2-3 respostas com apoiar +2, honesto 0, duro -2', () => {
    for (const topic of Object.keys(CONVERSATION_RESPONSES) as PlayerConversation['topic'][]) {
      const options = CONVERSATION_RESPONSES[topic];
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(options.length).toBeLessThanOrEqual(3);
      expect(options.map(o => o.moraleDelta).sort()).toEqual([-2, 0, 2]);
    }
  });

  it('retorna a resposta certa por índice', () => {
    const conv = baseConv('bench');
    expect(respondToConversation(conv, 0)!.moraleDelta).toBe(2);
    expect(respondToConversation(conv, 1)!.moraleDelta).toBe(0);
    expect(respondToConversation(conv, 2)!.moraleDelta).toBe(-2);
  });

  it('índice inválido retorna null', () => {
    expect(respondToConversation(baseConv('form'), 7)).toBeNull();
    expect(respondToConversation(baseConv('contract'), -1)).toBeNull();
  });
});
