import type { Team } from '@/engine/types';

export interface CpuProfile {
  pressingMod: number;
  defensiveLineMod: number;
  tempoMod: number;
  passingFocusMod: number;
}

export interface LeagueDefinition {
  id: string;
  name: string;
  country: string;
  flag: string;
  color: string;
  logo: string;
  totalRounds: number;
  teams: Team[];
  cupName: string;
  cupLogo: string;
  europeanSlots: {
    championsLeague: number;
    europaLeague: number;
    conferenceLeague: number;
  };
  cpuProfile: CpuProfile;
  relegationSpots: number;
  /** Liga dividida em conferências (MLS): temporada regular com jogos dentro da
   *  conferência (turno e returno) + um turno contra a outra, e depois playoff com os
   *  `playoffSpots` melhores de cada conferência. Ausente = todos contra todos. */
  conferences?: { name: string; teamIds: string[] }[];
  playoffSpots?: number;
}
