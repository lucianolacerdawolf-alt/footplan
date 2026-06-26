import { describe, it, expect } from 'vitest';
import { resolveShot } from '../resolveShot';
import type { Team, Player } from '../types';

function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return { id, name: id, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr } };
}

function makeTeam(id: string): Team {
  return { id, name: id, abbreviation: id.slice(0,3).toUpperCase(), color: '#111', secondaryColor: '#222', logoUrl: '',
    squad: [
      makePlayer(`${id}-gk1`,'GK',1,75), makePlayer(`${id}-gk2`,'GK',21,60),
      makePlayer(`${id}-d1`,'DEF',2), makePlayer(`${id}-d2`,'DEF',3),
      makePlayer(`${id}-d3`,'DEF',4), makePlayer(`${id}-d4`,'DEF',5), makePlayer(`${id}-d5`,'DEF',22),
      makePlayer(`${id}-m1`,'MID',6), makePlayer(`${id}-m2`,'MID',7), makePlayer(`${id}-m3`,'MID',8),
      makePlayer(`${id}-f1`,'FWD',9,80), makePlayer(`${id}-f2`,'FWD',10,82), makePlayer(`${id}-f3`,'FWD',11,78),
    ],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function seededRng(s: number) { let v = s >>> 0; return () => { v = Math.imul(v, 1664525) + 1013904223 >>> 0; return v / 0x100000000; }; }

describe('resolveShot', () => {
  it('returns goal, post, save, or miss', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const attacker = atk.squad.find(p => p.position === 'FWD')!;
    const fat = new Map<string, number>();
    const results = new Set<string>();
    for (let i = 0; i < 500; i++) {
      results.add(resolveShot(attacker, def, 'possession', fat, fat, new Map(), seededRng(i)).result);
    }
    expect(results.has('goal')).toBe(true);
    expect(results.has('save')).toBe(true);
    // post and miss may not appear in small samples, at least 3 of 4
    expect(results.size).toBeGreaterThanOrEqual(3);
  });

  it('elite finisher vs weak GK: more goals', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    // Weak GK
    def.squad = def.squad.map(p => p.position === 'GK' ? { ...p, attributes: { ...p.attributes, positioning: 10 } } : p);
    const attacker: Player = { ...atk.squad.find(p => p.position === 'FWD')!, attributes: { speed: 99, stamina: 99, passing: 99, finishing: 99, tackling: 99, dribbling: 99, vision: 99, positioning: 99 } };
    const fat = new Map<string, number>();
    let goals = 0;
    for (let i = 0; i < 100; i++) {
      if (resolveShot(attacker, def, 'possession', fat, fat, new Map(), seededRng(i)).result === 'goal') goals++;
    }
    expect(goals).toBeGreaterThan(70);
  });

  it('weak finisher vs elite GK: few goals', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    def.squad = def.squad.map(p => p.position === 'GK' ? { ...p, attributes: { ...p.attributes, positioning: 99 } } : p);
    const attacker = atk.squad.find(p => p.position === 'FWD')!;
    const fat = new Map<string, number>();
    let goals = 0;
    for (let i = 0; i < 100; i++) {
      if (resolveShot(attacker, def, 'possession', fat, fat, new Map(), seededRng(i)).result === 'goal') goals++;
    }
    expect(goals).toBeLessThan(30);
  });

  it('returns correct scorer and goalkeeper', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const attacker = atk.squad.find(p => p.position === 'FWD')!;
    const fat = new Map<string, number>();
    const result = resolveShot(attacker, def, 'possession', fat, fat, new Map(), seededRng(1));
    expect(result.scorer.id).toBe(attacker.id);
    expect(result.goalkeeper.position).toBe('GK');
    expect(result.goalkeeper.id).toBeDefined();
  });

  it('fatigued attacker scores less', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const attacker = atk.squad.find(p => p.position === 'FWD')!;
    const fatAtk = new Map<string, number>([[attacker.id, 90]]);
    const fatDef = new Map<string, number>();
    let goals = 0;
    for (let i = 0; i < 100; i++) {
      if (resolveShot(attacker, def, 'possession', fatAtk, fatDef, new Map(), seededRng(i)).result === 'goal') goals++;
    }
    expect(goals).toBeLessThan(50);
  });
});
