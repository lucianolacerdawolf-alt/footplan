import type { LeagueDefinition } from './types';
import { premierLeagueTeams } from '../premierLeague';

export const premierLeague: LeagueDefinition = {
  id: 'pl',
  name: 'Premier League',
  country: 'Inglaterra',
  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  totalRounds: 38,
  teams: premierLeagueTeams,
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 1.0, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.0 },
  relegationSpots: 3,
};
