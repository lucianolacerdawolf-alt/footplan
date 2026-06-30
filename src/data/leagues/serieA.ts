import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const espn = (id: number) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

const TEAMS: Array<[string, string, string, string, number, string]> = [
  ['Inter Milan',    'INT', '#010E80', '#FFD700', 86, espn(110)],
  ['AC Milan',       'ACM', '#FB090B', '#000000', 84, espn(103)],
  ['Juventus',       'JUV', '#000000', '#FFFFFF', 84, espn(111)],
  ['Napoli',         'NAP', '#12A0D2', '#FFFFFF', 83, espn(4066)],
  ['Atalanta',       'ATA', '#1C2A5E', '#FFFFFF', 82, espn(4073)],
  ['Roma',           'ROM', '#9C142C', '#FFB612', 81, espn(104)],
  ['Lazio',          'LAZ', '#87CEEB', '#FFFFFF', 80, espn(4065)],
  ['Fiorentina',     'FIO', '#5C2D91', '#FFFFFF', 79, espn(4064)],
  ['Bologna',        'BOL', '#CE2939', '#0A1E47', 78, espn(4062)],
  ['Torino',         'TOR', '#8B0000', '#FFFFFF', 77, espn(4067)],
  ['Udinese',        'UDI', '#000000', '#FFFFFF', 76, espn(4068)],
  ['Genoa',          'GEN', '#E60000', '#1C2A5E', 75, espn(4063)],
  ['Monza',          'MON', '#E60000', '#FFFFFF', 75, ''],
  ['Hellas Verona',  'HEL', '#004C97', '#FFFF00', 74, espn(4070)],
  ['Lecce',          'LEC', '#FFD700', '#D50032', 73, ''],
  ['Cagliari',       'CAG', '#003B73', '#D3212A', 73, espn(4061)],
  ['Empoli',         'EMP', '#1E5AA0', '#FFFFFF', 72, ''],
  ['Parma',          'PAR', '#FFD700', '#003399', 72, espn(4069)],
  ['Como',           'COM', '#1E3A8A', '#FFFFFF', 70, ''],
  ['Venezia',        'VEN', '#F57C00', '#004D00', 69, ''],
];

export const serieA: LeagueDefinition = {
  id: 'serieA',
  name: 'Serie A',
  country: 'Itália',
  cupName: 'Coppa Italia',
  flag: '🇮🇹',
  color: '#004c97',
  totalRounds: 38,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr, logo]) =>
    generateTeam(`ser-${abbr.toLowerCase()}`, name, abbr, color, secColor, logo, ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.9, defensiveLineMod: 1.05, tempoMod: 0.95, passingFocusMod: 1.1 },
  relegationSpots: 3,
};
