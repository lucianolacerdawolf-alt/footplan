// =============================================================================
// TESTES DE REGRESSÃO — bugs corrigidos na rodada de fix geral
// =============================================================================

import { describe, it, expect } from 'vitest';
import { progressPlayer, generateReplacementPlayer } from '../career';
import { resolveShot } from '../resolveShot';
import { getContinentalPrizeMoney } from '../continentalCups';
import { maybeGetCareerEvent } from '../careerEvents';
import { cloneTeam } from '../../utils/teamUtils';
import { mapRemotePosition } from '../../services/positionMapping';
import type { Player, Team } from '../types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number): Player {
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(id: string): Team {
  const squad = [
    makePlayer(`${id}-gk1`, 'GK', 1),
    makePlayer(`${id}-d1`, 'DEF', 2), makePlayer(`${id}-d2`, 'DEF', 3),
    makePlayer(`${id}-d3`, 'DEF', 4), makePlayer(`${id}-d4`, 'DEF', 5),
    makePlayer(`${id}-m1`, 'MID', 6), makePlayer(`${id}-m2`, 'MID', 7), makePlayer(`${id}-m3`, 'MID', 8),
    makePlayer(`${id}-f1`, 'FWD', 9), makePlayer(`${id}-f2`, 'FWD', 10), makePlayer(`${id}-f3`, 'FWD', 11),
  ];
  return {
    id, name: `T-${id}`, abbreviation: id.toUpperCase(), color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('regressão: progressPlayer preserva campos opcionais', () => {
  it('mantém contractGoal, lastRenewedSeasonYear, suspensões e nacionalidade', () => {
    const contractGoal = { type: 'goals' as const, target: 12, bonus: 200_000 };
    const p: Player = {
      ...makePlayer('p1', 'FWD', 9),
      age: 27,
      contractGoal,
      lastRenewedSeasonYear: 2025,
      isSuspended: true,
      suspendedRounds: 2,
      yellowCardsThisSeason: 5,
      nationality: 'BR',
      marketValue: 5_000_000,
      weeklyWage: 80_000,
      contractSeasonsLeft: 3,
    };
    const out = progressPlayer(p, seededRng(1));
    expect(out.contractGoal).toEqual(contractGoal);
    expect(out.lastRenewedSeasonYear).toBe(2025);
    expect(out.isSuspended).toBe(true);
    expect(out.suspendedRounds).toBe(2);
    expect(out.yellowCardsThisSeason).toBe(5);
    expect(out.nationality).toBe('BR');
    expect(out.marketValue).toBeDefined();
  });
});

describe('regressão: generateReplacementPlayer gera ids únicos mesmo com rng constante', () => {
  it('dois aposentados da mesma temporada nunca recebem o mesmo id', () => {
    const a = makePlayer('p-a', 'FWD', 9);
    const b = makePlayer('p-b', 'FWD', 10);
    const constRng = () => 0.5;
    const repA = generateReplacementPlayer(a, constRng);
    const repB = generateReplacementPlayer(b, constRng);
    expect(repA.id).not.toBe(repB.id);
  });

  it('reposição sucessiva do MESMO jogador também não colide', () => {
    const a = makePlayer('p-a', 'FWD', 9);
    const constRng = () => 0.5;
    const rep1 = generateReplacementPlayer(a, constRng);
    const rep2 = generateReplacementPlayer(a, constRng);
    expect(rep1.id).not.toBe(rep2.id);
  });
});

describe('regressão: resolveShot com goleiro indisponível', () => {
  it('usa o jogador de linha com melhor posicionamento como goleiro improvisado', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    // Goleiro expulso (vermelho).
    const cards = new Map<string, 'yellow' | 'red'>([[`${def.id}-gk1`, 'red']]);
    const attacker = atk.squad.find(p => p.position === 'FWD')!;
    const fat = new Map<string, number>();

    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const r = resolveShot(attacker, def, 'possession', fat, fat, cards, seededRng(i));
      results.add(r.result);
      // O "goleiro" nunca pode ser o ATACANTE (bug antigo: comentário citava jogador
      // do time adversário) nem um expulso.
      expect(r.goalkeeper.id).not.toBe(attacker.id);
      expect(r.goalkeeper.position).not.toBe('GK');
      expect(cards.get(r.goalkeeper.id)).not.toBe('red');
    }
    // Ainda gera a variedade normal de resultados — só troca o goleiro.
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  it('elenco sem nenhum goleiro também não estoura', () => {
    const atk = makeTeam('A');
    const def = makeTeam('B');
    def.squad = def.squad.filter(p => p.position !== 'GK');
    const attacker = atk.squad.find(p => p.position === 'FWD')!;
    const fat = new Map<string, number>();
    for (let i = 0; i < 50; i++) {
      const r = resolveShot(attacker, def, 'possession', fat, fat, new Map(), seededRng(i));
      expect(r.goalkeeper.id).not.toBe(attacker.id);
    }
  });
});

describe('regressão: getContinentalPrizeMoney com resultado desconhecido', () => {
  it('retorna 0 (fallback) em vez de undefined', () => {
    expect(getContinentalPrizeMoney('ucl', 'not-played')).toBe(0);
    expect(getContinentalPrizeMoney('copa-invalida', 'champion')).toBe(0);
  });
});

describe('regressão: maybeGetCareerEvent com rng injetável', () => {
  it('respeita o rng (determinístico nos testes)', () => {
    const always: () => number = () => 0.1; // < 0.25 → evento
    const never: () => number = () => 0.9;  // > 0.25 → null
    expect(maybeGetCareerEvent(always)).not.toBeNull();
    expect(maybeGetCareerEvent(never)).toBeNull();
  });
});

describe('regressão: cloneTeam clona contractGoal por valor', () => {
  it('mutação no clone não vaza pro original', () => {
    const contractGoal = { type: 'goals' as const, target: 12, bonus: 200_000 };
    const t = makeTeam('x');
    t.squad[0].contractGoal = contractGoal;
    const c = cloneTeam(t);
    c.squad[0].contractGoal!.target = 99;
    expect(t.squad[0].contractGoal!.target).toBe(12);
    expect(c.squad[0].contractGoal!.target).toBe(99);
  });
});

describe('mapRemotePosition unificado', () => {
  it('mapeia as keywords de todas as fontes', () => {
    expect(mapRemotePosition('Goalkeeper')).toBe('GK');
    expect(mapRemotePosition('Defence')).toBe('DEF');
    expect(mapRemotePosition('Midfield')).toBe('MID');
    expect(mapRemotePosition('Offence')).toBe('FWD');
    expect(mapRemotePosition('Defender')).toBe('DEF');
    expect(mapRemotePosition('Midfielder')).toBe('MID');
    expect(mapRemotePosition('GK')).toBe('GK');
    expect(mapRemotePosition('DEF')).toBe('DEF');
    expect(mapRemotePosition('MID')).toBe('MID');
    expect(mapRemotePosition('FWD')).toBe('FWD');
    expect(mapRemotePosition(null)).toBe('MID');
    expect(mapRemotePosition('')).toBe('MID');
  });
});
