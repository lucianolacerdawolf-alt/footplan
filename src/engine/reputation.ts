import type { Team } from './types';
import { getAvgOvr } from '../utils/teamUtils';

// =============================================================================
// REPUTAÇÃO INICIAL — o técnico chega com o peso do clube que assume
// =============================================================================
// Antes todo técnico começava em 0, até assumindo o Arsenal. Agora o ponto de partida
// vem do tamanho do clube DENTRO da liga (posição no ranking de força) e do peso da
// liga. Ganhar/perder reputação continua igual (títulos, diretoria, demissão…).

/** Peso de cada liga (1 = Premier League). Segundas divisões pesam menos da metade. */
const LEAGUE_WEIGHT: Record<string, number> = {
  pl: 1, laliga: 0.95, bundesliga: 0.9, serieA: 0.9, ligue1: 0.8, ligaPortugal: 0.65,
  championship: 0.45, laliga2: 0.4, bundesliga2: 0.4, serieB: 0.4, ligue2: 0.35, ligaPortugal2: 0.3,
};

/** Tamanho do clube na liga: 100 = o mais forte, 0 = o mais fraco. */
export function clubStatureIn(team: Team, leagueTeams: Team[]): number {
  const ranked = [...leagueTeams].sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
  const idx = ranked.findIndex(t => t.id === team.id);
  if (idx < 0 || ranked.length < 2) return 50;
  return Math.round(((ranked.length - 1 - idx) / (ranked.length - 1)) * 100);
}

/**
 * Reputação de quem assume o clube: 15 + 15 × peso da liga + 30 × peso × tamanho do clube.
 * Ninguém começa do zero: lanterna da Premier 30, meio da Premier 45, maior da Premier 60;
 * segundas divisões vão de ~20 (lanterna) a ~35 (maior).
 */
export function initialReputation(team: Team, leagueTeams: Team[], leagueId: string): number {
  const weight = LEAGUE_WEIGHT[leagueId] ?? 0.5;
  return Math.round(15 + 15 * weight + 30 * weight * (clubStatureIn(team, leagueTeams) / 100));
}

/** Versão da regra de reputação inicial — saves ajustados com uma versão anterior são
 *  reajustados uma vez (só pra cima). v1: 5–60; v2 (20/11): lanternas começam em 20–30. */
export const REPUTATION_SEED_VERSION = 2;

/** Ao trocar de clube: a reputação não cai, mas um clube maior empurra até 80% do patamar dele. */
export function reputationAfterMove(current: number, newClubInitial: number): number {
  return Math.max(current, Math.round(newClubInitial * 0.8));
}
