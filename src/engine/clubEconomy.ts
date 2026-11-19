// =============================================================================
// ECONOMIA DO CLUBE — receita proporcional ao tamanho, custos e teto salarial
// =============================================================================
// Antes: patrocínio, bilheteria e orçamento inicial eram iguais pra todos os clubes de
// uma liga, mas os salários dependiam do elenco. Resultado medido (scripts/economy-audit.ts):
// Sunderland +€36M por temporada sem contratar, Real Madrid −€9M, West Ham (Championship)
// quebrando em 3 temporadas. Agora a receita parte do tamanho do clube (a folha salarial
// com que ele começa): um clube equilibrado gasta ~60% da receita com salários, ~25% com
// estrutura e sobra pouco — o que faz diferença são prêmios, vendas e não estourar a folha.

import type { Player, Team } from './types';
import { calculateMarketValue, calculateWeeklyWage, computeWageBill, computeWeeklyIncome, initialBudget } from './transferMarket';
import { getSponsorMultiplier, getStartingTier, type SponsorTier } from './sponsors';

/** Salários / receita de um clube equilibrado (realista: 55–70%). */
export const WAGE_SHARE = 0.6;
/** Estrutura, funcionários, viagens… / receita. */
export const OPEX_SHARE = 0.25;
/** Teto da diretoria pra folha salarial / receita semanal. */
export const WAGE_CAP_SHARE = 0.75;
/** Patrocínio + TV por rodada / receita base; o resto vem da bilheteria. */
const SPONSOR_TV_SHARE = 0.75;
/** Bilheteria por jogo em casa / receita base (≈ metade dos jogos em casa → 0,25 por rodada). */
const TICKET_SHARE = 0.5;

/** Receita semanal base do clube (tamanho), a partir da folha com que ele começa. Piso de
 *  metade da renda padrão da liga pra elencos sem salário calculado. */
export function baseWeeklyRevenue(team: Team, leagueId: string): number {
  const wage = computeWageBill(team);
  const floor = Math.round(computeWeeklyIncome(leagueId) * 0.5);
  return Math.max(floor, Math.round(wage / WAGE_SHARE));
}

/** Quanto o patrocinador atual paga a mais/menos que o da largada (sobe com a reputação). */
function tierFactor(leagueId: string, tier: SponsorTier | undefined): number {
  const start = getSponsorMultiplier(getStartingTier(leagueId));
  return tier ? getSponsorMultiplier(tier) / start : 1;
}

export function sponsorTvPerRound(base: number, leagueId: string, tier?: SponsorTier): number {
  return Math.round(base * SPONSOR_TV_SHARE * tierFactor(leagueId, tier));
}

export function ticketPerHomeMatch(base: number): number {
  return Math.round(base * TICKET_SHARE);
}

export function operatingCostPerRound(base: number): number {
  return Math.round(base * OPEX_SHARE);
}

/** Teto semanal da folha definido pela diretoria (cresce com o patrocínio). */
export function wageCap(base: number, leagueId: string, tier?: SponsorTier): number {
  return Math.round(base * WAGE_CAP_SHARE * tierFactor(leagueId, tier));
}

/** Orçamento de transferências inicial: o padrão da liga ajustado ao tamanho do clube
 *  (entre 40% e 250% — o Sunderland não começa com o mesmo caixa do City). */
export function clubInitialBudget(team: Team, leagueTeams: Team[], leagueId: string): number {
  const bases = leagueTeams.map(t => baseWeeklyRevenue(t, leagueId)).sort((a, b) => a - b);
  const median = bases.length ? bases[Math.floor(bases.length / 2)] : baseWeeklyRevenue(team, leagueId);
  const ratio = Math.min(2.5, Math.max(0.4, baseWeeklyRevenue(team, leagueId) / Math.max(1, median)));
  return Math.round((initialBudget(leagueId) * ratio) / 100_000) * 100_000;
}

/** Jogador que entra no elenco sem salário (veio de outra liga, onde não foi calculado)
 *  ganha o salário do valor de mercado — antes entrava com salário ZERO. */
export function withWage(player: Player): Player {
  if (player.weeklyWage && player.weeklyWage > 0) return player;
  const marketValue = player.marketValue ?? calculateMarketValue(player);
  return { ...player, marketValue, weeklyWage: calculateWeeklyWage(marketValue) };
}

/** Saldo previsto de uma rodada (sem eventos): receitas − salários − estrutura. */
export function projectedRoundBalance(opts: { base: number; leagueId: string; tier?: SponsorTier; wageBill: number; merch?: number; homeMatch: boolean }): number {
  return sponsorTvPerRound(opts.base, opts.leagueId, opts.tier)
    + (opts.homeMatch ? ticketPerHomeMatch(opts.base) : 0)
    + (opts.merch ?? 0)
    - opts.wageBill
    - operatingCostPerRound(opts.base);
}

/** A nova folha passaria do teto da diretoria? (saves sem teto: nunca bloqueia) */
export function exceedsWageCap(finances: { wageCap?: number }, newWageBill: number): boolean {
  return !!finances.wageCap && newWageBill > finances.wageCap;
}
