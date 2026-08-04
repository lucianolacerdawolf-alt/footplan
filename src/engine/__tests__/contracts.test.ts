import { describe, it, expect } from 'vitest';
import {
  assignInitialContracts,
  getContractSeasonsLeft,
  DEFAULT_CONTRACT_SEASONS,
  expireContracts,
  renewPlayerContract,
  progressPlayer,
  canRenewContract,
  evaluateRenewalOffer,
  evaluateContractGoals,
  computeContractDemand,
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

  it('quem sai por contrato não leva a cláusula de meta (cláusula é do clube, por temporada)', () => {
    const team = makeTeam([{ ...makePlayer('exp', 'FWD', 9, 1), contractGoal: { type: 'goals', target: 10, bonus: 100_000 } }]);
    const { departures } = expireContracts(team);
    expect(departures[0].contractGoal).toBeUndefined();
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

  it('aplica salário negociado, bônus de assinatura e cláusula de meta', () => {
    const player = makePlayer('a', 'FWD', 9, 1);
    const { player: renewed, cost } = renewPlayerContract(player, 2, {
      weeklyWage: 30_000,
      signingBonus: 500_000,
      contractGoal: { type: 'goals', target: 15, bonus: 1_000_000 },
    });
    expect(renewed.weeklyWage).toBe(30_000);
    expect(renewed.contractGoal).toEqual({ type: 'goals', target: 15, bonus: 1_000_000 });
    expect(cost).toBe(renewalCost(player, 2) + 500_000);
  });
});

describe('canRenewContract', () => {
  it('permite renovar quem nunca renovou ou renovou em temporada anterior', () => {
    expect(canRenewContract(makePlayer('a', 'MID', 5), 3)).toBe(true);
    expect(canRenewContract(makePlayer('a', 'MID', 5, 2), 3)).toBe(true);
    expect(canRenewContract({ ...makePlayer('a', 'MID', 5, 2), lastRenewedSeasonYear: 2 }, 3)).toBe(true);
  });

  it('bloqueia renovar na mesma temporada da última renovação (1 safra de espera)', () => {
    const player = { ...makePlayer('a', 'MID', 5, 2), lastRenewedSeasonYear: 3 };
    expect(canRenewContract(player, 3)).toBe(false);
  });
});

describe('evaluateRenewalOffer', () => {
  it('aceita quando o pacote anual cobre o pedido', () => {
    const player = makePlayer('s', 'FWD', 9, 1);
    const demand = computeContractDemand(player);
    // Salário semanal que cobre o pedido (por cima, com folga).
    const weeklyWage = Math.ceil(demand.annualDemand / 52 / 100) * 100 + 1000;
    const result = evaluateRenewalOffer(player, { years: demand.minYears, weeklyWage, signingBonus: 0 });
    expect(result.accepted).toBe(true);
    expect(result.reaction).toBe('accept');
  });

  it('devolve contraproposta com valores concretos quando o pacote está entre 85% e o pedido', () => {
    const player = makePlayer('s', 'FWD', 9, 1);
    const demand = computeContractDemand(player);
    const weeklyWage = Math.max(1, Math.ceil(demand.annualDemand * 0.9 / 52 / 100) * 100);
    const result = evaluateRenewalOffer(player, { years: 1, weeklyWage, signingBonus: 0 });
    expect(result.accepted).toBe(false);
    expect(result.reaction).toBe('counter');
    expect(result.counter).toBeDefined();
    // Aceitar a contraproposta fecha o acordo.
    if (result.counter) {
      const accepted = evaluateRenewalOffer(player, result.counter);
      expect(accepted.accepted).toBe(true);
    }
  });

  it('recusa quando o pacote fica abaixo de 85% do pedido', () => {
    const player = makePlayer('s', 'FWD', 9, 1);
    const demand = computeContractDemand(player);
    const weeklyWage = Math.max(1, Math.ceil(demand.annualDemand * 0.5 / 52 / 100) * 100);
    const result = evaluateRenewalOffer(player, { years: 1, weeklyWage, signingBonus: 0 });
    expect(result.accepted).toBe(false);
    expect(result.reaction).toBe('reject');
    expect(result.counter).toBeUndefined();
  });

  it('meta de gols entra no pacote e ajuda a fechar o acordo', () => {
    const player = makePlayer('s', 'FWD', 9, 1);
    const demand = computeContractDemand(player);
    // Sem a meta, o pacote fica abaixo do pedido → recusa.
    const lowWage = Math.max(1, Math.ceil(demand.annualDemand * 0.7 / 52 / 100) * 100);
    const withoutGoal = evaluateRenewalOffer(player, { years: 1, weeklyWage: lowWage, signingBonus: 0 });
    expect(withoutGoal.accepted).toBe(false);
    // Com a meta, o pacote sobe (bônus pesa 0.5) e cobre o pedido → aceita.
    const withGoal = evaluateRenewalOffer(player, {
      years: 1, weeklyWage: lowWage, signingBonus: 0,
      contractGoal: { type: 'goals', target: 15, bonus: demand.annualDemand * 2 },
    });
    expect(withGoal.accepted).toBe(true);
  });
});

describe('evaluateContractGoals', () => {
  function playerWithGoal(id: string, target: number, bonus: number): Player {
    return { ...makePlayer(id, 'FWD', 9, 2), contractGoal: { type: 'goals', target, bonus } };
  }

  it('paga o bônus de quem atingiu a meta e limpa a cláusula de todos', () => {
    const hit = playerWithGoal('hit', 10, 500_000);
    const miss = playerWithGoal('miss', 10, 500_000);
    const noGoal = makePlayer('plain', 'MID', 7, 3);
    const team = makeTeam([hit, miss, noGoal]);
    const { squad, payments } = evaluateContractGoals(team, { 'P-hit': 14, 'P-miss': 6 });
    expect(payments).toEqual([{ playerName: 'P-hit', bonus: 500_000 }]);
    for (const p of squad) {
      expect(p.contractGoal).toBeUndefined();
    }
    expect(squad.find(p => p.id === 'hit')!.contractGoal).toBeUndefined();
  });

  it('sem metas no elenco, não há pagamento', () => {
    const team = makeTeam([makePlayer('a', 'DEF', 2, 2)]);
    const { squad, payments } = evaluateContractGoals(team, { 'P-a': 20 });
    expect(payments).toEqual([]);
    expect(squad.length).toBe(1);
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
