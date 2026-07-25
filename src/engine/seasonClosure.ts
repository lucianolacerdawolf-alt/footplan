import type { LeagueState } from './tournament';
import type { MatchEvent } from './types';
import type { CareerSeasonHistoryEntry } from './career';

/** Conta os gols do time do usuário numa partida, por nome do marcador. */
export function tallyUserGoals(events: MatchEvent[], userTeamId: string): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const e of events) {
    if (e.type !== 'goal' || e.teamId !== userTeamId || !e.scorer) continue;
    tally[e.scorer] = (tally[e.scorer] ?? 0) + 1;
  }
  return tally;
}

/** Soma um tally parcial (de uma partida) no acumulado da temporada (liga + copa). */
export function mergeGoalTally(base: Record<string, number> | undefined, addition: Record<string, number>): Record<string, number> {
  const merged = { ...(base ?? {}) };
  for (const [name, goals] of Object.entries(addition)) {
    merged[name] = (merged[name] ?? 0) + goals;
  }
  return merged;
}

export interface UserSeasonRecord {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

/** Resumo do desempenho do usuário na liga a partir dos fixtures já disputados. */
export function computeUserSeasonRecord(league: LeagueState): UserSeasonRecord {
  const userId = league.userTeamId;
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  for (const round of league.fixtures) {
    for (const f of round) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      const isHome = f.homeTeamId === userId;
      const isAway = f.awayTeamId === userId;
      if (!isHome && !isAway) continue;
      const gf = isHome ? f.homeScore : f.awayScore;
      const ga = isHome ? f.awayScore : f.homeScore;
      goalsFor += gf;
      goalsAgainst += ga;
      if (gf > ga) wins++;
      else if (gf === ga) draws++;
      else losses++;
    }
  }
  return { wins, draws, losses, goalsFor, goalsAgainst };
}

/** Artilheiro do usuário na temporada, a partir do placar acumulado partida a partida. */
export function deriveTopScorer(goalTally: Record<string, number>): CareerSeasonHistoryEntry['userTopScorer'] {
  const entries = Object.entries(goalTally);
  if (entries.length === 0) return undefined;
  const [name, goals] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return { name, goals };
}

/** "Técnico da temporada": só times que terminam no G-4 e chegam pelo menos à final da copa. */
export function isManagerOfSeason(leaguePosition: number, cupResult: CareerSeasonHistoryEntry['cupResult']): boolean {
  return leaguePosition <= 4 && (cupResult === 'champion' || cupResult === 'runner-up');
}
