import type { Team, Player } from '@/engine/types';

/** Constrói um jogador da escala 1-99 usada nos elencos das ligas. */
export function p(
  id: string, name: string, number: number, pos: Player['position'],
  speed: number, stamina: number, passing: number, finishing: number,
  tackling: number, dribbling: number, vision: number, positioning: number
): Player {
  return { id, name, number, position: pos, attributes: { speed, stamina, passing, finishing, tackling, dribbling, vision, positioning }, currentFatigue: 0 };
}

/** Monta um time completo (XI + banco) com a tática padrão das ligas (4-3-3 posse). */
export function makeFullTeam(id: string, name: string, abbr: string, color: string, secondary: string, logoUrl: string, xi: Player[], bench: Player[]): Team {
  return {
    id, name, abbreviation: abbr, color, secondaryColor: secondary,
    logoUrl,
    squad: [...xi, ...bench],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}
