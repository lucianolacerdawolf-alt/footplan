import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('l2-esp', 'Espanyol', 'ESP', '#2874b7', '#f1c40f', 75),
  tm('l2-leg', 'Leganés', 'LEG', '#106850', '#ffffff', 74),
  tm('l2-eib', 'Eibar', 'EIB', '#1d428a', '#ffffff', 74),
  tm('l2-val', 'Real Valladolid', 'VLL', '#64318e', '#ffffff', 74),
  tm('l2-ovi', 'Real Oviedo', 'OVI', '#003f87', '#008fd5', 73),
  tm('l2-spo', 'Sporting Gijón', 'SPG', '#ea1d2c', '#ffffff', 73),
  tm('l2-rac', 'Racing Santander', 'RAC', '#1a3a5c', '#00a859', 73),
  tm('l2-lev', 'Levante', 'LEV', '#92121b', '#003764', 73),
  tm('l2-bur', 'Burgos', 'BUR', '#000000', '#ffffff', 72),
  tm('l2-tfe', 'Tenerife', 'TEN', '#0066b3', '#ffffff', 72),
  tm('l2-fer', 'Racing Ferrol', 'FER', '#006d3a', '#ffffff', 72),
  tm('l2-eld', 'Eldense', 'ELD', '#00529b', '#ffffff', 71),
  tm('l2-zar', 'Real Zaragoza', 'ZAR', '#003c92', '#fde100', 72),
  tm('l2-mir', 'Mirandés', 'MIR', '#e20e0e', '#121010', 71),
  tm('l2-crt', 'Cartagena', 'CAR', '#000000', '#ffffff', 71),
  tm('l2-alb', 'Albacete', 'ALB', '#007a33', '#ffffff', 71),
  tm('l2-hue', 'Huesca', 'HUE', '#1c3f94', '#d81b2c', 71),
  tm('l2-amo', 'Amorebieta', 'AMO', '#003f87', '#008fd5', 70),
  tm('l2-alc', 'Alcorcón', 'ALC', '#fde100', '#000000', 70),
  tm('l2-and', 'FC Andorra', 'AND', '#e52d2d', '#ffcc00', 70),
  tm('l2-vil', 'Villarreal B', 'VIB', '#ffff00', '#00509e', 70),
  tm('l2-elc', 'Elche', 'ELC', '#006f48', '#ffffff', 71),
];

export const laliga2: LeagueDefinition = {
  id: 'laliga2',
  name: 'La Liga 2',
  country: 'Espanha',
  cupName: 'Copa del Rey',
  cupLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Copa_del_Rey_logo_%282021%29.svg/250px-Copa_del_Rey_logo_%282021%29.svg.png',
  flag: '🇪🇸',
  color: '#b99b3c',
  logo: 'https://crests.football-data.org/PD.png',
  totalRounds: 42,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  cpuProfile: { pressingMod: 0.82, defensiveLineMod: 0.85, tempoMod: 0.88, passingFocusMod: 0.82 },
  relegationSpots: 4,
};
