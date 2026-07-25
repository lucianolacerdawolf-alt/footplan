import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('p2-scm', 'Santa Clara', 'STC', '#d71920', '#ffffff', 70),
  tm('p2-nac', 'Nacional', 'NAC', '#000000', '#ffffff', 70),
  tm('p2-avi', 'AVS', 'AVS', '#0043a1', '#ffffff', 69),
  tm('p2-mar', 'Marítimo', 'MAR', '#008d3f', '#bd1e2c', 70),
  tm('p2-pac', 'Paços de Ferreira', 'PAC', '#fde100', '#00522e', 69),
  tm('p2-tor', 'Torreense', 'TOR', '#0f3b6b', '#005b9f', 68),
  tm('p2-ton', 'Tondela', 'TON', '#f8d146', '#007a33', 68),
  tm('p2-maf', 'Mafra', 'MAF', '#00a650', '#ffffff', 67),
  tm('p2-fei', 'Feirense', 'FEI', '#0073cf', '#ffffff', 67),
  tm('p2-lei', 'Leixões', 'LEI', '#c8102e', '#ffffff', 67),
  tm('p2-aca', 'Académico Viseu', 'VIS', '#000000', '#ffffff', 67),
  tm('p2-pen', 'Penafiel', 'PEN', '#ba0c2f', '#000000', 66),
  tm('p2-oli', 'Oliveirense', 'OLI', '#bd1a33', '#003d25', 66),
  tm('p2-ben', 'Benfica B', 'SLB2', '#e20613', '#ffffff', 68),
  tm('p2-por', 'Porto B', 'FCP2', '#00428c', '#ffffff', 68),
  tm('p2-bev', 'Belenenses', 'BEL', '#0066b3', '#ffffff', 66),
  tm('p2-vil', 'Vilaverdense', 'VVD', '#003d25', '#ffcc00', 65),
  tm('p2-leb', 'União Leiria', 'LEI2', '#000000', '#ffffff', 66),
];

export const ligaPortugal2: LeagueDefinition = {
  id: 'ligaPortugal2',
  name: 'Liga Portugal 2',
  country: 'Portugal',
  cupName: 'Taça de Portugal',
  cupLogo: 'https://crests.football-data.org/tdp.png',
  flag: '🇵🇹',
  color: '#e31e25',
  logo: 'https://crests.football-data.org/PPL.png',
  totalRounds: 34,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  cpuProfile: { pressingMod: 0.75, defensiveLineMod: 0.80, tempoMod: 0.82, passingFocusMod: 0.75 },
  relegationSpots: 2,
};
