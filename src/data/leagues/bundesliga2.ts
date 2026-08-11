import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('b2-sch', 'Schalke 04', 'S04', '#004d9c', '#ffffff', 75),
  tm('b2-her', 'Hertha Berlin', 'BSC', '#004e9e', '#ffffff', 75),
  tm('b2-ham', 'Hamburger SV', 'HSV', '#0060af', '#ffffff', 75),
  tm('b2-for', 'Fortuna Düsseldorf', 'FOR', '#dc1f26', '#ffffff', 74),
  tm('b2-han', 'Hannover 96', 'HAN', '#008f39', '#ffffff', 74),
  tm('b2-pad', 'SC Paderborn', 'PAD', '#0066b3', '#000000', 73),
  tm('b2-kar', 'Karlsruher SC', 'KSC', '#003c92', '#ffffff', 73),
  tm('b2-kie', 'Holstein Kiel', 'KIE', '#0059b3', '#ffffff', 73),
  tm('b2-gru', 'Greuther Fürth', 'GRF', '#007938', '#ffffff', 72),
  tm('b2-nur', '1. FC Nürnberg', 'FCN', '#b80f1c', '#ffffff', 72),
  tm('b2-elt', 'SV Elversberg', 'ELV', '#211f20', '#ffffff', 72),
  tm('b2-mag', '1. FC Magdeburg', 'FCM', '#005daa', '#ffffff', 72),
  tm('b2-kai', 'Kaiserslautern', 'FCK', '#d20527', '#ffffff', 72),
  tm('b2-ros', 'Hansa Rostock', 'ROS', '#005ca7', '#ffffff', 71),
  tm('b2-wei', 'SV Wehen Wiesbaden', 'WEH', '#e2001a', '#000000', 71),
  tm('b2-bra', 'Eintracht Braunschweig', 'EBS', '#f8d202', '#004e8a', 71),
  tm('b2-osn', 'VfL Osnabrück', 'OSN', '#68338c', '#ffffff', 71),
  tm('b2-reg', 'Jahn Regensburg', 'REG', '#e30613', '#ffffff', 70),
];

export const bundesliga2: LeagueDefinition = {
  id: 'bundesliga2',
  name: '2. Bundesliga',
  country: 'Alemanha',
  cupName: 'DFB-Pokal',
  cupLogo: 'https://crests.football-data.org/DFB_CUP.png',
  flag: '🇩🇪',
  color: '#ce1724',
  logo: 'https://crests.football-data.org/BL2.png',
  totalRounds: 34,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  cpuProfile: { pressingMod: 0.85, defensiveLineMod: 0.88, tempoMod: 0.90, passingFocusMod: 0.85 },
  relegationSpots: 2,
};
