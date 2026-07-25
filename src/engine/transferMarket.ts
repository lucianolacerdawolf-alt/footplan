import type { Player, Team } from './types';
import { playerOvr } from '../utils/playerOvr';

/** Valuation de mercado — jovens e atacantes valem mais, goleiros e veteranos valem menos. */
export function calculateMarketValue(player: Player): number {
  const age = player.age ?? 26;
  const baseOvr = playerOvr(player);
  const ageMultiplier = age <= 21 ? 1.5 : age <= 25 ? 1.3 : age <= 28 ? 1.1 : age <= 31 ? 0.9 : 0.6;
  const positionMultiplier = player.position === 'FWD' ? 1.2 : player.position === 'GK' ? 0.7 : 1.0;
  return Math.round(baseOvr * ageMultiplier * positionMultiplier * 50_000);
}

/** Salário semanal como fração do valor de mercado (referência: ~10% ao ano ÷ 52 semanas). */
export function calculateWeeklyWage(marketValue: number): number {
  return Math.round((marketValue * 0.002) / 100) * 100;
}

/** Preenche marketValue/weeklyWage em todo o elenco — chamado uma vez ao iniciar a carreira. */
export function assignMarketValues(team: Team): Team {
  return {
    ...team,
    squad: team.squad.map(p => {
      const marketValue = calculateMarketValue(p);
      return { ...p, marketValue, weeklyWage: calculateWeeklyWage(marketValue) };
    }),
  };
}

export function computeWageBill(team: Team): number {
  return team.squad.reduce((sum, p) => sum + (p.weeklyWage ?? 0), 0);
}

const INITIAL_BUDGET_BY_LEAGUE: Record<string, number> = {
  pl: 45_000_000,
  laliga: 40_000_000,
  serieA: 35_000_000,
  bundesliga: 35_000_000,
  ligue1: 25_000_000,
  ligaPortugal: 15_000_000,
};

export function initialBudget(leagueId: string): number {
  return INITIAL_BUDGET_BY_LEAGUE[leagueId] ?? 20_000_000;
}

/** Renda semanal (bilheteria + patrocínio) — proporcional ao tamanho do orçamento inicial da liga. */
export function computeWeeklyIncome(leagueId: string): number {
  return Math.round(initialBudget(leagueId) * 0.01);
}
