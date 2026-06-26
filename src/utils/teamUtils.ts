import type { Team } from '../engine/types';

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
