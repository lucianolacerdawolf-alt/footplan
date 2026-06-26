import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../resolveAttack';
import type { Team, Player } from '../types';

function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return { id, name: id, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr } };
}

function makeTeam(id: string): Team {
  return { id, name: id, abbreviation: id.slice(0,3).toUpperCase(), color: '#111', secondaryColor: '#222', logoUrl: '',
    squad: [
      makePlayer(`${id}-gk1`,'GK',1), makePlayer(`${id}-d1`,'DEF',2,60), makePlayer(`${id}-d2`,'DEF',3,60),
      makePlayer(`${id}-d3`,'DEF',4,60), makePlayer(`${id}-d4`,'DEF',5,60), makePlayer(`${id}-d5`,'DEF',22,60),
      makePlayer(`${id}-m1`,'MID',6), makePlayer(`${id}-m2`,'MID',7), makePlayer(`${id}-m3`,'MID',8),
      makePlayer(`${id}-f1`,'FWD',9,80), makePlayer(`${id}-f2`,'FWD',10), makePlayer(`${id}-f3`,'FWD',11),
    ],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function seededRng(s: number) { let v = s >>> 0; return () => { v = Math.imul(v, 1664525) + 1013904223 >>> 0; return v / 0x100000000; }; }

describe('resolveAttack', () => {
  it('returns won: boolean and attacker: Player|null', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const fat = new Map<string, number>();
    const result = resolveAttack(atk, def, fat, fat, new Map(), seededRng(1));
    expect(typeof result.won).toBe('boolean');
    if (result.won) expect(result.attacker).toBeDefined();
    else expect(result.attacker).toBeNull();
  });

  it('superior attack wins more often', () => {
    const strong = makeTeam('S');
    strong.squad = strong.squad.map(p => p.position === 'FWD' ? { ...p, attributes: { ...p.attributes, speed: 99, dribbling: 99 } } : p);
    const weak = makeTeam('W');
    weak.squad = weak.squad.map(p => p.position === 'DEF' ? { ...p, attributes: { ...p.attributes, tackling: 10, positioning: 10 } } : p);
    const fat = new Map<string, number>();
    let wins = 0;
    for (let i = 0; i < 200; i++) { if (resolveAttack(strong, weak, fat, fat, new Map(), seededRng(i)).won) wins++; }
    expect(wins).toBeGreaterThan(140);
  });

  it('home advantage boosts attack', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const fat = new Map<string, number>();
    let homeWins = 0;
    for (let i = 0; i < 200; i++) { if (resolveAttack(atk, def, fat, fat, new Map(), seededRng(i), true).won) homeWins++; }
    expect(homeWins).toBeGreaterThan(90);
  });

  it('fatigued attack reduces effectiveness', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const fatAtk = new Map<string, number>();
    for (const p of atk.squad) { if (p.position === 'FWD') fatAtk.set(p.id, 90); }
    const fatDef = new Map<string, number>();
    let wins = 0;
    for (let i = 0; i < 100; i++) { if (resolveAttack(atk, def, fatAtk, fatDef, new Map(), seededRng(i)).won) wins++; }
    expect(wins).toBeLessThan(60);
  });

  it('momentum modifier affects outcome proportionally', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    const fat = new Map<string, number>();
    let winsBoost = 0;
    for (let i = 0; i < 100; i++) { if (resolveAttack(atk, def, fat, fat, new Map(), seededRng(i), false, 2).won) winsBoost++; }
    // With 2x momentum, more attacks should win
    expect(winsBoost).toBeGreaterThan(40);
  });

  it('returns null attacker when attack fails', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    // Stack defense heavily
    def.squad = def.squad.map(p => p.position === 'DEF' ? { ...p, attributes: { ...p.attributes, tackling: 99, positioning: 99 } } : p);
    const fat = new Map<string, number>();
    let losses = 0;
    for (let i = 0; i < 100; i++) {
      const r = resolveAttack(atk, def, fat, fat, new Map(), seededRng(i + 1000));
      if (!r.won) { expect(r.attacker).toBeNull(); losses++; }
    }
    expect(losses).toBeGreaterThan(0);
  });
});
