import { describe, it, expect } from 'vitest';
import type { Team, Player } from '@/engine/types';
import { applyMatchFatigue } from '../fitness';

function makePlayer(id: string, position: Player['position'], fatigue = 0): Player {
  return {
    id, name: id, number: 1, position, currentFatigue: fatigue,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(): Team {
  const squad: Player[] = [
    makePlayer('gk1', 'GK'),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`def${i}`, 'DEF')),
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`mid${i}`, 'MID')),
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`fwd${i}`, 'FWD')),
    makePlayer('bench1', 'DEF'), // reserva — não deve ganhar fadiga
  ];
  return {
    id: 't1', name: 'Team', abbreviation: 'TST', color: '#111', secondaryColor: '#222', logoUrl: '',
    squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('applyMatchFatigue', () => {
  it('aumenta a fadiga dos titulares de linha, mas não do goleiro nem do banco', () => {
    const team = makeTeam();
    const after = applyMatchFatigue(team);
    expect(after.squad.find(p => p.id === 'gk1')!.currentFatigue).toBe(0);
    expect(after.squad.find(p => p.id === 'def0')!.currentFatigue).toBeGreaterThan(0);
    expect(after.squad.find(p => p.id === 'bench1')!.currentFatigue).toBe(0);
  });

  it('nunca passa de 100', () => {
    const team = makeTeam();
    const idx = team.squad.findIndex(p => p.id === 'def0');
    team.squad[idx] = { ...team.squad[idx], currentFatigue: 90 };
    const after = applyMatchFatigue(team);
    expect(after.squad.find(p => p.id === 'def0')!.currentFatigue).toBe(100);
  });

  it('não muta o time original', () => {
    const team = makeTeam();
    applyMatchFatigue(team);
    expect(team.squad.find(p => p.id === 'def0')!.currentFatigue).toBe(0);
  });
});
