import { describe, it, expect } from 'vitest';
import type { LeagueState } from '@/engine/tournament';
import type { MatchEvent } from '@/engine/types';
import { computeUserSeasonRecord, deriveTopScorer, isManagerOfSeason, tallyUserGoals, mergeGoalTally } from '../seasonClosure';

function makeLeague(fixtures: LeagueState['fixtures']): LeagueState {
  return {
    teams: [], userTeamId: 'user', fixtures, currentRound: fixtures.length, phase: 'done',
  };
}

describe('computeUserSeasonRecord', () => {
  it('conta vitórias/empates/derrotas e gols só das partidas do usuário já disputadas', () => {
    const league = makeLeague([
      [
        { id: 'f1', roundIndex: 0, homeTeamId: 'user', awayTeamId: 'opp1', homeScore: 2, awayScore: 1, played: true },
        { id: 'f2', roundIndex: 0, homeTeamId: 'opp2', awayTeamId: 'opp3', homeScore: 3, awayScore: 3, played: true }, // não é do usuário
      ],
      [
        { id: 'f3', roundIndex: 1, homeTeamId: 'opp1', awayTeamId: 'user', homeScore: 0, awayScore: 0, played: true },
      ],
      [
        { id: 'f4', roundIndex: 2, homeTeamId: 'user', awayTeamId: 'opp2', homeScore: 1, awayScore: 2, played: true },
      ],
      [
        { id: 'f5', roundIndex: 3, homeTeamId: 'user', awayTeamId: 'opp3', homeScore: 0, awayScore: 0, played: false }, // ainda não jogado
      ],
    ]);

    const record = computeUserSeasonRecord(league);
    expect(record).toEqual({ wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3 });
  });

  it('temporada sem nenhum jogo do usuário retorna tudo zerado', () => {
    const league = makeLeague([[{ id: 'f1', roundIndex: 0, homeTeamId: 'opp1', awayTeamId: 'opp2', homeScore: 1, awayScore: 0, played: true }]]);
    expect(computeUserSeasonRecord(league)).toEqual({ wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });
  });
});

describe('tallyUserGoals / mergeGoalTally', () => {
  it('conta só gols do time do usuário com marcador definido', () => {
    const events: MatchEvent[] = [
      { minute: 10, type: 'goal', description: '', teamId: 'user', scorer: 'Fulano' },
      { minute: 20, type: 'goal', description: '', teamId: 'user', scorer: 'Fulano' },
      { minute: 30, type: 'goal', description: '', teamId: 'opp', scorer: 'Rival' },
      { minute: 40, type: 'miss', description: '', teamId: 'user' },
    ];
    expect(tallyUserGoals(events, 'user')).toEqual({ Fulano: 2 });
  });

  it('mergeGoalTally acumula partida a partida sem perder o que já existia', () => {
    const base = { Fulano: 2 };
    const partida2 = { Fulano: 1, Ciclano: 1 };
    expect(mergeGoalTally(base, partida2)).toEqual({ Fulano: 3, Ciclano: 1 });
    expect(mergeGoalTally(undefined, partida2)).toEqual(partida2);
  });
});

describe('deriveTopScorer', () => {
  it('escolhe o maior artilheiro do tally', () => {
    expect(deriveTopScorer({ A: 3, B: 7, C: 5 })).toEqual({ name: 'B', goals: 7 });
  });

  it('tally vazio retorna undefined', () => {
    expect(deriveTopScorer({})).toBeUndefined();
  });
});

describe('isManagerOfSeason', () => {
  it('elege quando termina no G-4 e chega à final ou é campeão da copa', () => {
    expect(isManagerOfSeason(1, 'champion')).toBe(true);
    expect(isManagerOfSeason(4, 'runner-up')).toBe(true);
  });

  it('não elege fora do G-4 mesmo sendo campeão da copa', () => {
    expect(isManagerOfSeason(5, 'champion')).toBe(false);
  });

  it('não elege dentro do G-4 sem chegar à final da copa', () => {
    expect(isManagerOfSeason(2, 'semifinal')).toBe(false);
  });
});
