// =============================================================================
// HELPERS PUROS DO MATCH ENGINE
// =============================================================================
// Funções utilitárias usadas pelo motor que não dependem do MatchState.

import type { Team, Player, MatchEvent, Position, RandomFn, TeamStats } from './types';
import { FORMATION_COUNTS } from './constants';
import { INTENSITY_FATIGUE, MENTALITY_MODIFIERS } from './matchConfig';

/** Aplica redução por fadiga (0-100): cada 100% de fadiga = 50% do atributo. */
export function effective(attr: number, fatigue: number): number {
  return attr * (1 - fatigue / 200);
}

export function getPlayersByPosition(players: Player[], pos: Position): Player[] {
  return players.filter(p => p.position === pos);
}

export function getGoalkeeper(players: Player[]): Player {
  return players.find(p => p.position === 'GK')!;
}

export function pickRandom<T>(arr: T[], count: number, random: RandomFn): T[] {
  const shuffled = [...arr].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

/** Helper pra gerar números no intervalo [min, max). */
export const makeRng = (random: RandomFn) => (min: number, max: number) => min + random() * (max - min);

/**
 * Retorna os titulares de um time conforme a formação,
 * filtrando jogadores expulsos (cards.get(id) === 'red').
 */
export function getStarters(team: Team, cards?: Map<string, 'yellow' | 'red'>, injured?: Set<string>): Player[] {
  const counts = FORMATION_COUNTS[team.strategy.formation] ?? { DEF: 4, MID: 3, FWD: 3 };
  const starters: Player[] = [];
  const active = (p: Player) => (!cards || cards.get(p.id) !== 'red') && (!injured || !injured.has(p.id));
  const gk = getPlayersByPosition(team.squad, 'GK').filter(active);
  starters.push(...gk.slice(0, 1));
  for (const pos of ['DEF', 'MID', 'FWD'] as const) {
    const players = getPlayersByPosition(team.squad, pos).filter(active);
    starters.push(...players.slice(0, counts[pos] ?? 3));
  }
  return starters;
}

/** Computa estatísticas de um time a partir da lista de eventos da partida. */
export function computeStats(events: MatchEvent[], teamId: string, opponentId: string): TeamStats {
  let shots = 0, shotsOnTarget = 0, fouls = 0, yellowCards = 0, redCards = 0;
  for (const e of events) {
    if ((e.type === 'goal' || e.type === 'miss' || e.type === 'post') && e.teamId === teamId) shots++;
    if (e.type === 'save' && e.teamId === opponentId) { shots++; shotsOnTarget++; }
    if (e.type === 'goal' && e.teamId === teamId) shotsOnTarget++;
    if (e.type === 'foul' && e.teamId === opponentId) fouls++;
    if (e.type === 'yellowCard' && e.teamId === teamId) yellowCards++;
    if (e.type === 'redCard' && e.teamId === teamId) redCards++;
  }
  return { shots, shotsOnTarget, fouls, yellowCards, redCards };
}

export function applyFatigue(team: Team, fatigueMap: Map<string, number>, cards: Map<string, 'yellow' | 'red'>): void {
  const baseFatigue = INTENSITY_FATIGUE[team.strategy.intensity];
  const mod = MENTALITY_MODIFIERS[team.strategy.mentality];
  for (const player of getStarters(team, cards)) {
    if (player.position === 'GK') continue;
    const fatigueGain = baseFatigue * mod.staminaLossMultiplier * (1 - player.attributes.stamina / 200);
    const current = fatigueMap.get(player.id) ?? 0;
    fatigueMap.set(player.id, Math.min(100, current + fatigueGain));
  }
}
