import type { Team } from '../engine/types';
import { playerOvr } from './playerOvr';

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
  const starters = team.squad.slice(0, 11);
  return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
}
