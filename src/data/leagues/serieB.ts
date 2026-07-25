import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('sb-par', 'Parma', 'PAR', '#fcdc00', '#002244', 74),
  tm('sb-com', 'Como', 'COM', '#003366', '#ffffff', 74),
  tm('sb-ven', 'Venezia', 'VEN', '#f6861f', '#00553b', 73),
  tm('sb-cre', 'Cremonese', 'CRE', '#808080', '#d2032a', 73),
  tm('sb-pal', 'Palermo', 'PAL', '#e5539c', '#211e1e', 73),
  tm('sb-sam', 'Sampdoria', 'SAM', '#0055a5', '#ffffff', 74),
  tm('sb-bre', 'Brescia', 'BRE', '#003893', '#ffffff', 72),
  tm('sb-cat', 'Catanzaro', 'CAT', '#e41725', '#ffcc00', 72),
  tm('sb-bar', 'Bari', 'BAR', '#e30613', '#ffffff', 72),
  tm('sb-pis', 'Pisa', 'PIS', '#003a70', '#ce1126', 72),
  tm('sb-cit', 'Cittadella', 'CIT', '#570d2a', '#ffffff', 71),
  tm('sb-sud', 'Südtirol', 'SUD', '#cc0000', '#ffffff', 71),
  tm('sb-mod', 'Modena', 'MOD', '#ffd700', '#0033a0', 71),
  tm('sb-reg', 'Reggiana', 'REA', '#660033', '#ffffff', 70),
  tm('sb-cos', 'Cosenza', 'COS', '#003b7b', '#d40017', 70),
  tm('sb-spe', 'Spezia', 'SPE', '#000000', '#ffffff', 72),
  tm('sb-ter', 'Ternana', 'TER', '#005c29', '#d60010', 70),
  tm('sb-asc', 'Ascoli', 'ASC', '#000000', '#ffffff', 70),
  tm('sb-fer', 'Feralpisalò', 'FER', '#007a33', '#ffffff', 69),
  tm('sb-lec', 'Lecco', 'LEC', '#1c3c8c', '#4392e5', 69),
];

export const serieB: LeagueDefinition = {
  id: 'serieB',
  name: 'Serie B',
  country: 'Itália',
  cupName: 'Coppa Italia',
  cupLogo: 'https://crests.football-data.org/cit.png',
  flag: '🇮🇹',
  color: '#2f5c8e',
  logo: 'https://crests.football-data.org/SB.png',
  totalRounds: 38,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  cpuProfile: { pressingMod: 0.80, defensiveLineMod: 0.85, tempoMod: 0.85, passingFocusMod: 0.80 },
  relegationSpots: 3,
};
