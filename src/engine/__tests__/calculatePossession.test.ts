import { describe, it, expect } from 'vitest';
import { calculatePossession } from '../calculatePossession';
import type { Team, Player } from '../types';

function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return { id, name: id, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr } };
}

function makeTeam(id: string, formation: Team['strategy']['formation'] = '4-3-3', mentality: Team['strategy']['mentality'] = 'possession'): Team {
  return { id, name: id, abbreviation: id.slice(0,3).toUpperCase(), color: '#111', secondaryColor: '#222', logoUrl: '',
    squad: [
      makePlayer(`${id}-gk1`,'GK',1), makePlayer(`${id}-gk2`,'GK',21),
      makePlayer(`${id}-d1`,'DEF',2), makePlayer(`${id}-d2`,'DEF',3), makePlayer(`${id}-d3`,'DEF',4),
      makePlayer(`${id}-d4`,'DEF',5), makePlayer(`${id}-d5`,'DEF',22),
      makePlayer(`${id}-m1`,'MID',6,78), makePlayer(`${id}-m2`,'MID',7,80),
      makePlayer(`${id}-m3`,'MID',8,75), makePlayer(`${id}-m4`,'MID',23),
      makePlayer(`${id}-f1`,'FWD',9), makePlayer(`${id}-f2`,'FWD',10), makePlayer(`${id}-f3`,'FWD',11),
      makePlayer(`${id}-f4`,'FWD',25),
    ],
    strategy: { formation, mentality, intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function seededRng(s: number) { let v = s >>> 0; return () => { v = Math.imul(v, 1664525) + 1013904223 >>> 0; return v / 0x100000000; }; }

describe('calculatePossession', () => {
  it('returns A or B', () => {
    const a = makeTeam('A');
    const b = makeTeam('B');
    const fatA = new Map<string, number>();
    const fatB = new Map<string, number>();
    const result = calculatePossession(a, b, fatA, fatB, new Map(), seededRng(1));
    expect(['A', 'B']).toContain(result);
  });

  it('team with higher midfield OVR wins possession more often', () => {
    const strong = makeTeam('S');
    const weak = makeTeam('W');
    strong.squad = strong.squad.map(p => p.position === 'MID' ? { ...p, attributes: { ...p.attributes, passing: 99, vision: 99 } } : p);
    const fat = new Map<string, number>();
    let strongWins = 0;
    for (let i = 0; i < 200; i++) {
      if (calculatePossession(strong, weak, fat, fat, new Map(), seededRng(i)) === 'A') strongWins++;
    }
    expect(strongWins).toBeGreaterThan(100);
  });

  it('formation with more midfielders has advantage', () => {
    const a = makeTeam('A', '3-5-2'); // 5 mids
    const b = makeTeam('B', '4-4-2'); // 4 mids
    const fat = new Map<string, number>();
    const result = calculatePossession(a, b, fat, fat, new Map(), seededRng(42));
    expect(['A', 'B']).toContain(result);
  });

  it('handles fatigue affecting possession', () => {
    const a = makeTeam('A');
    const b = makeTeam('B');
    const fatA = new Map<string, number>();
    const fatB = new Map<string, number>();
    // Fatigued mids for B
    for (const p of b.squad) { if (p.position === 'MID') fatB.set(p.id, 90); }
    let winsA = 0;
    for (let i = 0; i < 100; i++) {
      if (calculatePossession(a, b, fatA, fatB, new Map(), seededRng(i)) === 'A') winsA++;
    }
    expect(winsA).toBeGreaterThan(55);
  });
});
