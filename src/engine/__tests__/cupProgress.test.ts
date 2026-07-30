import { describe, it, expect } from 'vitest';
import { deriveCupProgress, deriveCupResult } from '../career';
import type { BracketState, BracketMatch } from '../tournament';

const USER = 'user';

function match(id: string, home: string | null, away: string | null, played = false): BracketMatch {
  return { id, homeTeamId: home, awayTeamId: away, played };
}

/** Chaveamento mínimo: só os campos que deriveCupProgress lê. */
function bracket(over: Partial<BracketState> = {}): BracketState {
  return {
    teams: [], userTeamId: USER,
    roundOf16: [match('r1', USER, 'a'), match('r2', 'b', 'c')],
    quarterFinals: [match('q1', null, null)],
    semiFinals: [match('s1', null, null)],
    final: match('f1', null, null),
    stage: 'roundOf16', cupName: 'Copa', leagueId: 'pl',
    ...over,
  };
}

describe('deriveCupProgress', () => {
  it('campeão é campeão e nunca conta como eliminado', () => {
    const p = deriveCupProgress(bracket({ championId: USER, stage: 'champion' }), USER);
    expect(p).toEqual({ stage: 'champion', eliminated: false });
  });

  it('com jogo pendente nas oitavas, está nas oitavas e vivo', () => {
    const p = deriveCupProgress(bracket(), USER);
    expect(p).toEqual({ stage: 'roundOf16', eliminated: false });
  });

  it('jogo das oitavas já disputado e sem jogo adiante: eliminado nas oitavas', () => {
    const p = deriveCupProgress(bracket({
      roundOf16: [match('r1', USER, 'a', true), match('r2', 'b', 'c', true)],
    }), USER);
    expect(p).toEqual({ stage: 'roundOf16', eliminated: true });
  });

  it('reporta a fase mais profunda alcançada, não a primeira', () => {
    const p = deriveCupProgress(bracket({
      roundOf16: [match('r1', USER, 'a', true)],
      quarterFinals: [match('q1', USER, 'd', true)],
      semiFinals: [match('s1', USER, 'e', false)],
      stage: 'semifinals',
    }), USER);
    expect(p).toEqual({ stage: 'semifinal', eliminated: false });
  });

  it('perdeu a final: vice e eliminado', () => {
    const p = deriveCupProgress(bracket({
      roundOf16: [match('r1', USER, 'a', true)],
      final: match('f1', USER, 'z', true),
      championId: 'z', stage: 'champion',
    }), USER);
    expect(p).toEqual({ stage: 'runner-up', eliminated: true });
  });

  it('time fora do chaveamento: não disputou', () => {
    const p = deriveCupProgress(bracket({ roundOf16: [match('r1', 'x', 'y', true)] }), USER);
    expect(p).toEqual({ stage: 'not-played', eliminated: true });
  });

  it('difere de deriveCupResult, que só responde com a copa encerrada', () => {
    // Mesmo estado: em andamento nas oitavas.
    const emAndamento = bracket();
    expect(deriveCupResult(emAndamento, USER)).toBe('not-played');
    expect(deriveCupProgress(emAndamento, USER).stage).toBe('roundOf16');
  });
});
