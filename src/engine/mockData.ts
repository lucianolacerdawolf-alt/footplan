// =============================================================================
// MOCK DATA - Times fictícios com 11 jogadores cada
// =============================================================================
// Escala de atributos: 1-99, onde 99 = elite mundial, 70+ = bom, 50+ = médio

import type { Team, Player } from './types';

// ---------------------------------------------------------------------------
// TIME A: ÁGUIAS DO VALE (4-3-3 ofensivo)
// ---------------------------------------------------------------------------
const aguiasSquad: Player[] = [
  {
    id: 'a-gk-1',
    name: 'Victor Muralha',
    number: 1,
    position: 'GK',
    attributes: { speed: 35, stamina: 70, passing: 45, finishing: 15, tackling: 20, dribbling: 25, vision: 55, positioning: 82 },
    currentFatigue: 0,
  },
  {
    id: 'a-def-2',
    name: 'Rafael Pedra',
    number: 2,
    position: 'DEF',
    attributes: { speed: 68, stamina: 75, passing: 60, finishing: 30, tackling: 78, dribbling: 50, vision: 55, positioning: 76 },
    currentFatigue: 0,
  },
  {
    id: 'a-def-3',
    name: 'Lucas Muralha',
    number: 3,
    position: 'DEF',
    attributes: { speed: 62, stamina: 72, passing: 55, finishing: 25, tackling: 82, dribbling: 45, vision: 50, positioning: 80 },
    currentFatigue: 0,
  },
  {
    id: 'a-def-4',
    name: 'Bruno Tanque',
    number: 4,
    position: 'DEF',
    attributes: { speed: 55, stamina: 78, passing: 58, finishing: 35, tackling: 85, dribbling: 40, vision: 52, positioning: 84 },
    currentFatigue: 0,
  },
  {
    id: 'a-def-6',
    name: 'Felipe Flecha',
    number: 6,
    position: 'DEF',
    attributes: { speed: 78, stamina: 80, passing: 65, finishing: 40, tackling: 68, dribbling: 62, vision: 58, positioning: 70 },
    currentFatigue: 0,
  },
  {
    id: 'a-mid-5',
    name: 'André Maestro',
    number: 5,
    position: 'MID',
    attributes: { speed: 60, stamina: 82, passing: 88, finishing: 45, tackling: 55, dribbling: 72, vision: 90, positioning: 68 },
    currentFatigue: 0,
  },
  {
    id: 'a-mid-8',
    name: 'Carlos Motor',
    number: 8,
    position: 'MID',
    attributes: { speed: 72, stamina: 85, passing: 78, finishing: 60, tackling: 62, dribbling: 68, vision: 80, positioning: 65 },
    currentFatigue: 0,
  },
  {
    id: 'a-mid-10',
    name: 'Zeca Mágico',
    number: 10,
    position: 'MID',
    attributes: { speed: 75, stamina: 78, passing: 85, finishing: 68, tackling: 40, dribbling: 88, vision: 92, positioning: 70 },
    currentFatigue: 0,
  },
  {
    id: 'a-fwd-7',
    name: 'Ronaldinho Speed',
    number: 7,
    position: 'FWD',
    attributes: { speed: 92, stamina: 76, passing: 65, finishing: 82, tackling: 25, dribbling: 90, vision: 72, positioning: 78 },
    currentFatigue: 0,
  },
  {
    id: 'a-fwd-9',
    name: 'Hugo Matador',
    number: 9,
    position: 'FWD',
    attributes: { speed: 78, stamina: 80, passing: 55, finishing: 90, tackling: 20, dribbling: 65, vision: 60, positioning: 88 },
    currentFatigue: 0,
  },
  {
    id: 'a-fwd-11',
    name: 'Léo Drible',
    number: 11,
    position: 'FWD',
    attributes: { speed: 88, stamina: 74, passing: 62, finishing: 75, tackling: 22, dribbling: 92, vision: 68, positioning: 72 },
    currentFatigue: 0,
  },
];

// ---------------------------------------------------------------------------
// TIME B: LEÕES DA SERRA (4-4-2 sólido)
// ---------------------------------------------------------------------------
const leoesSquad: Player[] = [
  {
    id: 'b-gk-1',
    name: 'Cássio Paredão',
    number: 1,
    position: 'GK',
    attributes: { speed: 32, stamina: 75, passing: 40, finishing: 12, tackling: 18, dribbling: 20, vision: 50, positioning: 88 },
    currentFatigue: 0,
  },
  {
    id: 'b-def-2',
    name: 'Rômulo Ferro',
    number: 2,
    position: 'DEF',
    attributes: { speed: 72, stamina: 80, passing: 62, finishing: 28, tackling: 82, dribbling: 55, vision: 58, positioning: 80 },
    currentFatigue: 0,
  },
  {
    id: 'b-def-3',
    name: 'Gustavo Rocha',
    number: 3,
    position: 'DEF',
    attributes: { speed: 60, stamina: 78, passing: 55, finishing: 30, tackling: 86, dribbling: 42, vision: 52, positioning: 85 },
    currentFatigue: 0,
  },
  {
    id: 'b-def-4',
    name: 'Thiago Muro',
    number: 4,
    position: 'DEF',
    attributes: { speed: 58, stamina: 82, passing: 58, finishing: 32, tackling: 88, dribbling: 38, vision: 54, positioning: 87 },
    currentFatigue: 0,
  },
  {
    id: 'b-def-6',
    name: 'Eduardo Lança',
    number: 6,
    position: 'DEF',
    attributes: { speed: 70, stamina: 76, passing: 68, finishing: 42, tackling: 72, dribbling: 60, vision: 62, positioning: 74 },
    currentFatigue: 0,
  },
  {
    id: 'b-mid-5',
    name: 'Paulo Régua',
    number: 5,
    position: 'MID',
    attributes: { speed: 58, stamina: 85, passing: 82, finishing: 48, tackling: 75, dribbling: 55, vision: 78, positioning: 72 },
    currentFatigue: 0,
  },
  {
    id: 'b-mid-8',
    name: 'Márcio Raça',
    number: 8,
    position: 'MID',
    attributes: { speed: 65, stamina: 88, passing: 72, finishing: 52, tackling: 80, dribbling: 58, vision: 70, positioning: 74 },
    currentFatigue: 0,
  },
  {
    id: 'b-mid-7',
    name: 'Pedrinho Habilidade',
    number: 7,
    position: 'MID',
    attributes: { speed: 78, stamina: 74, passing: 80, finishing: 62, tackling: 45, dribbling: 82, vision: 76, positioning: 62 },
    currentFatigue: 0,
  },
  {
    id: 'b-mid-11',
    name: 'Zezinho Veloz',
    number: 11,
    position: 'MID',
    attributes: { speed: 85, stamina: 76, passing: 70, finishing: 58, tackling: 42, dribbling: 78, vision: 68, positioning: 60 },
    currentFatigue: 0,
  },
  {
    id: 'b-fwd-9',
    name: 'Diego Artilheiro',
    number: 9,
    position: 'FWD',
    attributes: { speed: 82, stamina: 78, passing: 52, finishing: 88, tackling: 18, dribbling: 70, vision: 62, positioning: 85 },
    currentFatigue: 0,
  },
  {
    id: 'b-fwd-10',
    name: 'Nico Oportunista',
    number: 10,
    position: 'FWD',
    attributes: { speed: 80, stamina: 75, passing: 60, finishing: 84, tackling: 20, dribbling: 75, vision: 72, positioning: 82 },
    currentFatigue: 0,
  },
];

// ---------------------------------------------------------------------------
// Times montados
// ---------------------------------------------------------------------------
export const timeAguias: Team = {
  id: 'aguias',
  name: 'Águias do Vale',
  abbreviation: 'AGV',
  color: '#2563eb',
  secondaryColor: '#facc15',
  squad: aguiasSquad,
  strategy: {
    formation: '4-3-3',
    mentality: 'possession',
    intensity: 'medium',
  },
};

export const timeLeoes: Team = {
  id: 'leoes',
  name: 'Leões da Serra',
  abbreviation: 'LEO',
  color: '#dc2626',
  secondaryColor: '#ffffff',
  squad: leoesSquad,
  strategy: {
    formation: '4-4-2',
    mentality: 'counter-attack',
    intensity: 'medium',
  },
};

/** Retorna uma cópia profunda do time (jogadores resetados) */
export function cloneTeam(team: Team): Team {
  return {
    ...team,
    squad: team.squad.map(p => ({ ...p, attributes: { ...p.attributes }, currentFatigue: 0 })),
  };
}
