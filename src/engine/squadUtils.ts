import type { Team, Player, Formation } from './types';
import { FORMATION_COUNTS } from './constants';

/** Quantos titulares uma formação usa (sempre 1 GK + linhas da formação) */
export function getStarterCount(formation: Formation): number {
  const c = FORMATION_COUNTS[formation];
  return 1 + c.DEF + c.MID + c.FWD;
}

export function getStarters(team: Team): Player[] {
  return team.squad.slice(0, getStarterCount(team.strategy.formation));
}

export function getBench(team: Team): Player[] {
  return team.squad.slice(getStarterCount(team.strategy.formation));
}

/** Troca dois jogadores de posição no array (fonte de verdade da escalação) */
export function swapSquadPlayers(team: Team, idxA: number, idxB: number): Team {
  const squad = [...team.squad];
  [squad[idxA], squad[idxB]] = [squad[idxB], squad[idxA]];
  return { ...team, squad };
}

/** Suspenso ou lesionado — não pode ser escalado como titular */
export function isPlayerUnavailable(p: Player): boolean {
  return !!p.isSuspended || !!(p.injuredRounds && p.injuredRounds > 0);
}

/** Disponíveis primeiro (ordem original preservada em cada grupo) — evita que a
 * troca de formação puxe um suspenso/lesionado pro time titular quando a nova
 * formação precisa de mais jogadores numa posição. */
function availableFirst(players: Player[]): Player[] {
  const available = players.filter(p => !isPlayerUnavailable(p));
  const unavailable = players.filter(isPlayerUnavailable);
  return [...available, ...unavailable];
}

/** Reorganiza titulares/reservas pra bater com uma nova formação, preservando quem já é titular quando possível */
export function rebalanceForFormation(team: Team, formation: Formation): Team {
  const counts = FORMATION_COUNTS[formation];
  const squad = [...team.squad];
  const gk = availableFirst(squad.filter(p => p.position === 'GK'));
  const defs = availableFirst(squad.filter(p => p.position === 'DEF'));
  const mids = availableFirst(squad.filter(p => p.position === 'MID'));
  const fwds = availableFirst(squad.filter(p => p.position === 'FWD'));
  const starters = [
    ...gk.slice(0, 1),
    ...defs.slice(0, counts.DEF),
    ...mids.slice(0, counts.MID),
    ...fwds.slice(0, counts.FWD),
  ];
  const bench = [
    ...gk.slice(1),
    ...defs.slice(counts.DEF),
    ...mids.slice(counts.MID),
    ...fwds.slice(counts.FWD),
  ];
  return { ...team, squad: [...starters, ...bench], strategy: { ...team.strategy, formation } };
}
