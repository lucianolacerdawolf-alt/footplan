import type { Player, Team } from './types';
import { playerOvr } from '../utils/playerOvr';

/** Valuation de mercado — jovens e atacantes valem mais, goleiros e veteranos valem menos.
 *  Escala exponencial pra refletir valores reais (~Transfermarkt): OVR 60 ≈ €170K, 70 ≈ €1.5M, 80 ≈ €16M, 90 ≈ €170M. */
export function calculateMarketValue(player: Player): number {
  const age = player.age ?? 26;
  const baseOvr = playerOvr(player);
  const ageMultiplier = age <= 21 ? 1.5 : age <= 25 ? 1.3 : age <= 28 ? 1.1 : age <= 31 ? 0.9 : 0.6;
  const positionMultiplier = player.position === 'FWD' ? 1.2 : player.position === 'GK' ? 0.6 : 1.0;
  const baseValue = 20000 * Math.pow(1.24, baseOvr - 50);
  return Math.round(baseValue * ageMultiplier * positionMultiplier);
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
  championship: 8_000_000,
  laliga2: 6_000_000,
  bundesliga2: 6_500_000,
  serieB: 5_000_000,
  ligue2: 4_000_000,
  ligaPortugal2: 2_500_000,
};

export function initialBudget(leagueId: string): number {
  return INITIAL_BUDGET_BY_LEAGUE[leagueId] ?? 20_000_000;
}

/** Renda semanal (bilheteria + patrocínio) — proporcional ao tamanho do orçamento inicial da liga. */
export function computeWeeklyIncome(leagueId: string): number {
  return Math.round(initialBudget(leagueId) * 0.01);
}

/**
 * Avalia se um clube CPU aceita uma oferta em dinheiro por um jogador — determinística
 * (limiares fixos, sem sorteio): oferta ≥150% do valor de mercado é irrecusável; ≥85%
 * é aceita; se o vendedor tem pouca profundidade na posição (≤2 jogadores), o limiar
 * sobe 30% antes de reavaliar.
 */
export function evaluateCashTransfer(
  player: Player,
  offeredAmount: number,
  sellerNeedsPlayer: boolean,
): { accepted: boolean; reason: string } {
  const marketValue = calculateMarketValue(player);
  const premium = marketValue * 1.5;
  if (offeredAmount >= premium) return { accepted: true, reason: 'premium-offer' };

  // Vendedor com pouca profundidade na posição exige um limiar 30% mais alto
  // (110.5% do valor em vez de 85%) antes mesmo de aceitar — não é uma segunda
  // checagem depois do limiar normal, senão nunca seria alcançável.
  const minAccept = marketValue * 0.85 * (sellerNeedsPlayer ? 1.3 : 1);
  if (offeredAmount >= minAccept) return { accepted: true, reason: 'value-met' };

  return { accepted: false, reason: 'too-low' };
}

/** Board Strictness (EA FC): a diretoria retém 20% do valor de toda venda de jogador. */
const BOARD_RETENTION = 0.80;

export function netSellRevenue(amount: number): number {
  return Math.round(amount * BOARD_RETENTION);
}

/** Premiação de fim de temporada por colocação na liga e resultado na copa, por liga. */
const PRIZE_MONEY: Record<string, { league: Record<number, number>; cup: Record<string, number> }> = {
  pl: { league: { 1: 8_000_000, 2: 5_000_000, 3: 3_500_000, 4: 2_500_000, 5: 1_500_000, 6: 1_000_000 }, cup: { champion: 2_000_000, 'runner-up': 1_200_000, semifinal: 600_000 } },
  laliga: { league: { 1: 7_000_000, 2: 4_500_000, 3: 3_000_000, 4: 2_000_000, 5: 1_200_000, 6: 800_000 }, cup: { champion: 1_500_000, 'runner-up': 1_000_000, semifinal: 500_000 } },
  serieA: { league: { 1: 6_000_000, 2: 4_000_000, 3: 2_800_000, 4: 1_800_000, 5: 1_000_000, 6: 700_000 }, cup: { champion: 1_200_000, 'runner-up': 800_000, semifinal: 400_000 } },
  bundesliga: { league: { 1: 6_500_000, 2: 4_200_000, 3: 3_000_000, 4: 2_000_000, 5: 1_200_000, 6: 800_000 }, cup: { champion: 1_500_000, 'runner-up': 1_000_000, semifinal: 500_000 } },
  ligue1: { league: { 1: 5_000_000, 2: 3_000_000, 3: 2_000_000, 4: 1_500_000, 5: 800_000, 6: 500_000 }, cup: { champion: 1_000_000, 'runner-up': 700_000, semifinal: 350_000 } },
  ligaPortugal: { league: { 1: 2_500_000, 2: 1_500_000, 3: 1_000_000, 4: 700_000, 5: 400_000, 6: 250_000 }, cup: { champion: 500_000, 'runner-up': 300_000, semifinal: 150_000 } },
  championship: { league: { 1: 2_000_000, 2: 1_200_000, 3: 800_000, 4: 500_000, 5: 300_000, 6: 200_000 }, cup: { champion: 500_000, 'runner-up': 300_000, semifinal: 150_000 } },
  laliga2: { league: { 1: 1_500_000, 2: 1_000_000, 3: 600_000, 4: 400_000, 5: 200_000, 6: 150_000 }, cup: { champion: 400_000, 'runner-up': 200_000, semifinal: 100_000 } },
  bundesliga2: { league: { 1: 1_500_000, 2: 1_000_000, 3: 600_000, 4: 400_000, 5: 200_000, 6: 150_000 }, cup: { champion: 400_000, 'runner-up': 200_000, semifinal: 100_000 } },
  serieB: { league: { 1: 1_200_000, 2: 800_000, 3: 500_000, 4: 300_000, 5: 200_000, 6: 100_000 }, cup: { champion: 300_000, 'runner-up': 150_000, semifinal: 80_000 } },
  ligue2: { league: { 1: 1_000_000, 2: 600_000, 3: 400_000, 4: 250_000, 5: 150_000, 6: 100_000 }, cup: { champion: 250_000, 'runner-up': 150_000, semifinal: 80_000 } },
  ligaPortugal2: { league: { 1: 500_000, 2: 300_000, 3: 200_000, 4: 150_000, 5: 100_000, 6: 50_000 }, cup: { champion: 150_000, 'runner-up': 80_000, semifinal: 40_000 } },
};

export function getLeaguePrizeMoney(leagueId: string, position: number): number {
  return PRIZE_MONEY[leagueId]?.league[position] ?? 0;
}

export function getCupPrizeMoney(leagueId: string, cupResult: string): number {
  return PRIZE_MONEY[leagueId]?.cup[cupResult] ?? 0;
}

/** Bilheteria por jogo em casa (liga ou copa), creditada ao avançar rodada/estágio. */
const TICKET_REVENUE_PER_HOME_MATCH: Record<string, number> = {
  pl: 800_000, laliga: 700_000, serieA: 500_000,
  bundesliga: 600_000, ligue1: 400_000, ligaPortugal: 200_000,
  championship: 150_000, laliga2: 100_000, bundesliga2: 120_000,
  serieB: 80_000, ligue2: 70_000, ligaPortugal2: 40_000,
};

export function getTicketRevenue(leagueId: string): number {
  return TICKET_REVENUE_PER_HOME_MATCH[leagueId] ?? 200_000;
}
