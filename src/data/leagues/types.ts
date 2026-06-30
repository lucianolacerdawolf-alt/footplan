import type { Team } from '../../engine/types';

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
  europeanSlots: {
    championsLeague: number;
    europaLeague: number;
    conferenceLeague: number;
  };
  cpuProfile: CpuProfile;
  relegationSpots: number;
}
