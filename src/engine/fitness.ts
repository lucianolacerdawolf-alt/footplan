import type { Team } from './types';
import { getStarters } from './squadUtils';

// ~0.4 pts de fadiga por minuto, 90 minutos — mesma taxa usada como referência
// no motor de partida (matchHelpers.applyFatigue), aplicada aqui de forma simples
// pós-jogo já que o Map de fadiga por ciclo do MatchState não sai do motor.
const FATIGUE_PER_MATCH = 36;

/** Aplica o desgaste de uma partida completa aos titulares que jogaram (goleiro não cansa) */
export function applyMatchFatigue(team: Team): Team {
  const starterIds = new Set(getStarters(team).map(p => p.id));
  return {
    ...team,
    squad: team.squad.map(p =>
      starterIds.has(p.id) && p.position !== 'GK'
        ? { ...p, currentFatigue: Math.min(100, p.currentFatigue + FATIGUE_PER_MATCH) }
        : p
    ),
  };
}
