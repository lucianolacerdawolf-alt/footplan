import { describe, it, expect } from 'vitest';
import type { Team, Player, MatchEvent } from '@/engine/types';
import { applyMatchCards, clearSuspensions } from '../discipline';

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id, name: id, number: 1, position: 'MID', currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
    ...overrides,
  };
}

function makeTeam(players: Player[]): Team {
  return {
    id: 't1', name: 'Team', abbreviation: 'TST', color: '#111', secondaryColor: '#222', logoUrl: '',
    squad: players,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('applyMatchCards', () => {
  it('ignora eventos de outro time ou sem playerId — retorna a mesma referência', () => {
    const team = makeTeam([makePlayer('p1')]);
    const events: MatchEvent[] = [
      { minute: 1, type: 'yellowCard', description: '', teamId: 'other-team', playerId: 'p1' },
      { minute: 2, type: 'yellowCard', description: '', teamId: 't1' },
    ];
    expect(applyMatchCards(team, events)).toBe(team);
  });

  it('acumula 1 amarelo sem suspender', () => {
    const team = makeTeam([makePlayer('p1')]);
    const after = applyMatchCards(team, [{ minute: 1, type: 'yellowCard', description: '', teamId: 't1', playerId: 'p1' }]);
    const p = after.squad[0];
    expect(p.yellowCardsThisSeason).toBe(1);
    expect(p.isSuspended).toBeFalsy();
  });

  it('suspende e zera o contador ao atingir 3 amarelos acumulados entre partidas', () => {
    let team = makeTeam([makePlayer('p1')]);
    for (let i = 0; i < 3; i++) {
      team = applyMatchCards(team, [{ minute: 1, type: 'yellowCard', description: '', teamId: 't1', playerId: 'p1' }]);
    }
    const p = team.squad[0];
    expect(p.yellowCardsThisSeason).toBe(0);
    expect(p.isSuspended).toBe(true);
    expect(p.suspendedRounds).toBe(1);
  });

  it('vermelho direto suspende por 1 jogo mesmo sem 3 amarelos', () => {
    const team = makeTeam([makePlayer('p1')]);
    const after = applyMatchCards(team, [{ minute: 30, type: 'redCard', description: '', teamId: 't1', playerId: 'p1' }]);
    const p = after.squad[0];
    expect(p.isSuspended).toBe(true);
    expect(p.suspendedRounds).toBe(1);
  });
});

describe('clearSuspensions', () => {
  it('decrementa suspendedRounds e libera a suspensão ao chegar a 0', () => {
    const team = makeTeam([makePlayer('p1', { isSuspended: true, suspendedRounds: 1 })]);
    const after = clearSuspensions(team);
    expect(after.squad[0].isSuspended).toBe(false);
    expect(after.squad[0].suspendedRounds).toBeUndefined();
  });

  it('mantém suspenso quando resta mais de 1 rodada', () => {
    const team = makeTeam([makePlayer('p1', { isSuspended: true, suspendedRounds: 2 })]);
    const after = clearSuspensions(team);
    expect(after.squad[0].isSuspended).toBe(true);
    expect(after.squad[0].suspendedRounds).toBe(1);
  });

  it('não altera jogadores que não estão suspensos', () => {
    const team = makeTeam([makePlayer('p1')]);
    const after = clearSuspensions(team);
    expect(after.squad[0]).toEqual(team.squad[0]);
  });
});
