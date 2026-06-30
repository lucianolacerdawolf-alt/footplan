import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const espn = (id: number) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

const TEAMS: Array<[string, string, string, string, number, string]> = [
  ['Real Madrid',       'RMA', '#FEBE10', '#00529F', 88, espn(86)],
  ['Barcelona',         'FCB', '#A50044', '#004D98', 86, espn(83)],
  ['Atlético Madrid',   'ATM', '#CB3524', '#27336C', 84, espn(1068)],
  ['Real Sociedad',     'RSO', '#0B67C6', '#FFFFFF', 80, espn(14865)],
  ['Athletic Bilbao',   'ATH', '#EE2523', '#FFFFFF', 79, espn(3842)],
  ['Villarreal',        'VIL', '#FFE500', '#005187', 78, espn(4079)],
  ['Real Betis',        'BET', '#0A8C3E', '#FFFFFF', 78, espn(4076)],
  ['Sevilla',           'SEV', '#D50418', '#FFFFFF', 77, espn(243)],
  ['Valencia',          'VAL', '#F8E250', '#EE3B33', 76, espn(4599)],
  ['Girona',            'GIR', '#DA251D', '#FFFFFF', 76, espn(9812)],
  ['Celta Vigo',        'CEL', '#87CEEB', '#FFFFFF', 75, espn(9814)],
  ['Osasuna',           'OSA', '#AC142C', '#0A3463', 74, espn(4598)],
  ['Getafe',            'GET', '#004B9A', '#FFFFFF', 73, espn(9816)],
  ['Mallorca',          'MAL', '#DD0000', '#FFDE00', 73, espn(4080)],
  ['Rayo Vallecano',    'RAY', '#D0122C', '#FFFFFF', 72, espn(3881)],
  ['Alavés',            'ALA', '#004B9A', '#FFFFFF', 71, espn(10840)],
  ['Las Palmas',        'LPA', '#FFDE00', '#004A9B', 70, espn(8773)],
  ['Espanyol',          'ESP', '#2167B0', '#FFFFFF', 70, espn(3836)],
  ['Valladolid',        'VLL', '#7B2D8E', '#FFFFFF', 69, ''],
  ['Leganés',           'LEG', '#007940', '#FFFFFF', 68, ''],
];

export const laLiga: LeagueDefinition = {
  id: 'laliga',
  name: 'La Liga',
  country: 'Espanha',
  cupName: 'Copa del Rey',
  flag: '🇪🇸',
  color: '#ff4d4d',
  totalRounds: 38,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr, logo]) =>
    generateTeam(`lal-${abbr.toLowerCase()}`, name, abbr, color, secColor, logo, ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.95, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.05 },
  relegationSpots: 3,
};
