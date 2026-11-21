import type { LeagueDefinition } from './types';
import type { Team } from '@/engine/types';
import { makeSecondDivisionTeam } from './divisionHelpers';

// Saudi Pro League 2025/26 — mercado alternativo: os clubes daqui pagam acima do valor
// por jogadores veteranos que o usuário coloca à venda (ver useCareerMatchFlow, ofertas
// por jogadores da lista). Sem vaga em copas da UEFA. Elencos reais vêm do sync (Wikipedia).

function tm(id: string, name: string, abbr: string, color: string, secondary: string, ovr: number): Team {
  return makeSecondDivisionTeam(id, name, abbr, color, secondary, ovr);
}

const teams: Team[] = [
  tm('ksa-hil', 'Al-Hilal', 'HIL', '#0055a4', '#ffffff', 80),
  tm('ksa-nas', 'Al-Nassr', 'NAS', '#fdd800', '#0055a4', 79),
  tm('ksa-itt', 'Al-Ittihad', 'ITT', '#fdd800', '#000000', 78),
  tm('ksa-ahl', 'Al-Ahli', 'AHL', '#00843d', '#ffffff', 78),
  tm('ksa-qad', 'Al-Qadsiah', 'QAD', '#e30613', '#fdd800', 75),
  tm('ksa-sha', 'Al-Shabab', 'SHA', '#ffffff', '#000000', 72),
  tm('ksa-ett', 'Al-Ettifaq', 'ETT', '#00843d', '#e30613', 71),
  tm('ksa-taa', 'Al-Taawoun', 'TAA', '#fdd800', '#0055a4', 70),
  tm('ksa-fat', 'Al-Fateh', 'FAT', '#0055a4', '#ffffff', 69),
  tm('ksa-fay', 'Al-Fayha', 'FAY', '#f58220', '#0055a4', 68),
  tm('ksa-kha', 'Al-Khaleej', 'KHA', '#fdd800', '#00843d', 68),
  tm('ksa-riy', 'Al-Riyadh', 'RIY', '#000000', '#e30613', 67),
  tm('ksa-khl', 'Al-Kholood', 'KHL', '#e30613', '#ffffff', 67),
  tm('ksa-okh', 'Al-Okhdood', 'OKH', '#e30613', '#0055a4', 66),
  tm('ksa-dam', 'Damac', 'DAM', '#e30613', '#fdd800', 66),
  tm('ksa-haz', 'Al-Hazem', 'HAZ', '#fdd800', '#000000', 66),
  tm('ksa-naj', 'Al-Najma', 'NAJ', '#0055a4', '#fdd800', 65),
  tm('ksa-neo', 'NEOM', 'NEO', '#000000', '#ffffff', 65),
];

export const saudiProLeague: LeagueDefinition = {
  id: 'saudiProLeague',
  name: 'Saudi Pro League',
  country: 'Arábia Saudita',
  cupName: "King's Cup",
  cupLogo: '',
  flag: '🇸🇦',
  color: '#006c35',
  // Logo da liga (Wikipedia/Wikimedia), servido local depois do crests:download.
  logo: 'https://upload.wikimedia.org/wikipedia/en/7/75/Roshn_Saudi_League_Logo.svg',
  totalRounds: 34,
  teams,
  europeanSlots: { championsLeague: 0, europaLeague: 0, conferenceLeague: 0 },
  // Ritmo mais cadenciado, pouca pressão alta.
  cpuProfile: { pressingMod: 0.9, defensiveLineMod: 0.95, tempoMod: 0.9, passingFocusMod: 1.0 },
  relegationSpots: 0,
};
