import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const TEAMS: Array<[string, string, string, string, number]> = [
  ['Real Madrid', 'RMA', '#FEBE10', '#00529F', 88],
  ['Barcelona', 'FCB', '#A50044', '#004D98', 86],
  ['Atlético Madrid', 'ATM', '#CB3524', '#27336C', 84],
  ['Real Sociedad', 'RSO', '#0B67C6', '#FFFFFF', 80],
  ['Athletic Bilbao', 'ATH', '#EE2523', '#FFFFFF', 79],
  ['Villarreal', 'VIL', '#FFE500', '#005187', 78],
  ['Real Betis', 'BET', '#0A8C3E', '#FFFFFF', 78],
  ['Sevilla', 'SEV', '#D50418', '#FFFFFF', 77],
  ['Valencia', 'VAL', '#F8E250', '#EE3B33', 76],
  ['Girona', 'GIR', '#DA251D', '#FFFFFF', 76],
  ['Celta Vigo', 'CEL', '#87CEEB', '#FFFFFF', 75],
  ['Osasuna', 'OSA', '#AC142C', '#0A3463', 74],
  ['Getafe', 'GET', '#004B9A', '#FFFFFF', 73],
  ['Mallorca', 'MAL', '#DD0000', '#FFDE00', 73],
  ['Rayo Vallecano', 'RAY', '#D0122C', '#FFFFFF', 72],
  ['Alavés', 'ALA', '#004B9A', '#FFFFFF', 71],
  ['Las Palmas', 'LPA', '#FFDE00', '#004A9B', 70],
  ['Espanyol', 'ESP', '#2167B0', '#FFFFFF', 70],
  ['Valladolid', 'VLL', '#7B2D8E', '#FFFFFF', 69],
  ['Leganés', 'LEG', '#007940', '#FFFFFF', 68],
];

export const laLiga: LeagueDefinition = {
  id: 'laliga',
  name: 'La Liga',
  country: 'Espanha',
  flag: '🇪🇸',
  totalRounds: 38,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr]) =>
    generateTeam(`lal-${abbr.toLowerCase()}`, name, abbr, color, secColor, '', ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.95, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.05 },
  relegationSpots: 3,
};
