import { describe, it, expect } from 'vitest';
import type { Team, Player } from '@/engine/types';
import { calculateMarketValue, calculateWeeklyWage, assignMarketValues, computeWageBill, initialBudget, computeWeeklyIncome } from '../transferMarket';

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
