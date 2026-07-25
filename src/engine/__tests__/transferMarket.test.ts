import { describe, it, expect } from 'vitest';
import type { Team, Player } from '@/engine/types';
import {
  calculateMarketValue, calculateWeeklyWage, assignMarketValues, computeWageBill, initialBudget, computeWeeklyIncome, evaluateCashTransfer,
  netSellRevenue, getLeaguePrizeMoney, getCupPrizeMoney, getTicketRevenue,
} from '../transferMarket';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Jogador', number: 9, position: 'MID', currentFatigue: 0,
    attributes: { speed: 80, stamina: 80, passing: 80, finishing: 80, tackling: 80, dribbling: 80, vision: 80, positioning: 80 },
    age: 25,
    ...overrides,
  };
}

function makeTeam(squad: Player[]): Team {
  return {
    id: 't1', name: 'Team', abbreviation: 'TST', color: '#111', secondaryColor: '#222', logoUrl: '',
    squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('calculateMarketValue', () => {
  it('jogadores mais jovens valem mais que veteranos com o mesmo OVR', () => {
    const young = calculateMarketValue(makePlayer({ age: 20 }));
    const veteran = calculateMarketValue(makePlayer({ age: 34 }));
    expect(young).toBeGreaterThan(veteran);
  });

  it('atacante vale mais que zagueiro com atributos equivalentes; goleiro vale menos', () => {
    const fwd = calculateMarketValue(makePlayer({ position: 'FWD' }));
    const def = calculateMarketValue(makePlayer({ position: 'DEF' }));
    const gk = calculateMarketValue(makePlayer({ position: 'GK' }));
    expect(fwd).toBeGreaterThan(def);
    expect(gk).toBeLessThan(def);
  });

  it('sem idade definida, usa 26 anos como padrão', () => {
    const withDefault = calculateMarketValue(makePlayer({ age: undefined }));
    const explicit26 = calculateMarketValue(makePlayer({ age: 26 }));
    expect(withDefault).toBe(explicit26);
  });

  it('nunca é negativo', () => {
    const weak = calculateMarketValue(makePlayer({
      age: 39,
      attributes: { speed: 1, stamina: 1, passing: 1, finishing: 1, tackling: 1, dribbling: 1, vision: 1, positioning: 1 },
    }));
    expect(weak).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateWeeklyWage', () => {
  it('escala com o valor de mercado e nunca é negativo', () => {
    expect(calculateWeeklyWage(0)).toBe(0);
    expect(calculateWeeklyWage(10_000_000)).toBeGreaterThan(calculateWeeklyWage(1_000_000));
  });
});

describe('assignMarketValues / computeWageBill', () => {
  it('preenche marketValue e weeklyWage em todo o elenco e soma a folha salarial', () => {
    const team = makeTeam([makePlayer({ id: 'a' }), makePlayer({ id: 'b', age: 20 })]);
    const valued = assignMarketValues(team);

    expect(valued.squad.every(p => typeof p.marketValue === 'number' && p.marketValue > 0)).toBe(true);
    expect(valued.squad.every(p => typeof p.weeklyWage === 'number' && p.weeklyWage! > 0)).toBe(true);

    const wageBill = computeWageBill(valued);
    const expected = valued.squad.reduce((sum, p) => sum + (p.weeklyWage ?? 0), 0);
    expect(wageBill).toBe(expected);
  });

  it('computeWageBill de um time sem weeklyWage atribuído é 0, não NaN', () => {
    const team = makeTeam([makePlayer()]);
    expect(computeWageBill(team)).toBe(0);
  });
});

describe('evaluateCashTransfer', () => {
  it('aceita oferta >=150% do valor de mercado como irrecusável (premium-offer)', () => {
    const player = makePlayer();
    const mv = calculateMarketValue(player);
    const res = evaluateCashTransfer(player, Math.ceil(mv * 1.5), false);
    expect(res).toEqual({ accepted: true, reason: 'premium-offer' });
  });

  it('aceita oferta >=85% do valor de mercado (value-met)', () => {
    const player = makePlayer();
    const mv = calculateMarketValue(player);
    const res = evaluateCashTransfer(player, Math.ceil(mv * 0.85), false);
    expect(res).toEqual({ accepted: true, reason: 'value-met' });
  });

  it('recusa oferta abaixo de 85% quando o vendedor não precisa do jogador', () => {
    const player = makePlayer();
    const mv = calculateMarketValue(player);
    const res = evaluateCashTransfer(player, Math.floor(mv * 0.84), false);
    expect(res).toEqual({ accepted: false, reason: 'too-low' });
  });

  it('com sellerNeedsPlayer, reavalia com limiar 30% maior (85%*1.3 = 110.5% do valor)', () => {
    const player = makePlayer();
    const mv = calculateMarketValue(player);
    // 100% do valor passaria no limiar normal (85%) mas não no limiar de escassez (110.5%)
    const belowMarkup = evaluateCashTransfer(player, Math.ceil(mv * 1.0), true);
    expect(belowMarkup).toEqual({ accepted: false, reason: 'too-low' });

    const aboveMarkup = evaluateCashTransfer(player, Math.ceil(mv * 0.85 * 1.3), true);
    expect(aboveMarkup).toEqual({ accepted: true, reason: 'value-met' });
  });

  it('sem sellerNeedsPlayer, a mesma oferta "aboveMarkup" já seria aceita normalmente (>=85%)', () => {
    const player = makePlayer();
    const mv = calculateMarketValue(player);
    const res = evaluateCashTransfer(player, Math.ceil(mv * 0.85 * 1.3), false);
    expect(res.accepted).toBe(true);
  });
});

describe('initialBudget / computeWeeklyIncome', () => {
  it('ligas conhecidas têm orçamentos diferentes; liga desconhecida cai no padrão', () => {
    expect(initialBudget('pl')).toBeGreaterThan(initialBudget('ligaPortugal'));
    expect(initialBudget('liga-inexistente')).toBe(20_000_000);
  });

  it('renda semanal é proporcional ao orçamento inicial da liga', () => {
    expect(computeWeeklyIncome('pl')).toBeGreaterThan(computeWeeklyIncome('ligaPortugal'));
    expect(computeWeeklyIncome('pl')).toBeGreaterThan(0);
  });
});

describe('netSellRevenue (Board Strictness)', () => {
  it('retém 20% — credita exatamente 80% do valor bruto, arredondado', () => {
    expect(netSellRevenue(10_000_000)).toBe(8_000_000);
    expect(netSellRevenue(1_000_001)).toBe(Math.round(1_000_001 * 0.8));
  });

  it('zero permanece zero', () => {
    expect(netSellRevenue(0)).toBe(0);
  });
});

describe('getLeaguePrizeMoney / getCupPrizeMoney', () => {
  it('1º lugar na PL vale mais que 1º lugar na Liga Portugal', () => {
    expect(getLeaguePrizeMoney('pl', 1)).toBeGreaterThan(getLeaguePrizeMoney('ligaPortugal', 1));
    expect(getLeaguePrizeMoney('pl', 1)).toBe(8_000_000);
  });

  it('colocação pior na liga vale menos', () => {
    expect(getLeaguePrizeMoney('pl', 1)).toBeGreaterThan(getLeaguePrizeMoney('pl', 6));
  });

  it('liga desconhecida ou posição fora da tabela (7+) retorna 0', () => {
    expect(getLeaguePrizeMoney('liga-inexistente', 1)).toBe(0);
    expect(getLeaguePrizeMoney('pl', 7)).toBe(0);
  });

  it('campeão da copa vale mais que vice, que vale mais que semifinalista', () => {
    const champion = getCupPrizeMoney('pl', 'champion');
    const runnerUp = getCupPrizeMoney('pl', 'runner-up');
    const semifinal = getCupPrizeMoney('pl', 'semifinal');
    expect(champion).toBeGreaterThan(runnerUp);
    expect(runnerUp).toBeGreaterThan(semifinal);
  });

  it('resultado sem premiação (quarterfinal, roundOf16, not-played) retorna 0', () => {
    expect(getCupPrizeMoney('pl', 'quarterfinal')).toBe(0);
    expect(getCupPrizeMoney('pl', 'roundOf16')).toBe(0);
    expect(getCupPrizeMoney('pl', 'not-played')).toBe(0);
  });
});

describe('getTicketRevenue', () => {
  it('ligas maiores têm bilheteria maior; liga desconhecida cai no padrão de 200K', () => {
    expect(getTicketRevenue('pl')).toBe(800_000);
    expect(getTicketRevenue('pl')).toBeGreaterThan(getTicketRevenue('ligaPortugal'));
    expect(getTicketRevenue('liga-inexistente')).toBe(200_000);
  });
});
