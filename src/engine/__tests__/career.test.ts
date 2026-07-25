import { describe, it, expect } from 'vitest';
import {
  assignInitialAges,
  progressPlayer,
  progressAllLeagues,
  evaluateTradeOffer,
  canProposeTrade,
  computeReputationDelta,
  isValidCareerState,
  deriveCupResult,
  createCareerSeason,
  isTransferWindowOpen,
  type CareerState,
} from '../career';
import type { Player, Team } from '../types';
import type { BracketState, BracketMatch } from '../tournament';
import type { LeagueDefinition } from '@/data/leagues/types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, age?: number): Player {
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0,
    age,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(id: string, players?: Player[]): Team {
  const squad = players ?? [
    makePlayer(`${id}-gk1`, 'GK', 1),
    makePlayer(`${id}-gk2`, 'GK', 21),
    makePlayer(`${id}-def1`, 'DEF', 2), makePlayer(`${id}-def2`, 'DEF', 3),
    makePlayer(`${id}-def3`, 'DEF', 4), makePlayer(`${id}-def4`, 'DEF', 5),
    makePlayer(`${id}-def5`, 'DEF', 22),
    makePlayer(`${id}-mid1`, 'MID', 6), makePlayer(`${id}-mid2`, 'MID', 7), makePlayer(`${id}-mid3`, 'MID', 8),
    makePlayer(`${id}-mid4`, 'MID', 23), makePlayer(`${id}-mid5`, 'MID', 24),
    makePlayer(`${id}-fwd1`, 'FWD', 9), makePlayer(`${id}-fwd2`, 'FWD', 10), makePlayer(`${id}-fwd3`, 'FWD', 11),
    makePlayer(`${id}-fwd4`, 'FWD', 25),
  ];
  return {
    id, name: `T-${id}`, abbreviation: id.toUpperCase(), color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeLeagueTeams(leagueId: string, count: number): Team[] {
  return Array.from({ length: count }, (_, i) => makeTeam(`${leagueId}-t${i}`));
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

function makeBracketMatch(id: string, homeTeamId: string | null, awayTeamId: string | null, played = false, winnerId?: string): BracketMatch {
  return { id, homeTeamId, awayTeamId, played, winnerId };
}

describe('progression (D-01, D-02)', () => {
  it('assignInitialAges gives GK 22-36 and outfield 18-34, idempotent on existing ages', () => {
    const rng = seededRng(1);
    const teams = [makeTeam('pl-a'), makeTeam('laliga-a'), makeTeam('bundesliga-a')];
    const [out] = assignInitialAges(teams, rng);
    for (const p of out.squad) {
      expect(p.age).toBeDefined();
      if (p.position === 'GK') {
        expect(p.age!).toBeGreaterThanOrEqual(22);
        expect(p.age!).toBeLessThanOrEqual(36);
      } else {
        expect(p.age!).toBeGreaterThanOrEqual(18);
        expect(p.age!).toBeLessThanOrEqual(34);
      }
    }

    // idempotent: player with pre-set age is untouched
    const preAged = makeTeam('preaged', [makePlayer('x', 'MID', 6, 99)]);
    const [outPreAged] = assignInitialAges([preAged], rng);
    expect(outPreAged.squad[0].age).toBe(99);
  });

  it('progressPlayer trends young players up and old players down on average', () => {
    const rng = seededRng(42);
    const young = makePlayer('young', 'MID', 6, 22);
    const old = makePlayer('old', 'MID', 6, 35);

    let youngUp = 0;
    let oldDown = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const yResult = progressPlayer(young, rng);
      const oResult = progressPlayer(old, rng);
      if (yResult.attributes.passing >= young.attributes.passing) youngUp++;
      if (oResult.attributes.passing <= old.attributes.passing) oldDown++;
    }
    expect(youngUp / trials).toBeGreaterThan(0.5);
    expect(oldDown / trials).toBeGreaterThan(0.5);
  });

  it('progressAllLeagues returns all keys with new references and same counts, no mutation of source', () => {
    const rng = seededRng(7);
    const rosters: Record<string, Team[]> = {
      pl: makeLeagueTeams('pl', 4),
      laliga: makeLeagueTeams('laliga', 4),
      bundesliga: makeLeagueTeams('bundesliga', 4),
    };
    const originalRefs = {
      pl: rosters.pl,
      laliga: rosters.laliga,
      bundesliga: rosters.bundesliga,
    };
    const result = progressAllLeagues(rosters, rng);
    expect(Object.keys(result).sort()).toEqual(['bundesliga', 'laliga', 'pl']);
    for (const key of Object.keys(rosters)) {
      expect(result[key].length).toBe(rosters[key].length);
      expect(result[key]).not.toBe(originalRefs[key as keyof typeof originalRefs]);
      result[key].forEach((team, i) => {
        expect(team).not.toBe(rosters[key][i]);
      });
    }
  });
});

describe('D-03: season-transition performance', () => {
  it('progresses all 6 leagues rosters in well under 100ms', () => {
    const rng = seededRng(99);
    const leagueIds = ['pl', 'laliga', 'bundesliga', 'seriea', 'ligue1', 'portugal'];
    const rosters: Record<string, Team[]> = {};
    for (const id of leagueIds) {
      rosters[id] = makeLeagueTeams(id, 20);
    }
    const start = performance.now();
    progressAllLeagues(rosters, rng);
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(100);
  });
});

describe('trades (D-05, D-06)', () => {
  it('acceptance rate is materially higher for favorable offer + high reputation', () => {
    const favorable = makePlayer('fav', 'FWD', 9, 24);
    favorable.attributes = { ...favorable.attributes, finishing: 95, speed: 95, dribbling: 95 };
    const requested = makePlayer('req', 'FWD', 9, 24);
    requested.attributes = { ...requested.attributes, finishing: 40, speed: 40, dribbling: 40 };
    const cpuSquad = [requested];

    const rngGood = seededRng(1);
    let acceptedGood = 0;
    for (let i = 0; i < 200; i++) {
      if (evaluateTradeOffer(favorable, requested, cpuSquad, 100, rngGood).accepted) acceptedGood++;
    }

    const rngBad = seededRng(1);
    let acceptedBad = 0;
    for (let i = 0; i < 200; i++) {
      if (evaluateTradeOffer(requested, favorable, cpuSquad, 0, rngBad).accepted) acceptedBad++;
    }

    expect(acceptedGood).toBeGreaterThan(acceptedBad);
  });

  it('canProposeTrade caps at 3 trades per season', () => {
    expect(canProposeTrade(0)).toBe(true);
    expect(canProposeTrade(1)).toBe(true);
    expect(canProposeTrade(2)).toBe(true);
    expect(canProposeTrade(3)).toBe(false);
    expect(canProposeTrade(4)).toBe(false);
  });

  it('regressão: chamar sem cashOffered (assinatura antiga de 5 args) é idêntico a passar cashOffered=0 explicitamente', () => {
    const offered = makePlayer('o', 'MID', 6, 25);
    const requested = makePlayer('r', 'MID', 6, 25);
    const cpuSquad = [requested];

    for (const seed of [1, 2, 3, 4, 5]) {
      const withoutCash = evaluateTradeOffer(offered, requested, cpuSquad, 50, seededRng(seed));
      const withZeroCash = evaluateTradeOffer(offered, requested, cpuSquad, 50, seededRng(seed), 0);
      expect(withZeroCash).toEqual(withoutCash);
    }
  });

  it('cashOffered aumenta a chance de aceite mantendo OVR e reputação fixos', () => {
    const offered = makePlayer('o', 'MID', 6, 25);
    const requested = makePlayer('r', 'MID', 6, 25);
    requested.attributes = { ...requested.attributes, passing: 90, vision: 90 }; // dá um marketValue não-trivial pro requested
    const cpuSquad = [requested];

    const rngNoCash = seededRng(7);
    let acceptedNoCash = 0;
    for (let i = 0; i < 300; i++) {
      if (evaluateTradeOffer(offered, requested, cpuSquad, 30, rngNoCash, 0).accepted) acceptedNoCash++;
    }

    const rngWithCash = seededRng(7);
    let acceptedWithCash = 0;
    for (let i = 0; i < 300; i++) {
      if (evaluateTradeOffer(offered, requested, cpuSquad, 30, rngWithCash, 5_000_000).accepted) acceptedWithCash++;
    }

    expect(acceptedWithCash).toBeGreaterThan(acceptedNoCash);
  });
});

describe('isTransferWindowOpen', () => {
  it('tabela de fronteiras: rounds 0-4 e 18-23 abertos (0-indexed), o resto fechado', () => {
    const cases: Array<[number, boolean]> = [
      [0, true], [4, true], [5, false],
      [17, false], [18, true], [23, true], [24, false],
    ];
    for (const [round, expected] of cases) {
      expect(isTransferWindowOpen(round)).toBe(expected);
    }
  });
});

describe('reputation (D-08, D-09)', () => {
  it('computeReputationDelta rewards titles and punishes bottom-third finishes', () => {
    const leagueOnly = computeReputationDelta({ leagueChampion: true, cupChampion: false, leaguePosition: 1, totalTeams: 20 });
    const both = computeReputationDelta({ leagueChampion: true, cupChampion: true, leaguePosition: 1, totalTeams: 20 });
    const bottom = computeReputationDelta({ leagueChampion: false, cupChampion: false, leaguePosition: 19, totalTeams: 20 });

    expect(leagueOnly).toBeGreaterThan(0);
    expect(both).toBeGreaterThan(leagueOnly);
    expect(bottom).toBeLessThan(0);
  });

  it('evaluateTradeOffer acceptance chance increases with managerReputation, offer held fixed', () => {
    const offered = makePlayer('o', 'MID', 6, 25);
    const requested = makePlayer('r', 'MID', 6, 25);
    const cpuSquad = [requested];

    const rngLow = seededRng(5);
    let acceptedLowRep = 0;
    for (let i = 0; i < 300; i++) {
      if (evaluateTradeOffer(offered, requested, cpuSquad, 0, rngLow).accepted) acceptedLowRep++;
    }

    const rngHigh = seededRng(5);
    let acceptedHighRep = 0;
    for (let i = 0; i < 300; i++) {
      if (evaluateTradeOffer(offered, requested, cpuSquad, 100, rngHigh).accepted) acceptedHighRep++;
    }

    expect(acceptedHighRep).toBeGreaterThanOrEqual(acceptedLowRep);
  });
});

describe('isValidCareerState', () => {
  it('returns true for a well-formed CareerState built from createCareerSeason output', () => {
    const rng = seededRng(3);
    const userTeam = makeTeam('pl-user');
    const leagueTeams = [userTeam, ...makeLeagueTeams('pl', 19)];
    const leagueDef = makeLeagueDef('pl', leagueTeams);
    const { league, cup } = createCareerSeason(userTeam, leagueTeams, leagueDef, rng);

    const state: CareerState = {
      version: 1,
      leagueId: 'pl',
      manager: { name: 'Manager', reputation: 0 },
      currentSeasonYear: 1,
      season: { league, cup, tradesUsedThisSeason: 0 },
      rosters: { pl: leagueTeams },
      history: [],
    };
    expect(isValidCareerState(state)).toBe(true);
  });

  it('returns false for malformed shapes', () => {
    expect(isValidCareerState(null)).toBe(false);
    expect(isValidCareerState({})).toBe(false);
    expect(isValidCareerState({ version: 1 })).toBe(false);
    expect(isValidCareerState({
      version: 1,
      leagueId: 'pl',
      manager: { name: 'M', reputation: 0 },
      currentSeasonYear: 1,
      season: { league: {}, cup: {}, tradesUsedThisSeason: 0 },
      rosters: 'not-an-object',
      history: [],
    })).toBe(false);
  });
});

describe('deriveCupResult (all 6 cup-result branches)', () => {
  const userTeamId = 'user-team';
  const otherId = 'other-team';

  function baseBracket(overrides: Partial<BracketState>): BracketState {
    return {
      teams: [makeTeam(userTeamId), makeTeam(otherId)],
      userTeamId,
      roundOf16: [makeBracketMatch('r16-1', userTeamId, otherId)],
      quarterFinals: [makeBracketMatch('qf1', null, null)],
      semiFinals: [makeBracketMatch('sf1', null, null)],
      final: makeBracketMatch('final', null, null),
      stage: 'roundOf16',
      cupName: 'Cup',
      leagueId: 'pl',
      ...overrides,
    };
  }

  it('champion: user is the championId', () => {
    const cup = baseBracket({ stage: 'champion', championId: userTeamId });
    expect(deriveCupResult(cup, userTeamId)).toBe('champion');
  });

  it('runner-up: user lost the final', () => {
    const cup = baseBracket({
      stage: 'champion',
      championId: otherId,
      final: makeBracketMatch('final', userTeamId, otherId, true, otherId),
    });
    expect(deriveCupResult(cup, userTeamId)).toBe('runner-up');
  });

  it('semifinal: user present in a semifinal, absent from final', () => {
    const cup = baseBracket({
      stage: 'champion',
      championId: otherId,
      semiFinals: [makeBracketMatch('sf1', userTeamId, otherId, true, otherId), makeBracketMatch('sf2', 'a', 'b', true, 'a')],
      final: makeBracketMatch('final', otherId, 'a', true, otherId),
    });
    expect(deriveCupResult(cup, userTeamId)).toBe('semifinal');
  });

  it('quarterfinal: user present in a quarterfinal, absent from semis/final', () => {
    const cup = baseBracket({
      stage: 'champion',
      championId: otherId,
      quarterFinals: [makeBracketMatch('qf1', userTeamId, otherId, true, otherId)],
      semiFinals: [makeBracketMatch('sf1', 'a', 'b', true, 'a'), makeBracketMatch('sf2', 'c', 'd', true, 'c')],
      final: makeBracketMatch('final', 'a', 'c', true, 'a'),
    });
    expect(deriveCupResult(cup, userTeamId)).toBe('quarterfinal');
  });

  it('roundOf16: user only played and lost in round of 16', () => {
    const cup = baseBracket({
      stage: 'champion',
      championId: otherId,
      roundOf16: [makeBracketMatch('r16-1', userTeamId, otherId, true, otherId)],
      quarterFinals: [makeBracketMatch('qf1', 'a', 'b', true, 'a')],
      semiFinals: [makeBracketMatch('sf1', 'a', 'c', true, 'a')],
      final: makeBracketMatch('final', 'a', 'd', true, 'a'),
    });
    expect(deriveCupResult(cup, userTeamId)).toBe('roundOf16');
  });

  it('not-played: cup.stage is not champion', () => {
    const cup = baseBracket({ stage: 'roundOf16' });
    expect(deriveCupResult(cup, userTeamId)).toBe('not-played');
  });
});
