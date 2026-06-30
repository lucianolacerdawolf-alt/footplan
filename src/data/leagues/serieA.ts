import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const espn = (id: number) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

const TEAMS: Array<[string, string, string, string, number, string]> = [
  ['Inter Milan',    'INT', '#010E80', '#FFD700', 86, 'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png'],
  ['AC Milan',       'ACM', '#FB090B', '#000000', 84, 'https://r2.thesportsdb.com/images/media/team/badge/wvspur1448806617.png'],
  ['Juventus',       'JUV', '#000000', '#FFFFFF', 84, 'https://r2.thesportsdb.com/images/media/team/badge/uxf0gr1742983727.png'],
  ['Napoli',         'NAP', '#12A0D2', '#FFFFFF', 83, espn(4066)],
  ['Atalanta',       'ATA', '#1C2A5E', '#FFFFFF', 82, 'https://r2.thesportsdb.com/images/media/team/badge/qix5ku1780561327.png'],
  ['Roma',           'ROM', '#9C142C', '#FFB612', 81, espn(104)],
  ['Lazio',          'LAZ', '#87CEEB', '#FFFFFF', 80, espn(4065)],
  ['Fiorentina',     'FIO', '#5C2D91', '#FFFFFF', 79, 'https://r2.thesportsdb.com/images/media/team/badge/hc8nhu1656098030.png'],
  ['Bologna',        'BOL', '#CE2939', '#0A1E47', 78, 'https://r2.thesportsdb.com/images/media/team/badge/2qi1u31655592366.png'],
  ['Torino',         'TOR', '#8B0000', '#FFFFFF', 77, espn(4067)],
  ['Udinese',        'UDI', '#000000', '#FFFFFF', 76, espn(4068)],
  ['Genoa',          'GEN', '#E60000', '#1C2A5E', 75, 'https://r2.thesportsdb.com/images/media/team/badge/52s8dn1655553600.png'],
  ['Monza',          'MON', '#E60000', '#FFFFFF', 75, 'https://r2.thesportsdb.com/images/media/team/badge/bxearg1603170113.png'],
  ['Hellas Verona',  'HEL', '#004C97', '#FFFF00', 74, espn(4070)],
  ['Lecce',          'LEC', '#FFD700', '#D50032', 73, 'https://r2.thesportsdb.com/images/media/team/badge/j4vznr1567365249.png'],
  ['Cagliari',       'CAG', '#003B73', '#D3212A', 73, 'https://r2.thesportsdb.com/images/media/team/badge/wvsvxt1447534471.png'],
  ['Empoli',         'EMP', '#1E5AA0', '#FFFFFF', 72, 'https://r2.thesportsdb.com/images/media/team/badge/c1ie6b1622561483.png'],
  ['Parma',          'PAR', '#FFD700', '#003399', 72, espn(4069)],
  ['Como',           'COM', '#1E3A8A', '#FFFFFF', 70, 'https://r2.thesportsdb.com/images/media/team/badge/02x81t1627405841.png'],
  ['Venezia',        'VEN', '#F57C00', '#004D00', 69, 'https://r2.thesportsdb.com/images/media/team/badge/vbiget1781026964.png'],
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
