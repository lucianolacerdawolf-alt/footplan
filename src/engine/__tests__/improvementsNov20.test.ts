import { describe, it, expect } from 'vitest';
import { getLeague } from '@/data/leagues';
import { bestLineup, getStarterCount, isPlayerUnavailable } from '../squadUtils';
import { playerOvr } from '@/utils/playerOvr';
import { continentalTitleRep } from '../career';
import { generateYouthPlayer, youthRoundGrowth, refreshYouthPool } from '../youthAcademy';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

describe('Escalar melhores (bestLineup)', () => {
  const team = getLeague('pl')!.teams[0];

  it('mantém a formação e a contagem por posição, sem perder ninguém', () => {
    const shuffled = { ...team, squad: [...team.squad].reverse() };
    const out = bestLineup(shuffled, playerOvr);
    expect(out.squad).toHaveLength(team.squad.length);
    expect(new Set(out.squad.map(p => p.id))).toEqual(new Set(team.squad.map(p => p.id)));
    const starters = out.squad.slice(0, getStarterCount(out.strategy.formation));
    expect(starters.filter(p => p.position === 'GK')).toHaveLength(1);
  });

  it('nunca escala lesionado/suspenso quando há reserva da posição', () => {
    const n = getStarterCount(team.strategy.formation);
    const starterFwd = team.squad.slice(0, n).find(p => p.position === 'FWD')!;
    const hurt = { ...team, squad: team.squad.map(p => p.id === starterFwd.id ? { ...p, injuredRounds: 3 } : p) };
    const out = bestLineup(hurt, playerOvr);
    expect(out.squad.slice(0, n).some(isPlayerUnavailable)).toBe(false);
  });

  it('desconta o cansaço: titular exausto perde a vaga pro reserva parecido', () => {
    const n = getStarterCount(team.strategy.formation);
    const mids = team.squad.filter(p => p.position === 'MID');
    const best = [...mids].sort((a, b) => playerOvr(b) - playerOvr(a))[0];
    const tired = { ...team, squad: team.squad.map(p => p.id === best.id ? { ...p, currentFatigue: 100 } : p) };
    const out = bestLineup(tired, playerOvr);
    const benchHasBetterFresh = mids.some(p => p.id !== best.id && playerOvr(p) > playerOvr(best) * 0.5);
    if (benchHasBetterFresh && mids.length > 3) expect(out.squad.slice(0, n).some(p => p.id === best.id)).toBe(false);
  });
});

describe('Reputação continental', () => {
  it('UCL > UEL > UECL; sem copa = 0', () => {
    expect(continentalTitleRep('ucl')).toBe(15);
    expect(continentalTitleRep('uel')).toBe(10);
    expect(continentalTitleRep('uecl')).toBe(7);
    expect(continentalTitleRep(undefined)).toBe(0);
  });
});

describe('Base: evolução por rodada e empréstimo', () => {
  it('cresce aos poucos e nunca passa do potencial; empréstimo cresce mais', () => {
    let normal = 0, loaned = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const kid = { ...generateYouthPlayer('MID', 1, seeded(seed)), potential: 80 };
      let a = kid, b = kid;
      const rngA = seeded(seed + 500), rngB = seeded(seed + 500);
      for (let r = 0; r < 38; r++) { a = youthRoundGrowth(a, 38, rngA, 1); b = youthRoundGrowth(b, 38, rngB, 3); }
      expect(playerOvr(a)).toBeLessThanOrEqual(81);
      expect(a.age).toBe(kid.age);
      normal += playerOvr(a) - playerOvr(kid);
      loaned += playerOvr(b) - playerOvr(kid);
    }
    expect(normal).toBeGreaterThan(0);
    expect(loaned).toBeGreaterThan(normal);
  });

  it('jovem emprestado ganha a etapa extra no fim da temporada', () => {
    const a = { ...generateYouthPlayer('FWD', 1, seeded(11)), potential: 88 };
    const b = { ...a, id: 'outro' };
    const { remaining } = refreshYouthPool([a, b], () => 0.5, undefined, [a.id]);
    expect(playerOvr(remaining.find(p => p.id === a.id)!)).toBeGreaterThan(playerOvr(remaining.find(p => p.id === 'outro')!));
  });
});
