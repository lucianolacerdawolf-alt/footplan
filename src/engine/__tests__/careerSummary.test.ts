import { describe, it, expect } from 'vitest';
import { userLeagueSummary } from '../careerSummary';
import type { LeagueState, LeagueFixture } from '../tournament';

const team = (id: string) => ({ id, name: id, logoUrl: '' }) as never;
const fx = (round: number, home: string, away: string, hs?: number, as?: number): LeagueFixture => ({
  id: `${round}-${home}-${away}`, roundIndex: round, homeTeamId: home, awayTeamId: away,
  homeScore: hs, awayScore: as, played: hs != null,
});

const league = (fixtures: LeagueFixture[][]): LeagueState => ({
  teams: [team('me'), team('a'), team('b'), team('c')],
  userTeamId: 'me', fixtures, currentRound: fixtures.length, phase: 'playing',
});

describe('userLeagueSummary', () => {
  it('sem jogos disputados: sem posição e sem forma', () => {
    const s = userLeagueSummary(league([[fx(0, 'me', 'a'), fx(0, 'b', 'c')]]));
    expect(s).toEqual({ position: null, form: [] });
  });

  it('calcula a posição e a forma, contando mando de campo', () => {
    const s = userLeagueSummary(league([
      [fx(0, 'me', 'a', 2, 0), fx(0, 'b', 'c', 1, 1)],   // me V
      [fx(1, 'b', 'me', 1, 1), fx(1, 'c', 'a', 0, 0)],   // me E (fora)
      [fx(2, 'a', 'me', 3, 1), fx(2, 'c', 'b', 0, 2)],   // me D (fora)
    ]));
    expect(s.form).toEqual(['W', 'D', 'L']);
    expect(s.position).toBe(2);
  });

  it('guarda só os 5 últimos resultados, do mais antigo ao mais recente', () => {
    const rounds = Array.from({ length: 7 }, (_, i) =>
      [fx(i, 'me', 'a', i < 2 ? 0 : 1, i < 2 ? 1 : 0)]);   // D D V V V V V
    expect(userLeagueSummary(league(rounds)).form).toEqual(['W', 'W', 'W', 'W', 'W']);
  });

  it('ignora jogos de outros clubes e partidas ainda não jogadas', () => {
    const s = userLeagueSummary(league([[fx(0, 'a', 'b', 4, 0), fx(0, 'me', 'c')]]));
    expect(s).toEqual({ position: null, form: [] });
  });
});
