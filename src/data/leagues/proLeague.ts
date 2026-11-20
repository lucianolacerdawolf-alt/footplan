import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

// Pro League belga 2025/26 — outra vitrine de jovens baratos (desconto no preço de
// compra, ver transferMarket.leaguePriceFactor). Elencos reais vêm do sync (Wikipedia).

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('bel-bru', 'Club Brugge', 'BRU', '#0057b8', '#000000', 76),
  tm('bel-usg', 'Union Saint-Gilloise', 'USG', '#fdd800', '#0055a4', 75),
  tm('bel-and', 'Anderlecht', 'AND', '#5c2d91', '#ffffff', 74),
  tm('bel-gen', 'Genk', 'GNK', '#0055a4', '#ffffff', 73),
  tm('bel-gnt', 'Gent', 'GNT', '#0055a4', '#ffffff', 72),
  tm('bel-ant', 'Antwerp', 'ANT', '#e30613', '#ffffff', 72),
  tm('bel-sta', 'Standard Liège', 'STA', '#e30613', '#ffffff', 70),
  tm('bel-mec', 'Mechelen', 'MEC', '#fdd800', '#e30613', 69),
  tm('bel-wes', 'Westerlo', 'WES', '#fdd800', '#0055a4', 69),
  tm('bel-cha', 'Charleroi', 'CHA', '#000000', '#ffffff', 69),
  tm('bel-ohl', 'OH Leuven', 'OHL', '#e30613', '#ffffff', 68),
  tm('bel-cer', 'Cercle Brugge', 'CER', '#00843d', '#000000', 68),
  tm('bel-stv', 'Sint-Truiden', 'STV', '#fdd800', '#0055a4', 67),
  tm('bel-den', 'Dender', 'DEN', '#e30613', '#ffffff', 66),
  tm('bel-zwa', 'Zulte Waregem', 'ZWA', '#e30613', '#ffffff', 66),
  tm('bel-lal', 'La Louvière', 'RAL', '#00843d', '#ffffff', 65),
];

export const proLeague: LeagueDefinition = {
  id: 'proLeague',
  name: 'Pro League',
  country: 'Bélgica',
  cupName: 'Copa da Bélgica',
  cupLogo: '',
  flag: '🇧🇪',
  color: '#c8102e',
  logo: '',
  totalRounds: 30,
  teams,
  europeanSlots: { championsLeague: 1, europaLeague: 1, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 1.0, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.0 },
  relegationSpots: 0,
};
