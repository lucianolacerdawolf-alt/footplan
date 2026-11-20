import { describe, it, expect } from 'vitest';
import {
  generateYouthIntake, generateYouthPlayer, progressYouthPlayer, refreshYouthPool,
  scoutEstimate, canPromote, promoteYouthPlayer, YOUTH_RELEASE_AGE,
  progressFocusedYouth, seasonsUntilReady,
} from '../youthAcademy';
import { playerOvr } from '@/utils/playerOvr';
import { getLeague } from '@/data/leagues';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

describe('categorias de base', () => {
  it('captação: 3-5 jovens de 15-17 anos, com goleiro, e potencial acima do OVR', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const intake = generateYouthIntake(1, seeded(seed));
      expect(intake.length).toBeGreaterThanOrEqual(3);
      expect(intake.length).toBeLessThanOrEqual(5);
      expect(intake.some(p => p.position === 'GK')).toBe(true);
      for (const p of intake) {
        expect(p.age).toBeGreaterThanOrEqual(15);
        expect(p.age).toBeLessThanOrEqual(17);
        expect(p.potential!).toBeGreaterThan(playerOvr(p));
      }
    }
  });

  it('evolui em direção ao potencial sem nunca passar dele (com folga de arredondamento)', () => {
    const rng = seeded(7);
    let p = generateYouthPlayer('MID', 1, rng);
    for (let year = 0; year < 6; year++) {
      const before = playerOvr(p);
      p = progressYouthPlayer(p, rng);
      expect(playerOvr(p)).toBeGreaterThanOrEqual(before - 1);
      expect(playerOvr(p)).toBeLessThanOrEqual(p.potential! + 2);
    }
  });

  it('quem chega aos 20 sem subir é dispensado', () => {
    const p = { ...generateYouthPlayer('FWD', 1, seeded(3)), age: YOUTH_RELEASE_AGE - 1 };
    const { remaining, released } = refreshYouthPool([p], seeded(4));
    expect(remaining).toHaveLength(0);
    expect(released).toHaveLength(1);
  });

  it('estimativa do olheiro contém o potencial real e é estável', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = generateYouthPlayer('DEF', 1, seeded(seed));
      const est = scoutEstimate(p);
      expect(est.min).toBeLessThanOrEqual(p.potential!);
      expect(est.max).toBeGreaterThanOrEqual(p.potential!);
      expect(scoutEstimate(p)).toEqual(est);
    }
  });

  it('promoção: só com 18+ e OVR 55+; entra com número livre e contrato', () => {
    const team = getLeague('pl')!.teams[0];
    const kid = generateYouthPlayer('MID', 1, seeded(9));
    expect(canPromote({ ...kid, age: 17 })).toBe(false);
    const ready = { ...kid, age: 18, attributes: Object.fromEntries(Object.entries(kid.attributes).map(([k]) => [k, 70])) as typeof kid.attributes };
    expect(canPromote(ready)).toBe(true);
    const after = promoteYouthPlayer(ready, team);
    const promoted = after.squad[after.squad.length - 1];
    expect(after.squad).toHaveLength(team.squad.length + 1);
    expect(team.squad.some(p => p.number === promoted.number)).toBe(false);
    expect(promoted.contractSeasonsLeft).toBe(3);
  });

  it('treino focado: evolui mais que o normal, mas a idade sobe só uma vez', () => {
    let gains = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const kid = { ...generateYouthPlayer('FWD', 1, seeded(seed)), potential: 85 };
      const normal = progressYouthPlayer(kid, seeded(seed + 100));
      const focused = progressFocusedYouth(kid, seeded(seed + 100));
      expect(focused.age).toBe(normal.age);
      if (playerOvr(focused) > playerOvr(normal)) gains++;
      expect(playerOvr(focused)).toBeGreaterThanOrEqual(playerOvr(normal));
    }
    expect(gains).toBeGreaterThan(10);
  });

  it('refreshYouthPool aplica o foco só no jovem escolhido', () => {
    const a = { ...generateYouthPlayer('MID', 1, seeded(3)), potential: 88 };
    const b = { ...a, id: 'outro' };
    const { remaining } = refreshYouthPool([a, b], () => 0.5, a.id);
    const fa = remaining.find(p => p.id === a.id)!;
    const fb = remaining.find(p => p.id === 'outro')!;
    expect(playerOvr(fa)).toBeGreaterThan(playerOvr(fb));
  });

  it('seasonsUntilReady: 0 se já pode subir; null se não chega antes da dispensa', () => {
    const kid = generateYouthPlayer('DEF', 1, seeded(7));
    const ready = { ...kid, age: 18, attributes: Object.fromEntries(Object.entries(kid.attributes).map(([k]) => [k, 70])) as typeof kid.attributes };
    expect(seasonsUntilReady(ready)).toBe(0);
    const hopeless = { ...kid, age: 19, potential: 41, attributes: Object.fromEntries(Object.entries(kid.attributes).map(([k]) => [k, 40])) as typeof kid.attributes };
    expect(seasonsUntilReady(hopeless)).toBeNull();
    const young = { ...kid, age: 15, potential: 80 };
    const n = seasonsUntilReady(young);
    expect(n === null || (n >= 1 && n <= YOUTH_RELEASE_AGE - 15)).toBe(true);
  });
});
