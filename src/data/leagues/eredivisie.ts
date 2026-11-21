import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

// Eredivisie 2025/26 — vitrine de talentos: os grandes da Europa compram barato aqui
// (desconto no preço de compra em transferMarket.leaguePriceFactor). Elencos reais vêm
// do sync (football-data, código DED); estes jogadores gerados são só o fallback offline.

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('ned-psv', 'PSV', 'PSV', '#e30613', '#ffffff', 78),
  tm('ned-aja', 'Ajax', 'AJA', '#d2122e', '#ffffff', 77),
  tm('ned-fey', 'Feyenoord', 'FEY', '#e30613', '#000000', 77),
  tm('ned-az', 'AZ Alkmaar', 'AZ', '#c8102e', '#ffffff', 75),
  tm('ned-twe', 'Twente', 'TWE', '#e30613', '#ffffff', 74),
  tm('ned-utr', 'Utrecht', 'UTR', '#e30613', '#ffffff', 73),
  tm('ned-nec', 'NEC Nijmegen', 'NEC', '#d50000', '#00843d', 71),
  tm('ned-gae', 'Go Ahead Eagles', 'GAE', '#e30613', '#fdd800', 71),
  tm('ned-hee', 'Heerenveen', 'HEE', '#0055a4', '#ffffff', 70),
  tm('ned-spa', 'Sparta Rotterdam', 'SPA', '#e30613', '#ffffff', 69),
  tm('ned-for', 'Fortuna Sittard', 'FOR', '#fdd800', '#00843d', 69),
  tm('ned-pec', 'PEC Zwolle', 'PEC', '#0055a4', '#ffffff', 69),
  tm('ned-gro', 'Groningen', 'GRO', '#00843d', '#ffffff', 69),
  tm('ned-nac', 'NAC Breda', 'NAC', '#fdd800', '#000000', 68),
  tm('ned-her', 'Heracles', 'HER', '#000000', '#ffffff', 68),
  tm('ned-exc', 'Excelsior', 'EXC', '#e30613', '#000000', 67),
  tm('ned-tel', 'Telstar', 'TEL', '#ffffff', '#0055a4', 66),
  tm('ned-vol', 'Volendam', 'VOL', '#f58220', '#ffffff', 66),
];

export const eredivisie: LeagueDefinition = {
  id: 'eredivisie',
  name: 'Eredivisie',
  country: 'Holanda',
  cupName: 'KNVB Beker',
  cupLogo: '',
  flag: '🇳🇱',
  color: '#f58220',
  // Logo da liga (Wikipedia/Wikimedia), servido local depois do crests:download.
  logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/VriendenLoterij_Eredivisie_Logo.png',
  totalRounds: 34,
  teams,
  europeanSlots: { championsLeague: 2, europaLeague: 1, conferenceLeague: 1 },
  // Futebol de posse e linha alta, escola holandesa.
  cpuProfile: { pressingMod: 1.0, defensiveLineMod: 1.1, tempoMod: 1.0, passingFocusMod: 1.15 },
  relegationSpots: 0,
};
