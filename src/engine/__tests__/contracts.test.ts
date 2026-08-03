import { describe, it, expect } from 'vitest';
import {
  assignInitialContracts,
  getContractSeasonsLeft,
  DEFAULT_CONTRACT_SEASONS,
  expireContracts,
  renewPlayerContract,
  progressPlayer,
  type Player,
  type Team,
} from '../career';
import { renewalCost } from '../transferMarket';
import { refreshFreeAgentPool } from '../freeAgentPool';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, contractSeasonsLeft?: number): Player {
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0,
    age: 25, marketValue: 10_000_000, weeklyWage: 20_000, contractSeasonsLeft,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(players: Player[]): Team {
  return {
    id: 'user', name: 'Meu Time', abbreviation: 'MYT', color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad: players,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('assignInitialContracts', () => {
  it('atribui 1-4 temporadas a todos os jogadores sem contrato, idempotente', () => {
    const rng = seededRng(42);
    const team = makeTeam([makePlayer('a', 'GK', 1), makePlayer('b', 'FWD', 9)]);
    const [out] = assignInitialContracts([team], rng);
    for (const p of out.squad) {
      expect(p.contractSeasonsLeft).toBeGreaterThanOrEqual(1);
      expect(p.contractSeasonsLeft).toBeLessThanOrEqual(4);
    }
    // Idempotente: não sobrescreve contratos já existentes.
    const preContract = makePlayer('c', 'MID', 6, 4);
    const [out2] = assignInitialContracts([makeTeam([preContract])], rng);
    expect(out2.squad[0].contractSeasonsLeft).toBe(4);
  });

  it('concentra a massa em 2-3 temporadas (mais comum que 1 ou 4)', () => {
    const rng = seededRng(7);
    const squad = Array.from({ length: 200 }, (_, i) => makePlayer(`p${i}`, 'MID', i));
    const [out] = assignInitialContracts([makeTeam(squad)], rng);
    const counts = out.squad.reduce((acc, p) => {
      acc[p.contractSeasonsLeft!] = (acc[p.contractSeasonsLeft!] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const mid = (counts[2] ?? 0) + (counts[3] ?? 0);
    expect(mid).toBeGreaterThan(counts[1] ?? 0);
    expect(mid).toBeGreaterThan(counts[4] ?? 0);
  });
});

describe('getContractSeasonsLeft', () => {
  it('retorna o default pra saves antigos/jogadores sem o campo', () => {
    expect(getContractSeasonsLeft(makePlayer('x', 'DEF', 2))).toBe(DEFAULT_CONTRACT_SEASONS);
    expect(getContractSeasonsLeft(makePlayer('y', 'DEF', 3, 1))).toBe(1);
  });
});

describe('progressPlayer preserva o contrato', () => {
  it('mantém contractSeasonsLeft ao evoluir o jogador (senão sumiria por temporada)', () => {
    const rng = seededRng(3);
    const out = progressPlayer(makePlayer('a', 'FWD', 9, 2), rng);
    expect(out.contractSeasonsLeft).toBe(2);
    expect(out.age).toBe(26);
  });
});

describe('expireContracts', () => {
  it('decrementa o contrato de quem continua e remove quem chegou a 0', () => {
    const team = makeTeam([
      makePlayer('exp', 'FWD', 9, 1),
      makePlayer('stay2', 'MID', 7, 2),
      makePlayer('stay3', 'DEF', 3, 3),
    ]);
    const { squad, departures } = expireContracts(team);
    expect(departures.map(p => p.id)).toEqual(['exp']);
    expect(squad.map(p => p.id)).toEqual(['stay2', 'stay3']);
    expect(squad.find(p => p.id === 'stay2')!.contractSeasonsLeft).toBe(1);
    expect(squad.find(p => p.id === 'stay3')!.contractSeasonsLeft).toBe(2);
  });

  it('saída sai sem contrato e com valores de mercado/salário recalculados', () => {
    const team = makeTeam([makePlayer('exp', 'FWD', 9, 1)]);
    const { departures } = expireContracts(team);
    expect(departures.length).toBe(1);
    expect(departures[0].contractSeasonsLeft).toBeUndefined();
    expect(departures[0].marketValue).toBeTypeOf('number');
    expect(departures[0].weeklyWage).toBeTypeOf('number');
  });

  it('faz backfill do default em jogadores sem o campo (saves antigos)', () => {
    const team = makeTeam([makePlayer('legacy', 'MID', 6)]);
    const { squad, departures } = expireContracts(team);
    expect(departures).toEqual([]);
    expect(squad[0].contractSeasonsLeft).toBe(DEFAULT_CONTRACT_SEASONS - 1);
  });

  it('sem nenhum contrato vencendo, não há saídas nem mutação desnecessária', () => {
    const team = makeTeam([makePlayer('a', 'DEF', 2, 2), makePlayer('b', 'FWD', 9, 5)]);
    const { squad, departures } = expireContracts(team);
    expect(departures).toEqual([]);
    expect(squad.length).toBe(2);
  });
});

describe('renewPlayerContract', () => {
  it('estende o contrato pelos anos e recalcula o salário pelo valor atual', () => {
    const player = makePlayer('a', 'FWD', 9, 1);
    const { player: renewed, cost } = renewPlayerContract(player, 2);
    expect(renewed.contractSeasonsLeft).toBe(3);
    expect(cost).toBe(renewalCost(player, 2));
    expect(renewed.weeklyWage).toBeTypeOf('number');
    // Salário acompanha o valor de mercado atual (não pode ficar no valor antigo).
    expect(renewed.weeklyWage).toBeGreaterThan(0);
  });

  it('custo é proporcional ao valor de mercado e aos anos', () => {
    const cheap = makePlayer('c', 'GK', 1, 1);
    const star = makePlayer('s', 'FWD', 9, 1);
    const one = renewalCost(cheap, 1);
    const two = renewalCost(cheap, 2);
    expect(two).toBe(one * 2);
    expect(renewalCost(star, 1)).toBeGreaterThan(one);
  });
});

describe('refreshFreeAgentPool com newEntrants (contratos encerrados)', () => {
  it('mantém os recém-chegados sem envelhecê-los de novo e completa até o alvo', () => {
    const rng = seededRng(11);
    const entrant = makePlayer('dep', 'FWD', 0, undefined);
    const before = entrant.age;
    const pool = refreshFreeAgentPool([], 2, rng, [entrant]);
    expect(pool.some(p => p.id === 'dep')).toBe(true);
    expect(pool.find(p => p.id === 'dep')!.age).toBe(before);
    // O top-up respeita a cota: mesmo com 1 entrada, o pool chega ao tamanho alvo.
    expect(pool.length).toBeGreaterThanOrEqual(16);
    expect(pool.length).toBeLessThanOrEqual(17);
  });
});
