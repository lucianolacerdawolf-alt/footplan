import type { Team } from '../engine/types';
import { playerOvr } from './playerOvr';
import { getStarterCount } from '../engine/squadUtils';

/** Cópia profunda de um time */
export function cloneTeam(team: Team, preserveFatigue = false): Team {
  return {
    ...team,
    squad: team.squad.map(p => ({
      ...p,
      attributes: { ...p.attributes },
      // contractGoal é objeto — sem clonar, mutação num time clonado vazava pro original
      // (mesma referência compartilhada entre o elenco "de trabalho" e o persistido).
      contractGoal: p.contractGoal ? { ...p.contractGoal } : undefined,
      currentFatigue: preserveFatigue ? p.currentFatigue : 0,
    })),
  };
}

export function getAvgOvr(team: Team): number {
  const starters = team.squad.slice(0, getStarterCount(team.strategy.formation));
  return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
}
