import type { LeagueDefinition } from './types';
import { generateTeam } from './generateTeam';

const TEAMS: Array<[string, string, string, string, number, string]> = [
  ['Real Madrid',       'RMA', '#FEBE10', '#00529F', 88, 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png'],
  ['Barcelona',         'FCB', '#A50044', '#004D98', 86, 'https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png'],
  ['Atlético Madrid',   'ATM', '#CB3524', '#27336C', 84, 'https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png'],
  ['Real Sociedad',     'RSO', '#0B67C6', '#FFFFFF', 80, 'https://r2.thesportsdb.com/images/media/team/badge/vptvpr1473502986.png'],
  ['Athletic Bilbao',   'ATH', '#EE2523', '#FFFFFF', 79, 'https://r2.thesportsdb.com/images/media/team/badge/68w7fe1639408210.png'],
  ['Villarreal',        'VIL', '#FFE500', '#005187', 78, 'https://r2.thesportsdb.com/images/media/team/badge/vrypqy1473503073.png'],
  ['Real Betis',        'BET', '#0A8C3E', '#FFFFFF', 78, 'https://r2.thesportsdb.com/images/media/team/badge/2oqulv1663245386.png'],
  ['Sevilla',           'SEV', '#D50418', '#FFFFFF', 77, 'https://r2.thesportsdb.com/images/media/team/badge/vpsqqx1473502977.png'],
  ['Valencia',          'VAL', '#F8E250', '#EE3B33', 76, 'https://r2.thesportsdb.com/images/media/team/badge/dm8l6o1655594864.png'],
  ['Girona',            'GIR', '#DA251D', '#FFFFFF', 76, 'https://r2.thesportsdb.com/images/media/team/badge/kfu7zu1659897499.png'],
  ['Celta Vigo',        'CEL', '#87CEEB', '#FFFFFF', 75, 'https://r2.thesportsdb.com/images/media/team/badge/xfjtku1690436219.png'],
  ['Osasuna',           'OSA', '#AC142C', '#0A3463', 74, 'https://r2.thesportsdb.com/images/media/team/badge/rvspvt1473502960.png'],
  ['Getafe',            'GET', '#004B9A', '#FFFFFF', 73, 'https://r2.thesportsdb.com/images/media/team/badge/eyh2891655594452.png'],
  ['Mallorca',          'MAL', '#DD0000', '#FFDE00', 73, 'https://r2.thesportsdb.com/images/media/team/badge/ssptsx1473503730.png'],
  ['Rayo Vallecano',    'RAY', '#D0122C', '#FFFFFF', 72, 'https://r2.thesportsdb.com/images/media/team/badge/nzhu941655595465.png'],
  ['Alavés',            'ALA', '#004B9A', '#FFFFFF', 71, 'https://r2.thesportsdb.com/images/media/team/badge/mfn99h1734673842.png'],
  ['Las Palmas',        'LPA', '#FFDE00', '#004A9B', 70, 'https://r2.thesportsdb.com/images/media/team/badge/mmhyb11616443601.png'],
  ['Espanyol',          'ESP', '#2167B0', '#FFFFFF', 70, 'https://r2.thesportsdb.com/images/media/team/badge/867nzz1681703222.png'],
  ['Valladolid',        'VLL', '#7B2D8E', '#FFFFFF', 69, 'https://r2.thesportsdb.com/images/media/team/badge/bnhu8b1719983736.png'],
  ['Leganés',           'LEG', '#007940', '#FFFFFF', 68, 'https://r2.thesportsdb.com/images/media/team/badge/tm0adr1616443898.png'],
];

export const laLiga: LeagueDefinition = {
  id: 'laliga',
  name: 'La Liga',
  country: 'Espanha',
  cupName: 'Copa del Rey',
  flag: '🇪🇸',
  color: '#ff4d4d',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png',
  totalRounds: 38,
  teams: TEAMS.map(([name, abbr, color, secColor, ovr, logo]) =>
    generateTeam(`lal-${abbr.toLowerCase()}`, name, abbr, color, secColor, logo, ovr)
  ),
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.95, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.05 },
  relegationSpots: 3,
};
