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
      currentFatigue: preserveFatigue ? p.currentFatigue : 0,
    })),
  };
}

export function getAvgOvr(team: Team): number {
  const starters = team.squad.slice(0, getStarterCount(team.strategy.formation));
  return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
}
