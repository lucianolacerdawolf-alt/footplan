import { describe, it, expect } from 'vitest';
import { getLeague } from '@/data/leagues';
import { bestLineup, getStarterCount, isPlayerUnavailable, moveIntoSlot, isOutOfPosition } from '../squadUtils';
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

describe('Fora de posição (moveIntoSlot)', () => {
  const team = getLeague('pl')!.teams[0];
  const n = getStarterCount(team.strategy.formation);
  const idx = (pos: string) => team.squad.slice(0, n).findIndex(p => p.position === pos);

  it('titular x titular de posições diferentes: trocam de vaga e de função, contagens iguais', () => {
    const f = idx('FWD'), m = idx('MID');
    const out = moveIntoSlot(team, f, m);
    expect(out.squad[m].id).toBe(team.squad[f].id);
    expect(out.squad[m].position).toBe('MID');
    expect(out.squad[m].naturalPosition).toBe('FWD');
    expect(out.squad[f].position).toBe('FWD');
    expect(out.squad[f].naturalPosition).toBe('MID');
    const count = (sq: typeof team.squad, pos: string) => sq.slice(0, n).filter(p => p.position === pos).length;
    for (const pos of ['GK', 'DEF', 'MID', 'FWD']) expect(count(out.squad, pos)).toBe(count(team.squad, pos));
  });

  it('desfazer volta tudo ao natural; banco sempre volta à posição de origem', () => {
    const f = idx('FWD'), m = idx('MID');
    const back = moveIntoSlot(moveIntoSlot(team, f, m), f, m);
    expect(back.squad[f].naturalPosition).toBeUndefined();
    expect(back.squad[m].naturalPosition).toBeUndefined();
    const moved = moveIntoSlot(team, f, m);
    const benchIdx = moved.squad.findIndex((p, i) => i >= n && p.position === 'DEF');
    const toBench = moveIntoSlot(moved, m, benchIdx);
    expect(toBench.squad[benchIdx].position).toBe('FWD');
    expect(isOutOfPosition(toBench.squad[benchIdx])).toBe(false);
  });

  it('escalar melhores desfaz improvisos', () => {
    const moved = moveIntoSlot(team, idx('FWD'), idx('MID'));
    expect(bestLineup(moved, playerOvr).squad.some(isOutOfPosition)).toBe(false);
  });
});

describe('Penalidade fora de posição (tela e motor)', () => {
  it('craque improvisado perde força mesmo com atributo máximo alto', async () => {
    const { playAs } = await import('../squadUtils');
    const { getPlayersByPosition } = await import('../matchHelpers');
    const team = getLeague('pl')!.teams[0];
    for (const p of team.squad.filter(q => q.position === 'FWD')) {
      expect(playerOvr(playAs(p, 'MID'))).toBeLessThan(playerOvr(p));
      expect(playerOvr(playAs(p, 'DEF'))).toBeLessThan(playerOvr(playAs(p, 'MID')));
    }
    const fwd = team.squad.find(q => q.position === 'FWD')!;
    const asDef = playAs(fwd, 'DEF');
    const seen = getPlayersByPosition([asDef], 'DEF')[0];
    expect(seen.attributes.finishing).toBeLessThan(fwd.attributes.finishing);
  });

  it('valor de mercado não cai por improviso', async () => {
    const { playAs } = await import('../squadUtils');
    const { calculateMarketValue } = await import('../transferMarket');
    const fwd = getLeague('pl')!.teams[0].squad.find(q => q.position === 'FWD')!;
    expect(calculateMarketValue(playAs(fwd, 'DEF'))).toBe(calculateMarketValue(fwd));
  });
});

describe('Reputação inicial pelo clube', () => {
  it('maior da Premier > meio > lanterna; segunda divisão pesa menos', async () => {
    const { initialReputation } = await import('../reputation');
    const pl = getLeague('pl')!.teams;
    const { getAvgOvr } = await import('@/utils/teamUtils');
    const ranked = [...pl].sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    const top = initialReputation(ranked[0], pl, 'pl');
    const mid = initialReputation(ranked[Math.floor(ranked.length / 2)], pl, 'pl');
    const bottom = initialReputation(ranked[ranked.length - 1], pl, 'pl');
    expect(top).toBe(60);
    expect(mid).toBeGreaterThan(bottom);
    expect(top).toBeGreaterThan(mid);
    expect(bottom).toBe(30);
    expect(initialReputation(ranked[0], pl, 'championship')).toBeLessThan(top);
  });

  it('reputationAfterMove nunca baixa e sobe até 80% do clube novo', async () => {
    const { reputationAfterMove } = await import('../reputation');
    expect(reputationAfterMove(70, 60)).toBe(70);
    expect(reputationAfterMove(10, 60)).toBe(48);
  });
});

describe('Patrocínio inicial pelo tamanho do clube', () => {
  it('nível pela reputação inicial e receita da largada igual à base do clube', async () => {
    const { tierForReputation, tierAbove } = await import('../sponsors');
    const { sponsorTvPerRound } = await import('../clubEconomy');
    expect(tierForReputation(30)).toBe('regional');
    expect(tierForReputation(60)).toBe('national');
    expect(tierForReputation(20)).toBe('local');
    expect(tierForReputation(80)).toBe('global');
    expect(tierAbove('national', 'regional')).toBe(true);
    expect(tierAbove('regional', 'regional')).toBe(false);
    // Começar em "regional" numa liga cujo padrão é "nacional" não tira dinheiro da largada.
    expect(sponsorTvPerRound(1_000_000, 'pl', 'regional', 'regional')).toBe(sponsorTvPerRound(1_000_000, 'pl'));
    // Subir um nível a partir da largada do clube rende mais.
    expect(sponsorTvPerRound(1_000_000, 'pl', 'national', 'regional')).toBeGreaterThan(sponsorTvPerRound(1_000_000, 'pl', 'regional', 'regional'));
  });

  it('save ajustado na regra v1 é reajustado (só pra cima) na v2', async () => {
    const { seedReputation } = await import('../career');
    const team = getLeague('pl')!.teams[0];
    const fake = {
      leagueId: 'pl', rosters: { pl: getLeague('pl')!.teams },
      season: { league: { userTeamId: team.id, teams: getLeague('pl')!.teams } },
      manager: { name: 'T', reputation: 5 }, reputationSeeded: true,
    } as unknown as Parameters<typeof seedReputation>[0];
    const out = seedReputation(fake);
    expect(out.manager.reputation).toBeGreaterThanOrEqual(30);
    expect(out.reputationSeedVersion).toBe(2);
    expect(seedReputation(out)).toBe(out);
  });
});
