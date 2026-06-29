import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const TEAMS: Array<[string, string, string, string, number]> = [
  ['Inter Milan', 'INT', '#010E80', '#FFD700', 86],
  ['AC Milan', 'ACM', '#FB090B', '#000000', 84],
  ['Juventus', 'JUV', '#000000', '#FFFFFF', 84],
  ['Napoli', 'NAP', '#12A0D2', '#FFFFFF', 83],
  ['Atalanta', 'ATA', '#1C2A5E', '#FFFFFF', 82],
  ['Roma', 'ROM', '#9C142C', '#FFB612', 81],
  ['Lazio', 'LAZ', '#87CEEB', '#FFFFFF', 80],
  ['Fiorentina', 'FIO', '#5C2D91', '#FFFFFF', 79],
  ['Bologna', 'BOL', '#CE2939', '#0A1E47', 78],
  ['Torino', 'TOR', '#8B0000', '#FFFFFF', 77],
  ['Udinese', 'UDI', '#000000', '#FFFFFF', 76],
  ['Genoa', 'GEN', '#E60000', '#1C2A5E', 75],
  ['Monza', 'MON', '#E60000', '#FFFFFF', 75],
  ['Hellas Verona', 'HEL', '#004C97', '#FFFF00', 74],
  ['Lecce', 'LEC', '#FFD700', '#D50032', 73],
  ['Cagliari', 'CAG', '#003B73', '#D3212A', 73],
  ['Empoli', 'EMP', '#1E5AA0', '#FFFFFF', 72],
  ['Parma', 'PAR', '#FFD700', '#003399', 72],
  ['Como', 'COM', '#1E3A8A', '#FFFFFF', 70],
  ['Venezia', 'VEN', '#F57C00', '#004D00', 69],
];

export const serieA: LeagueDefinition = {
  id: 'serieA',
  name: 'Serie A',
  country: 'Itália',
  flag: '🇮🇹',
  totalRounds: 38,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr]) =>
    generateTeam(`ita-${abbr.toLowerCase()}`, name, abbr, color, secColor, '', ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.9, defensiveLineMod: 1.05, tempoMod: 1.0, passingFocusMod: 1.0 },
  relegationSpots: 3,
};
