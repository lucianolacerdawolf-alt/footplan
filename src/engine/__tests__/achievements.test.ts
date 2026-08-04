import { describe, it, expect } from 'vitest';
import { checkAchievements, ACHIEVEMENTS, type AchievementCheckContext } from '../achievements';
import type { MatchResult, MatchEvent, Team, Player } from '../types';
import type { LeagueState, LeagueFixture, BracketState } from '../tournament';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return {
    id, name: `Player ${id}`, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr },
  };
}

function makeTeam(id: string, name: string): Team {
  const squad: Player[] = [
    makePlayer(`${id}-gk1`, 'GK', 1),
    makePlayer(`${id}-gk2`, 'GK', 21),
    makePlayer(`${id}-d1`, 'DEF', 2), makePlayer(`${id}-d2`, 'DEF', 3),
    makePlayer(`${id}-d3`, 'DEF', 4), makePlayer(`${id}-d4`, 'DEF', 5),
    makePlayer(`${id}-d5`, 'DEF', 22),
    makePlayer(`${id}-m1`, 'MID', 6), makePlayer(`${id}-m2`, 'MID', 7), makePlayer(`${id}-m3`, 'MID', 8),
    makePlayer(`${id}-m4`, 'MID', 23), makePlayer(`${id}-m5`, 'MID', 24),
    makePlayer(`${id}-f1`, 'FWD', 9), makePlayer(`${id}-f2`, 'FWD', 10), makePlayer(`${id}-f3`, 'FWD', 11),
    makePlayer(`${id}-f4`, 'FWD', 25),
  ];
  return {
    id, name, abbreviation: name.slice(0, 3).toUpperCase(), color: '#3b82f6', secondaryColor: '#ef4444',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeResult(home: Team, away: Team, homeScore: number, awayScore: number, events: MatchEvent[] = []): MatchResult {
  return {
    homeTeam: home, awayTeam: away,
    homeScore, awayScore,
    events,
    homePossession: 50, awayPossession: 50,
    homeStats: { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
    awayStats: { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
  };
}

function makeCtx(overrides: Partial<AchievementCheckContext> & { result: MatchResult; userTeamId: string }): AchievementCheckContext {
  return {
    matchContext: 'regular',
    totalMatchesPlayed: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('achievements', () => {
  const home = makeTeam('teamA', 'Arsenal');
  const away = makeTeam('teamB', 'Chelsea');

  it('debut: unlocks on first match', () => {
    const result = makeResult(home, away, 2, 1);
    const ctx = makeCtx({ result, userTeamId: home.id, totalMatchesPlayed: 1 });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'debut')).toBeDefined();
  });

  it('debut: does not unlock with 0 matches', () => {
    const result = makeResult(home, away, 2, 1);
    const ctx = makeCtx({ result, userTeamId: home.id, totalMatchesPlayed: 0 });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'debut')).toBeUndefined();
  });

  it('hat_trick: unlocks when user player scores 3+', () => {
    const events: MatchEvent[] = [
      { minute: 10, type: 'goal', description: 'Goal!', teamId: home.id, scorer: 'FWD 1', playerId: `${home.id}-f1` },
      { minute: 30, type: 'goal', description: 'Goal!', teamId: home.id, scorer: 'FWD 1', playerId: `${home.id}-f1` },
      { minute: 60, type: 'goal', description: 'Goal!', teamId: home.id, scorer: 'FWD 1', playerId: `${home.id}-f1` },
    ];
    const result = makeResult(home, away, 3, 0, events);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'hat_trick')).toBeDefined();
  });

  it('hat_trick: does not unlock with only 2 goals from same player', () => {
    const events: MatchEvent[] = [
      { minute: 10, type: 'goal', description: 'Goal!', teamId: home.id, scorer: 'FWD 1', playerId: `${home.id}-f1` },
      { minute: 30, type: 'goal', description: 'Goal!', teamId: home.id, scorer: 'FWD 1', playerId: `${home.id}-f1` },
    ];
    const result = makeResult(home, away, 2, 0, events);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'hat_trick')).toBeUndefined();
  });

  it('clean_sheet: unlocks when user concedes 0', () => {
    const result = makeResult(home, away, 2, 0);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'clean_sheet')).toBeDefined();
  });

  it('clean_sheet: does not unlock when user concedes goals', () => {
    const result = makeResult(home, away, 2, 1);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'clean_sheet')).toBeUndefined();
  });

  it('rout: unlocks when user wins by 5+ goals', () => {
    const result = makeResult(home, away, 5, 0);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'rout')).toBeDefined();
  });

  it('rout: does not unlock with 4-goal margin', () => {
    const result = makeResult(home, away, 4, 0);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'rout')).toBeUndefined();
  });

  it('comeback: unlocks when losing at HT and wins', () => {
    const events: MatchEvent[] = [
      { minute: 45, type: 'halftime', description: '⏸️ Fim do primeiro tempo! Times com vantagem do visitante por 1x0.', teamId: null },
    ];
    const result = { ...makeResult(home, away, 2, 1, events), halftimeHomeScore: 0, halftimeAwayScore: 1 };
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'comeback')).toBeDefined();
  });

  it('comeback: does not unlock when winning at HT', () => {
    const events: MatchEvent[] = [
      { minute: 45, type: 'halftime', description: '⏸️ Fim do primeiro tempo! Times com vantagem do mandante por 1x0.', teamId: null },
    ];
    const result = { ...makeResult(home, away, 2, 0, events), halftimeHomeScore: 1, halftimeAwayScore: 0 };
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'comeback')).toBeUndefined();
  });

  it('red_card: unlocks when user gets a red card', () => {
    const events: MatchEvent[] = [
      { minute: 60, type: 'redCard', description: 'Red!', teamId: home.id, playerId: `${home.id}-d1` },
    ];
    const result = makeResult(home, away, 1, 1, events);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'red_card')).toBeDefined();
  });

  it('fair_play: unlocks with 0 cards', () => {
    const result = makeResult(home, away, 1, 0);
    const ctx = makeCtx({ result, userTeamId: home.id });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'fair_play')).toBeDefined();
  });

  it('marathon: unlocks at 20+ total matches', () => {
    const result = makeResult(home, away, 1, 0);
    const ctx = makeCtx({ result, userTeamId: home.id, totalMatchesPlayed: 20 });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'marathon')).toBeDefined();
  });

  it('marathon: does not unlock at 19 matches', () => {
    const result = makeResult(home, away, 1, 0);
    const ctx = makeCtx({ result, userTeamId: home.id, totalMatchesPlayed: 19 });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'marathon')).toBeUndefined();
  });

  // ── League-specific ─────────────────────────────────────────────────────
  function makeLeagueFixture(id: string, homeId: string, awayId: string, homeScore: number, awayScore: number): LeagueFixture {
    return { id, roundIndex: 0, homeTeamId: homeId, awayTeamId: awayId, homeScore, awayScore, played: true };
  }

  it('league_champion: unlocks when phase=done and user is top', () => {
    const result = makeResult(home, away, 2, 1);
    const fixtures: LeagueFixture[][] = [[
      makeLeagueFixture('f1', home.id, away.id, 1, 0),
    ]];
    const leagueState: LeagueState = {
      teams: [home, away],
      userTeamId: home.id,
      fixtures,
      currentRound: 1,
      phase: 'done',
    };
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'league', leagueState });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'league_champion')).toBeDefined();
  });

  it('league_champion: does not unlock when phase is not done', () => {
    const result = makeResult(home, away, 2, 1);
    const fixtures: LeagueFixture[][] = [[
      makeLeagueFixture('f1', home.id, away.id, 1, 0),
    ]];
    const leagueState: LeagueState = {
      teams: [home, away],
      userTeamId: home.id,
      fixtures,
      currentRound: 0,
      phase: 'playing',
    };
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'league', leagueState });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'league_champion')).toBeUndefined();
  });

  it('streak_5: unlocks with 5 consecutive league wins', () => {
    const result = makeResult(home, away, 1, 0);
    const fixtures: LeagueFixture[][] = [
      [makeLeagueFixture('f1', home.id, away.id, 1, 0)],
      [makeLeagueFixture('f2', home.id, 'teamC', 1, 0)],
      [makeLeagueFixture('f3', home.id, 'teamD', 1, 0)],
      [makeLeagueFixture('f4', home.id, 'teamE', 1, 0)],
      [makeLeagueFixture('f5', home.id, 'teamF', 1, 0)],
    ];
    const leagueState: LeagueState = {
      teams: [home, away],
      userTeamId: home.id,
      fixtures,
      currentRound: 4,
      phase: 'playing',
    };
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'league', leagueState });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'streak_5')).toBeDefined();
  });

  // ── Cup-specific ────────────────────────────────────────────────────────
  it('cup_king: unlocks when bracket stage is champion and user is champion', () => {
    const result = makeResult(home, away, 2, 1);
    const bracketState: BracketState = {
      stage: 'champion',
      championId: home.id,
      userTeamId: home.id,
      teams: [home, away],
      roundOf16: [],
      quarterFinals: [],
      semiFinals: [],
      final: { id: 'f', homeTeamId: home.id, awayTeamId: away.id, homeScore: 2, awayScore: 1, played: true, winnerId: home.id },
    };
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState });
    const unlocked = checkAchievements(ctx);
    expect(unlocked.find(a => a.id === 'cup_king')).toBeDefined();
  });

  // ── No duplicate unlocks ────────────────────────────────────────────────
  it('returns empty array when all achievements already unlocked in data', () => {
    // Build a context where no achievement should newly unlock (all conditions false or irrelevant).
    // 0-0 draw, 0 matches, no debut/hat-trick/clean-sheet/rout/comeback, but a card to disable fair_play.
    const eventsWithCard: MatchEvent[] = [
      { minute: 10, type: 'yellowCard', description: 'Yellow', teamId: home.id, playerId: `${home.id}-m1` },
    ];
    const result2 = makeResult(home, away, 0, 0, eventsWithCard);
    const ctx2 = makeCtx({ result: result2, userTeamId: home.id, totalMatchesPlayed: 0 });
    const unlocked = checkAchievements(ctx2);
    // Should only unlock achievements that match (none with 0 matches, 0-0, and a yellow card)
    expect(unlocked.length).toBe(0);
  });

  it('all 20 achievements are defined', () => {
    expect(ACHIEVEMENTS.length).toBe(20);
  });
});

describe('conquistas continentais', () => {
  const home = makeTeam('arsenal', 'Arsenal');
  const away = makeTeam('madrid', 'Real Madrid');

  function championBracket(userTeamId: string): BracketState {
    return {
      teams: [home, away], userTeamId,
      roundOf16: [], quarterFinals: [], semiFinals: [],
      final: { id: 'final', homeTeamId: userTeamId, awayTeamId: away.id, played: true, homeScore: 2, awayScore: 1, winnerId: userTeamId },
      stage: 'champion', championId: userTeamId, cupName: 'Liga dos Campeões', leagueId: 'pl',
    };
  }

  it('continental_champion destrava vencendo a UCL; europa_king e cup_king não', () => {
    const result = makeResult(home, away, 2, 1);
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState: championBracket(home.id), continentalCupId: 'ucl' });
    const ids = checkAchievements(ctx).map(a => a.id);
    expect(ids).toContain('continental_champion');
    expect(ids).toContain('continental_participant');
    expect(ids).not.toContain('europa_king');
    expect(ids).not.toContain('cup_king'); // continental não conta como copa doméstica
  });

  it('europa_king / conference_king pela id da copa', () => {
    const result = makeResult(home, away, 1, 0);
    const uel = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState: championBracket(home.id), continentalCupId: 'uel' });
    expect(checkAchievements(uel).map(a => a.id)).toContain('europa_king');
    const uecl = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState: championBracket(home.id), continentalCupId: 'uecl' });
    expect(checkAchievements(uecl).map(a => a.id)).toContain('conference_king');
  });

  it('cup_king (copa doméstica) destrava sem continentalCupId', () => {
    const result = makeResult(home, away, 2, 1);
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState: championBracket(home.id) });
    const ids = checkAchievements(ctx).map(a => a.id);
    expect(ids).toContain('cup_king');
    expect(ids).not.toContain('continental_champion');
  });

  it('continental_participant destrava em qualquer partida continental (sem ser campeão)', () => {
    const result = makeResult(home, away, 0, 0);
    const notChamp: BracketState = { ...championBracket(home.id), stage: 'roundOf16', championId: undefined };
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState: notChamp, continentalCupId: 'ucl' });
    const ids = checkAchievements(ctx).map(a => a.id);
    expect(ids).toContain('continental_participant');
    expect(ids).not.toContain('continental_champion');
  });

  it('treble_winner nunca destrava por-partida (só no fechamento da temporada)', () => {
    const result = makeResult(home, away, 2, 1);
    const ctx = makeCtx({ result, userTeamId: home.id, matchContext: 'bracket', bracketState: championBracket(home.id), continentalCupId: 'ucl' });
    expect(checkAchievements(ctx).map(a => a.id)).not.toContain('treble_winner');
  });
});
