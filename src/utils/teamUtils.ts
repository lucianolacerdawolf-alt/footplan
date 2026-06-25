import type { Team } from '../engine/types';

/** Cópia profunda de um time com cansaço dos jogadores zerado */
export function cloneTeam(team: Team): Team {
  return {
    ...team,
    squad: team.squad.map(p => ({ ...p, attributes: { ...p.attributes }, currentFatigue: 0 })),
  };
}
