import { describe, it, expect } from 'vitest';
import { cloneTeam } from '../teamUtils';
import type { Team } from '../../engine/types';

function makeTeam(fatigue = 0): Team {
  return {
    id: 'test',
    name: 'Test Team',
    abbreviation: 'TST',
    color: '#111',
    secondaryColor: '#222',
    logoUrl: '',
    squad: [
      { id: 'p1', name: 'Player 1', number: 1, position: 'GK', currentFatigue: fatigue, attributes: { speed: 70, stamina: 70, passing: 60, finishing: 60, tackling: 60, dribbling: 60, vision: 60, positioning: 60 } },
      { id: 'p2', name: 'Player 2', number: 2, position: 'DEF', currentFatigue: fatigue + 30, attributes: { speed: 70, stamina: 70, passing: 60, finishing: 60, tackling: 60, dribbling: 60, vision: 60, positioning: 60 } },
    ],
    strategy: { formation: '4-4-2', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('cloneTeam', () => {
  it('returns a deep copy (different reference)', () => {
    const t = makeTeam();
    const c = cloneTeam(t);
    expect(c).not.toBe(t);
    expect(c.squad).not.toBe(t.squad);
    expect(c.squad[0]).not.toBe(t.squad[0]);
    expect(c.squad[0].attributes).not.toBe(t.squad[0].attributes);
  });

  it('preserves team data', () => {
    const t = makeTeam(15);
    const c = cloneTeam(t, true);
    expect(c.id).toBe(t.id);
    expect(c.name).toBe(t.name);
    expect(c.squad.length).toBe(t.squad.length);
    expect(c.strategy.formation).toBe(t.strategy.formation);
  });

  it('resets fatigue to 0 by default', () => {
    const t = makeTeam(50);
    const c = cloneTeam(t);
    expect(c.squad[0].currentFatigue).toBe(0);
    expect(c.squad[1].currentFatigue).toBe(0);
  });

  it('preserves fatigue when preserveFatigue=true', () => {
    const t = makeTeam(50);
    const c = cloneTeam(t, true);
    expect(c.squad[0].currentFatigue).toBe(50);
    expect(c.squad[1].currentFatigue).toBe(80); // 50 + 30
  });

  it('mutations on cloned team do not affect original', () => {
    const t = makeTeam();
    const c = cloneTeam(t, true);
    c.squad[0].currentFatigue = 99;
    c.squad[0].attributes.speed = 1;
    expect(t.squad[0].currentFatigue).toBe(0);
    expect(t.squad[0].attributes.speed).toBe(70);
  });
});
