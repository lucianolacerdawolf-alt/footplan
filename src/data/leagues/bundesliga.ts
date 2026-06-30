import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const TEAMS: Array<[string, string, string, string, number, string]> = [
  ['Bayern München',           'BAY', '#DC052D', '#0066B2', 87, 'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png'],
  ['Borussia Dortmund',        'BVB', '#FDE100', '#000000', 83, 'https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png'],
  ['RB Leipzig',               'RBL', '#DD0741', '#FFFFFF', 82, 'https://r2.thesportsdb.com/images/media/team/badge/zjgapo1594244951.png'],
  ['Bayer Leverkusen',         'B04', '#E32221', '#000000', 84, 'https://r2.thesportsdb.com/images/media/team/badge/3x9k851726760113.png'],
  ['Eintracht Frankfurt',      'SGE', '#E1000F', '#000000', 79, 'https://r2.thesportsdb.com/images/media/team/badge/rurwpy1473453269.png'],
  ['VfB Stuttgart',            'VFB', '#E32221', '#FFFFFF', 79, 'https://r2.thesportsdb.com/images/media/team/badge/yppyux1473454085.png'],
  ['VfL Wolfsburg',            'WOB', '#65A832', '#FFFFFF', 78, 'https://r2.thesportsdb.com/images/media/team/badge/ci9trv1778399557.png'],
  ['Borussia Mönchengladbach', 'BMG', '#000000', '#FFFFFF', 77, 'https://r2.thesportsdb.com/images/media/team/badge/sysurw1473453380.png'],
  ['SC Freiburg',              'SCF', '#CC0000', '#000000', 77, 'https://r2.thesportsdb.com/images/media/team/badge/urwtup1473453288.png'],
  ['TSG Hoffenheim',           'TSG', '#1C63B7', '#FFFFFF', 76, 'https://r2.thesportsdb.com/images/media/team/badge/9hwvb21621593919.png'],
  ['Werder Bremen',            'SVW', '#1D9058', '#FFFFFF', 75, 'https://r2.thesportsdb.com/images/media/team/badge/tkvqan1716960454.png'],
  ['FC Augsburg',              'FCA', '#BA3733', '#FFFFFF', 74, 'https://r2.thesportsdb.com/images/media/team/badge/xqyyvq1473453233.png'],
  ['Mainz 05',                 'M05', '#ED1C24', '#FFFFFF', 74, 'https://r2.thesportsdb.com/images/media/team/badge/fhm9v51552134916.png'],
  ['Union Berlin',             'FCU', '#D4011D', '#FFFFFF', 74, 'https://r2.thesportsdb.com/images/media/team/badge/q0o5001599679795.png'],
  ['VfL Bochum',               'BOC', '#005CA9', '#FFFFFF', 72, 'https://r2.thesportsdb.com/images/media/team/badge/kag3jy1599821108.png'],
  ['FC St. Pauli',             'STP', '#825840', '#FFFFFF', 71, 'https://r2.thesportsdb.com/images/media/team/badge/5qupxa1608237013.png'],
  ['Holstein Kiel',            'KSV', '#0055A5', '#FFFFFF', 70, 'https://r2.thesportsdb.com/images/media/team/badge/1fpmgs1514394524.png'],
  ['FC Heidenheim',            'FCH', '#D20021', '#FFFFFF', 70, 'https://r2.thesportsdb.com/images/media/team/badge/lbj7g01608236988.png'],
];

export const bundesliga: LeagueDefinition = {
  id: 'bundesliga',
  name: 'Bundesliga',
  country: 'Alemanha',
  cupName: 'DFB-Pokal',
  flag: '🇩🇪',
  color: '#e32221',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png',
  totalRounds: 34,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr, logo]) =>
    generateTeam(`bun-${abbr.toLowerCase()}`, name, abbr, color, secColor, logo, ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 1.05, defensiveLineMod: 0.95, tempoMod: 1.1, passingFocusMod: 0.95 },
  relegationSpots: 3,
};
