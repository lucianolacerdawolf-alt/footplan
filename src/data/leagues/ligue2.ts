import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('l2-aux', 'Auxerre', 'AUX', '#003c92', '#ffffff', 73),
  tm('l2-sai', 'Saint-Étienne', 'ASSE', '#00a651', '#ffffff', 74),
  tm('l2-bor', 'Bordeaux', 'BOR', '#000033', '#ffffff', 74),
  tm('l2-ang', 'Angers', 'ANG', '#fcea10', '#000000', 73),
  tm('l2-tro', 'Troyes', 'TRO', '#005596', '#ffffff', 72),
  tm('l2-cae', 'Caen', 'CAE', '#003c7e', '#bf001e', 72),
  tm('l2-gui', 'Guingamp', 'GUI', '#d50826', '#000000', 71),
  tm('l2-lav', 'Laval', 'LAV', '#f0851a', '#000000', 71),
  tm('l2-ami', 'Amiens', 'AMI', '#0066cc', '#ffffff', 71),
  tm('l2-pau', 'Pau', 'PAU', '#ffcc00', '#003c2d', 70),
  tm('l2-gren', 'Grenoble', 'GRE', '#003f8b', '#00529b', 70),
  tm('l2-bas', 'Bastia', 'BAS', '#003f87', '#ffffff', 70),
  tm('l2-rod', 'Rodez', 'ROD', '#cc0002', '#ffcc00', 70),
  tm('l2-par', 'Paris FC', 'PFC', '#002c5f', '#005db3', 71),
  tm('l2-ann', 'Annecy', 'ANN', '#e2001a', '#ffffff', 69),
  tm('l2-con', 'Concarneau', 'CON', '#009344', '#003a75', 69),
  tm('l2-dun', 'Dunkerque', 'DUN', '#0055a4', '#ffffff', 69),
  tm('l2-que', 'Quevilly-Rouen', 'QUE', '#d0122a', '#ffcc00', 69),
];

export const ligue2: LeagueDefinition = {
  id: 'ligue2',
  name: 'Ligue 2',
  country: 'França',
  cupName: 'Coupe de France',
  cupLogo: 'https://crests.football-data.org/cdf.png',
  flag: '🇫🇷',
  color: '#1d428a',
  logo: 'https://crests.football-data.org/FL2.png',
  totalRounds: 38,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  cpuProfile: { pressingMod: 0.80, defensiveLineMod: 0.82, tempoMod: 0.85, passingFocusMod: 0.80 },
  relegationSpots: 2,
};
