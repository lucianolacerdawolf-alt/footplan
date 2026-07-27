import type { Team, MatchResult } from '@/engine/types';
import type { LeagueFixture, BracketMatch, BracketState } from '@/engine/tournament';
import {
  applyPostMatchInjuries,
  simularBracketMatch,
  advanceBracket,
} from '@/engine/tournament';
import { getStageMatches, updateStageMatch } from '@/engine/bracketHelpers';

export function extractScorers(result: MatchResult): Array<{ playerName: string; playerId?: string; teamId: string; goals: number }> {
  const map = new Map<string, { playerName: string; playerId?: string; teamId: string; goals: number }>();
  for (const e of result.events) {
    if (e.type !== 'goal' || !e.scorer || !e.teamId) continue;
    const key = `${e.scorer}-${e.teamId}`;
    const existing = map.get(key);
    if (existing) { existing.goals++; }
    else { map.set(key, { playerName: e.scorer, playerId: e.playerId, teamId: e.teamId, goals: 1 }); }
  }
  return [...map.values()];
}

export function recordLeagueFixtureResult(
  fixtures: LeagueFixture[][],
  roundIdx: number,
  fixtureIdx: number,
  homeScore: number,
  awayScore: number,
  scorers?: LeagueFixture['scorers'],
): LeagueFixture[][] {
  return fixtures.map((round, ri) =>
    ri === roundIdx
      ? round.map((f, fi) => fi === fixtureIdx ? { ...f, homeScore, awayScore, played: true, scorers } : f)
      : round,
  );
}

export function applyLeagueRoundMoraleAndInjuries(
  newRound: LeagueFixture[],
  teams: Team[],
  userTeamId: string,
): Team[] {
  const moraleMap = new Map<string, number>();
  for (const f of newRound) {
    if (!f.played || f.homeScore == null || f.awayScore == null) continue;
    const hWon = f.homeScore > f.awayScore;
    const draw = f.homeScore === f.awayScore;
    const delta = draw ? 0 : 2;
    const hDelta = hWon ? delta : -delta;
    const aDelta = hWon ? -delta : delta;
    moraleMap.set(f.homeTeamId, (moraleMap.get(f.homeTeamId) ?? 0) + hDelta);
    moraleMap.set(f.awayTeamId, (moraleMap.get(f.awayTeamId) ?? 0) + aDelta);
  }
  return teams.map(t => {
    const delta = moraleMap.get(t.id) ?? 0;
    let team = delta === 0 ? t : { ...t, morale: Math.max(-10, Math.min(10, (t.morale ?? 0) + delta)) };
    if (t.id !== userTeamId) {
      team = applyPostMatchInjuries(team, 0.05).team;
    }
    return team;
  });
}

export function simulateAllCpuBracketMatches(state: BracketState): BracketState {
  const matches = getStageMatches(state);
  let s = { ...state };
  const injuredIds = new Set<string>();
  matches.forEach((match, idx) => {
    const isUser = match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId;
    if (isUser || match.played) return;
    const home = state.teams.find(t => t.id === match.homeTeamId)!;
    const away = state.teams.find(t => t.id === match.awayTeamId)!;
    const sim = simularBracketMatch(home, away);
    s = updateStageMatch(s, idx, { ...match, ...sim });
    injuredIds.add(home.id); injuredIds.add(away.id);
  });
  return advanceBracket({ ...s, teams: s.teams.map(t => injuredIds.has(t.id) ? applyPostMatchInjuries(t, 0.05).team : t) });
}

export function buildBracketMatchFromResult(
  match: BracketMatch,
  result: MatchResult,
  homeTeamId: string,
  awayTeamId: string,
): BracketMatch {
  const winnerId = result.winner?.id
    ?? (result.penaltyResult ? (result.penaltyResult.winner === 'home' ? homeTeamId : awayTeamId)
      : result.homeScore >= result.awayScore ? homeTeamId : awayTeamId);
  return {
    ...match,
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    wentToExtraTime: result.wentToExtraTime,
    extraTimeHomeScore: result.extraTimeHomeScore,
    extraTimeAwayScore: result.extraTimeAwayScore,
    penaltyHomeScore: result.penaltyResult?.homeScore,
    penaltyAwayScore: result.penaltyResult?.awayScore,
    winnerId,
    played: true,
  };
}
