import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('cha-lee', 'Leeds United', 'LEE', '#1c355e', '#ffcc00', 76),
  tm('cha-lei', 'Leicester City', 'LEI', '#003090', '#fdbd10', 77),
  tm('cha-sou', 'Southampton', 'SOU', '#d71920', '#ffffff', 77),
  tm('cha-ips', 'Ipswich Town', 'IPS', '#0033a0', '#ffffff', 75),
  tm('cha-wba', 'West Bromwich Albion', 'WBA', '#091453', '#ffffff', 75),
  tm('cha-nor', 'Norwich City', 'NOR', '#00a650', '#fff200', 75),
  tm('cha-cov', 'Coventry City', 'COV', '#69c4fe', '#031e45', 74),
  tm('cha-mid', 'Middlesbrough', 'MID', '#df1929', '#ffffff', 74),
  tm('cha-sun', 'Sunderland', 'SUN', '#da2127', '#ffffff', 74),
  tm('cha-wat', 'Watford', 'WAT', '#fbee23', '#000000', 74),
  tm('cha-hul', 'Hull City', 'HUL', '#f5a12c', '#211e1f', 74),
  tm('cha-brc', 'Bristol City', 'BRC', '#e61438', '#ffffff', 73),
  tm('cha-car', 'Cardiff City', 'CAR', '#0070b5', '#e60000', 73),
  tm('cha-mil', 'Millwall', 'MIL', '#003c95', '#ffffff', 73),
  tm('cha-pne', 'Preston North End', 'PNE', '#0042a8', '#ffffff', 73),
  tm('cha-bla', 'Blackburn Rovers', 'BLA', '#0066b3', '#ffffff', 73),
  tm('cha-swa', 'Swansea City', 'SWA', '#000000', '#ffffff', 73),
  tm('cha-sto', 'Stoke City', 'STO', '#e03a3e', '#ffffff', 73),
  tm('cha-bir', 'Birmingham City', 'BIR', '#1a1c5e', '#ffffff', 72),
  tm('cha-hud', 'Huddersfield Town', 'HUD', '#008ed1', '#ffffff', 72),
  tm('cha-ply', 'Plymouth Argyle', 'PLY', '#006c4c', '#ffffff', 72),
  tm('cha-rot', 'Rotherham United', 'ROT', '#d20527', '#ffffff', 72),
  tm('cha-qpr', 'Queens Park Rangers', 'QPR', '#0053a0', '#ffffff', 72),
  tm('cha-she', 'Sheffield Wednesday', 'SHW', '#0053a0', '#ffffff', 72),
];

export const championship: LeagueDefinition = {
  id: 'championship',
  name: 'Championship',
  country: 'Inglaterra',
  cupName: 'FA Cup',
  cupLogo: 'https://crests.football-data.org/fa_cup.png',
  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  color: '#1c355e',
  logo: 'https://crests.football-data.org/ELC.png',
  totalRounds: 46,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  cpuProfile: { pressingMod: 0.85, defensiveLineMod: 0.85, tempoMod: 0.90, passingFocusMod: 0.85 },
  relegationSpots: 3,
};
