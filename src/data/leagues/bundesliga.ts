import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const espn = (id: number) => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;

const TEAMS: Array<[string, string, string, string, number, string]> = [
  ['Bayern München',           'BAY', '#DC052D', '#0066B2', 87, espn(132)],
  ['Borussia Dortmund',        'BVB', '#FDE100', '#000000', 83, espn(124)],
  ['RB Leipzig',               'RBL', '#DD0741', '#FFFFFF', 82, espn(11420)],
  ['Bayer Leverkusen',         'B04', '#E32221', '#000000', 84, espn(3808)],
  ['Eintracht Frankfurt',      'SGE', '#E1000F', '#000000', 79, espn(3810)],
  ['VfB Stuttgart',            'VFB', '#E32221', '#FFFFFF', 79, espn(3815)],
  ['VfL Wolfsburg',            'WOB', '#65A832', '#FFFFFF', 78, espn(3819)],
  ['Borussia Mönchengladbach', 'BMG', '#000000', '#FFFFFF', 77, espn(3813)],
  ['SC Freiburg',              'SCF', '#CC0000', '#000000', 77, espn(3818)],
  ['TSG Hoffenheim',           'TSG', '#1C63B7', '#FFFFFF', 76, espn(3814)],
  ['Werder Bremen',            'SVW', '#1D9058', '#FFFFFF', 75, espn(3820)],
  ['FC Augsburg',              'FCA', '#BA3733', '#FFFFFF', 74, espn(3806)],
  ['Mainz 05',                 'M05', '#ED1C24', '#FFFFFF', 74, espn(3811)],
  ['Union Berlin',             'FCU', '#D4011D', '#FFFFFF', 74, ''],
  ['VfL Bochum',               'BOC', '#005CA9', '#FFFFFF', 72, ''],
  ['FC St. Pauli',             'STP', '#825840', '#FFFFFF', 71, ''],
  ['Holstein Kiel',            'KSV', '#0055A5', '#FFFFFF', 70, ''],
  ['FC Heidenheim',            'FCH', '#D20021', '#FFFFFF', 70, ''],
];

export const bundesliga: LeagueDefinition = {
  id: 'bundesliga',
  name: 'Bundesliga',
  country: 'Alemanha',
  cupName: 'DFB-Pokal',
  flag: '🇩🇪',
  color: '#e32221',
  totalRounds: 34,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr, logo]) =>
    generateTeam(`bun-${abbr.toLowerCase()}`, name, abbr, color, secColor, logo, ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 1.05, defensiveLineMod: 0.95, tempoMod: 1.1, passingFocusMod: 0.95 },
  relegationSpots: 3,
};
