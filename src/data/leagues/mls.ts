import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

// MLS 2026 — 30 clubes em duas conferências, temporada regular + playoff (ver
// engine/conferenceSeason.ts). Sem rebaixamento e sem vaga na UEFA. Também compra
// veteranos acima do valor (com menos força que a Arábia). Elencos reais via sync.

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const east: Team[] = [
  tm('mls-mia', 'Inter Miami', 'MIA', '#f7b5cd', '#000000', 75),
  tm('mls-cin', 'FC Cincinnati', 'CIN', '#f05323', '#263b80', 73),
  tm('mls-clb', 'Columbus Crew', 'CLB', '#fedd00', '#000000', 73),
  tm('mls-phi', 'Philadelphia Union', 'PHI', '#071b2c', '#b19b69', 72),
  tm('mls-orl', 'Orlando City', 'ORL', '#633492', '#ffffff', 71),
  tm('mls-nyc', 'New York City FC', 'NYC', '#6cace4', '#041e42', 71),
  tm('mls-clt', 'Charlotte FC', 'CLT', '#1a85c8', '#000000', 70),
  tm('mls-nsh', 'Nashville SC', 'NSH', '#ece83a', '#1f1646', 70),
  tm('mls-rbn', 'New York Red Bulls', 'RBN', '#ed1e36', '#ffffff', 69),
  tm('mls-chi', 'Chicago Fire', 'CHI', '#ff0000', '#141946', 69),
  tm('mls-atl', 'Atlanta United', 'ATL', '#80000a', '#000000', 69),
  tm('mls-ne', 'New England Revolution', 'NE', '#0a2240', '#ce0e2d', 68),
  tm('mls-mtl', 'CF Montréal', 'MTL', '#000000', '#0033a1', 67),
  tm('mls-tor', 'Toronto FC', 'TOR', '#b81137', '#455560', 67),
  tm('mls-dc', 'D.C. United', 'DC', '#000000', '#ef3e42', 66),
];

const west: Team[] = [
  tm('mls-lafc', 'LAFC', 'LAFC', '#000000', '#c39e6d', 74),
  tm('mls-sd', 'San Diego FC', 'SD', '#000000', '#00b0f0', 72),
  tm('mls-sea', 'Seattle Sounders', 'SEA', '#5d9741', '#005595', 72),
  tm('mls-van', 'Vancouver Whitecaps', 'VAN', '#00245e', '#9dc2ea', 72),
  tm('mls-lag', 'LA Galaxy', 'LA', '#00245d', '#ffd200', 71),
  tm('mls-min', 'Minnesota United', 'MIN', '#8cd2f4', '#231f20', 70),
  tm('mls-por', 'Portland Timbers', 'POR', '#004812', '#d69a00', 70),
  tm('mls-aus', 'Austin FC', 'ATX', '#00b140', '#000000', 69),
  tm('mls-hou', 'Houston Dynamo', 'HOU', '#ff6b00', '#101820', 69),
  tm('mls-rsl', 'Real Salt Lake', 'RSL', '#b30838', '#013a81', 69),
  tm('mls-col', 'Colorado Rapids', 'COL', '#960a2c', '#9cc2ea', 68),
  tm('mls-skc', 'Sporting Kansas City', 'SKC', '#93b1d7', '#002f65', 68),
  tm('mls-dal', 'FC Dallas', 'DAL', '#e81f3e', '#2a4076', 68),
  tm('mls-stl', 'St. Louis City', 'STL', '#ec1458', '#001544', 67),
  tm('mls-sj', 'San Jose Earthquakes', 'SJ', '#0d4c92', '#000000', 67),
];

export const mls: LeagueDefinition = {
  id: 'mls',
  name: 'MLS',
  country: 'Estados Unidos',
  cupName: 'U.S. Open Cup',
  cupLogo: '',
  flag: '🇺🇸',
  color: '#1d2d5c',
  logo: '',
  // 14 adversários da conferência × 2 + 15 da outra × 1 = 43… recortado em
  // conferenceSeason pra 34 rodadas (turno e returno na conferência + metade da outra).
  totalRounds: 34,
  teams: [...east, ...west],
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  // Jogo aberto e corrido.
  cpuProfile: { pressingMod: 0.95, defensiveLineMod: 0.95, tempoMod: 1.1, passingFocusMod: 0.95 },
  relegationSpots: 0,
  conferences: [
    { name: 'Leste', teamIds: east.map(t => t.id) },
    { name: 'Oeste', teamIds: west.map(t => t.id) },
  ],
  playoffSpots: 8,
};
